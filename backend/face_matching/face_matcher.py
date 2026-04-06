"""
face_matcher.py
===============
Missing Persons Identification System — Core Face Matching Module

Pipeline:
  1. Load & validate reference image (missing person)
  2. Detect + align face using OpenCV / DeepFace
  3. For every sighting image in the target folder:
       a. Try DeepFace (primary)         → cosine similarity
       b. Fallback to InsightFace         → cosine similarity
       c. Fallback to OpenCV histogram    → structural similarity
  4. Normalize raw distances → 0-100 confidence scores
  5. Apply configurable threshold; filter + rank results
  6. Return top-5 matches as JSON-serialisable dicts

Author : (your name)
Created: 2026
"""

import os
import json
import logging
import traceback
from pathlib import Path
from typing import Optional, Union

import cv2
import numpy as np

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("FaceMatcher")

# ── Optional heavy imports (graceful if missing) ──────────────────────────────
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    log.info("DeepFace loaded ✓")
except ImportError:
    DEEPFACE_AVAILABLE = False
    log.warning("DeepFace not installed — will skip primary engine.")

try:
    import insightface
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
    log.info("InsightFace loaded ✓")
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    log.warning("InsightFace not installed — will skip fallback engine.")

# ── Supported image extensions ────────────────────────────────────────────────
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}


# ─────────────────────────────────────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_image(path: str) -> Optional[np.ndarray]:
    """
    Load an image from disk with fallback for non-ASCII paths.
    Returns BGR numpy array, or None on failure.
    """
    img = cv2.imread(path)
    if img is None:
        # cv2.imread silently returns None for unicode paths on some OS
        raw = np.frombuffer(open(path, "rb").read(), dtype=np.uint8)
        img = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    return img


def _preprocess(img: np.ndarray) -> np.ndarray:
    """
    Light preprocessing pipeline for robustness against low-quality images:
      • Upscale tiny faces to at least 112×112 (InsightFace minimum)
      • CLAHE equalisation on the L-channel (improves dark / washed-out shots)
      • Mild Gaussian denoise
    Returns BGR image.
    """
    h, w = img.shape[:2]

    # --- upscale if the whole image is very small ---
    if max(h, w) < 160:
        scale = 160 / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale,
                         interpolation=cv2.INTER_CUBIC)

    # --- CLAHE on luminance channel ---
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    img = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

    # --- mild Gaussian denoise ---
    img = cv2.GaussianBlur(img, (3, 3), 0)

    return img


def _detect_face_opencv(img: np.ndarray) -> Optional[tuple]:
    """
    Lightweight face detection with Haar Cascades (always available).
    Returns (x, y, w, h) of the largest detected face, or None.
    Used when deep-learning detectors fail.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(cascade_path)
    faces = detector.detectMultiScale(gray, scaleFactor=1.1,
                                      minNeighbors=4, minSize=(30, 30))
    if len(faces) == 0:
        return None
    # pick largest face
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    return tuple(int(v) for v in faces[0])   # (x, y, w, h)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity in [0, 1] between two flat embedding vectors."""
    a, b = a.flatten().astype(float), b.flatten().astype(float)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _histogram_similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Last-resort structural similarity via HSV histogram correlation.
    Returns a score in [0, 1].
    Only used when both deep-learning engines fail entirely.
    """
    def _hist(img):
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h = cv2.calcHist([hsv], [0, 1], None, [50, 60],
                         [0, 180, 0, 256])
        cv2.normalize(h, h)
        return h

    score = cv2.compareHist(_hist(img1), _hist(img2),
                            cv2.HISTCMP_CORREL)
    return max(0.0, float(score))   # clamp negatives


# ─────────────────────────────────────────────────────────────────────────────
# InsightFace singleton (lazy-initialised once)
# ─────────────────────────────────────────────────────────────────────────────

_insight_app: Optional["FaceAnalysis"] = None


def _get_insight_app() -> Optional["FaceAnalysis"]:
    """Return a cached InsightFace FaceAnalysis app, or None if unavailable."""
    global _insight_app
    if not INSIGHTFACE_AVAILABLE:
        return None
    if _insight_app is None:
        try:
            app = FaceAnalysis(name="buffalo_l",
                               providers=["CPUExecutionProvider"])
            app.prepare(ctx_id=0, det_size=(640, 640))
            _insight_app = app
            log.info("InsightFace FaceAnalysis ready ✓")
        except Exception as exc:
            log.error(f"InsightFace init failed: {exc}")
            return None
    return _insight_app


# ─────────────────────────────────────────────────────────────────────────────
# Per-engine embedding extractors
# ─────────────────────────────────────────────────────────────────────────────

def _embed_deepface(img_path: str) -> Optional[np.ndarray]:
    """
    Extract a 512-d ArcFace embedding using DeepFace.
    DeepFace handles alignment internally.
    Returns numpy array or None on any failure.
    """
    if not DEEPFACE_AVAILABLE:
        return None
    try:
        result = DeepFace.represent(
            img_path=img_path,
            model_name="ArcFace",       # best accuracy / speed trade-off
            detector_backend="retinaface",
            enforce_detection=False,    # don't crash on partial / occluded faces
            align=True,
        )
        if result:
            return np.array(result[0]["embedding"], dtype=np.float32)
    except Exception as exc:
        log.debug(f"DeepFace embed failed for {img_path}: {exc}")
    return None


def _embed_insightface(img: np.ndarray) -> Optional[tuple]:
    """
    Extract a 512-d embedding using InsightFace ArcFace.
    Returns (embedding, face_bbox) or None.
    face_bbox is (x1, y1, x2, y2).
    """
    app = _get_insight_app()
    if app is None:
        return None
    try:
        faces = app.get(img)
        if not faces:
            return None
        # pick face with highest detection score
        best = max(faces, key=lambda f: f.det_score)
        bbox = tuple(int(v) for v in best.bbox)   # x1,y1,x2,y2
        return np.array(best.embedding, dtype=np.float32), bbox
    except Exception as exc:
        log.debug(f"InsightFace embed failed: {exc}")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Main matcher class
# ─────────────────────────────────────────────────────────────────────────────

class FaceMatcher:
    """
    End-to-end face matching pipeline for missing persons identification.

    Parameters
    ----------
    threshold : float
        Minimum confidence (0–1) to include a sighting in results.
        Default 0.6 (60 %).
    top_k : int
        Maximum number of ranked results to return. Default 5.
    """

    def __init__(self, threshold: float = 0.6, top_k: int = 5):
        if not 0 <= threshold <= 1:
            raise ValueError("threshold must be in [0, 1]")
        self.threshold = threshold
        self.top_k = top_k
        log.info(f"FaceMatcher ready | threshold={threshold} | top_k={top_k}")

    # ── Reference embedding ───────────────────────────────────────────────────

    def _build_reference(self, ref_path: str) -> dict:
        """
        Build all available embeddings for the reference (missing person) image.
        We pre-compute once so we don't repeat expensive work per sighting.

        Returns dict with keys: 'deepface', 'insightface', 'raw_img'
        """
        log.info(f"Loading reference: {ref_path}")
        if not os.path.isfile(ref_path):
            raise FileNotFoundError(f"Reference image not found: {ref_path}")

        raw = _load_image(ref_path)
        if raw is None:
            raise ValueError(f"Cannot decode reference image: {ref_path}")

        raw = _preprocess(raw)

        ref = {
            "deepface": None,
            "insightface": None,
            "raw_img": raw,
        }

        # DeepFace embedding
        ref["deepface"] = _embed_deepface(ref_path)
        if ref["deepface"] is not None:
            log.info("Reference: DeepFace embedding extracted ✓")
        else:
            log.warning("Reference: DeepFace embedding failed.")

        # InsightFace embedding
        insight_result = _embed_insightface(raw)
        if insight_result is not None:
            ref["insightface"] = insight_result[0]
            log.info("Reference: InsightFace embedding extracted ✓")
        else:
            log.warning("Reference: InsightFace embedding failed.")

        if ref["deepface"] is None and ref["insightface"] is None:
            log.warning("Reference: No deep-learning embedding; "
                        "falling back to histogram-only matching.")

        return ref

    # ── Single sighting comparison ────────────────────────────────────────────

    def _compare_one(self, sighting_path: str, ref: dict) -> Optional[dict]:
        """
        Compare one sighting image against the reference.

        Confidence scoring strategy:
          1. DeepFace cosine similarity  (primary)
          2. InsightFace cosine similarity (fallback)
          3. Histogram correlation        (last resort)
        Scores are averaged when multiple engines succeed, which improves
        robustness on challenging images.

        Returns a result dict or None if the sighting image is unreadable.
        """
        img = _load_image(sighting_path)
        if img is None:
            log.warning(f"Cannot read sighting: {sighting_path}")
            return None

        img = _preprocess(img)

        scores = []      # individual engine scores (0–1)
        face_loc = None  # (x, y, w, h) in sighting image, if detected
        engines_used = []

        # ── Engine 1: DeepFace ────────────────────────────────────────────────
        if ref["deepface"] is not None and DEEPFACE_AVAILABLE:
            s_emb = _embed_deepface(sighting_path)
            if s_emb is not None:
                score = _cosine_similarity(ref["deepface"], s_emb)
                scores.append(score)
                engines_used.append("deepface")

                # Try to get face location from DeepFace facial area
                try:
                    det = DeepFace.extract_faces(
                        img_path=sighting_path,
                        detector_backend="retinaface",
                        enforce_detection=False,
                    )
                    if det:
                        fa = det[0].get("facial_area", {})
                        face_loc = (
                            fa.get("x", 0), fa.get("y", 0),
                            fa.get("w", 0), fa.get("h", 0),
                        )
                except Exception:
                    pass

        # ── Engine 2: InsightFace ─────────────────────────────────────────────
        if ref["insightface"] is not None and INSIGHTFACE_AVAILABLE:
            insight_result = _embed_insightface(img)
            if insight_result is not None:
                s_emb, bbox = insight_result
                score = _cosine_similarity(ref["insightface"], s_emb)
                scores.append(score)
                engines_used.append("insightface")

                # bbox is (x1,y1,x2,y2) → convert to (x,y,w,h)
                if face_loc is None:
                    x1, y1, x2, y2 = bbox
                    face_loc = (x1, y1, x2 - x1, y2 - y1)

        # ── Engine 3: Histogram fallback ──────────────────────────────────────
        if not scores:
            log.debug(f"Falling back to histogram for {sighting_path}")
            score = _histogram_similarity(ref["raw_img"], img)
            scores.append(score * 0.7)   # dampen histogram confidence
            engines_used.append("histogram")

            # Try OpenCV Haar for face location
            detected = _detect_face_opencv(img)
            if detected:
                face_loc = detected

        # ── Aggregate & scale ─────────────────────────────────────────────────
        # Average scores from all successful engines, then scale to 0-100
        confidence_raw = float(np.mean(scores))
        confidence_pct = round(confidence_raw * 100, 2)

        # Default face_loc if nothing detected
        if face_loc is None:
            h, w = img.shape[:2]
            face_loc = (0, 0, w, h)   # whole image as bounding box

        return {
            "filename": os.path.basename(sighting_path),
            "filepath": sighting_path,
            "confidence": confidence_pct,          # 0–100 %
            "confidence_raw": round(confidence_raw, 4),
            "face_location": {                     # pixel coords in sighting
                "x": face_loc[0],
                "y": face_loc[1],
                "width": face_loc[2],
                "height": face_loc[3],
            },
            "engines_used": engines_used,
        }

    # ── Public API ────────────────────────────────────────────────────────────

    def match(
        self,
        reference_image: str,
        sightings_folder: str,
        output_json: Optional[str] = None,
    ) -> list[dict]:
        """
        Main entry point.

        Parameters
        ----------
        reference_image : str
            Path to the missing person's reference photo.
        sightings_folder : str
            Directory containing sighting images to search.
        output_json : str, optional
            If given, write ranked results to this JSON file.

        Returns
        -------
        list[dict]
            Up to `top_k` matches with confidence ≥ threshold, ranked
            highest-first. Each dict has keys:
              filename, filepath, confidence, face_location, engines_used
        """
        # --- Validate sightings folder ---
        if not os.path.isdir(sightings_folder):
            raise NotADirectoryError(
                f"Sightings folder not found: {sightings_folder}")

        sighting_paths = [
            str(p) for p in Path(sightings_folder).iterdir()
            if p.suffix.lower() in IMAGE_EXTS
        ]
        if not sighting_paths:
            log.warning("No images found in sightings folder.")
            return []

        log.info(f"Found {len(sighting_paths)} sighting image(s) to scan.")

        # --- Build reference embeddings once ---
        ref = self._build_reference(reference_image)

        # --- Compare every sighting ---
        results = []
        for idx, path in enumerate(sighting_paths, 1):
            log.info(f"[{idx}/{len(sighting_paths)}] Comparing: "
                     f"{os.path.basename(path)}")
            try:
                result = self._compare_one(path, ref)
                if result is None:
                    continue
                if result["confidence_raw"] >= self.threshold:
                    results.append(result)
                else:
                    log.debug(
                        f"  → below threshold "
                        f"({result['confidence']:.1f}% < "
                        f"{self.threshold*100:.0f}%)"
                    )
            except Exception:
                log.error(f"Unexpected error on {path}:\n"
                          f"{traceback.format_exc()}")

        # --- Rank and trim ---
        results.sort(key=lambda r: r["confidence"], reverse=True)
        top_results = results[: self.top_k]

        log.info(
            f"Scan complete. "
            f"{len(results)} match(es) above threshold; "
            f"returning top {len(top_results)}."
        )

        # --- Optionally persist to JSON ---
        if output_json:
            os.makedirs(os.path.dirname(os.path.abspath(output_json)),
                        exist_ok=True)
            payload = {
                "reference_image": reference_image,
                "sightings_folder": sightings_folder,
                "threshold": self.threshold,
                "total_scanned": len(sighting_paths),
                "total_above_threshold": len(results),
                "top_matches": top_results,
            }
            with open(output_json, "w") as f:
                json.dump(payload, f, indent=2)
            log.info(f"Results written → {output_json}")

        return top_results
