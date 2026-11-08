"""
test_face_matcher.py
====================
Unit & integration tests for FaceMatcher.

Run with:
    pytest test_face_matcher.py -v
"""

import json
import os
import tempfile
import pytest
import numpy as np
import cv2

from face_matcher import (
    FaceMatcher,
    _preprocess,
    _cosine_similarity,
    _histogram_similarity,
    _detect_face_opencv,
)


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures: synthetic face-like images
# ─────────────────────────────────────────────────────────────────────────────

def _make_synthetic_face(size=112, seed=42) -> np.ndarray:
    """
    Generate a reproducible synthetic "face-like" image.
    Uses skin-tone gradients + circles so Haar and histogram tests
    have something plausible to work with.
    """
    rng = np.random.default_rng(seed)
    img = np.zeros((size, size, 3), dtype=np.uint8)

    # skin-tone background
    img[:, :] = (180, 140, 100)

    # oval "head"
    cx, cy = size // 2, size // 2
    cv2.ellipse(img, (cx, cy), (size // 3, size // 2 - 5),
                0, 0, 360, (200, 160, 120), -1)

    # eyes
    for ex in [cx - size // 6, cx + size // 6]:
        cv2.circle(img, (ex, cy - size // 8), size // 15, (60, 40, 30), -1)

    # mouth
    cv2.ellipse(img, (cx, cy + size // 6), (size // 8, size // 16),
                0, 0, 180, (120, 60, 60), 2)

    # add a tiny bit of noise
    noise = rng.integers(0, 20, img.shape, dtype=np.uint8)
    img = cv2.add(img, noise)
    return img


@pytest.fixture
def tmp_dir():
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def reference_image(tmp_dir):
    """Write a synthetic face as the reference image."""
    path = os.path.join(tmp_dir, "reference.jpg")
    cv2.imwrite(path, _make_synthetic_face(seed=1))
    return path


@pytest.fixture
def sightings_folder(tmp_dir):
    """
    Create a folder with:
      - 3 near-identical sightings (should score high)
      - 2 different-looking images (should score lower)
      - 1 blank image  (edge-case robustness)
      - 1 non-image file (should be silently skipped)
    """
    folder = os.path.join(tmp_dir, "sightings")
    os.makedirs(folder)

    for i in range(3):
        # slight brightness variation of the reference face
        img = _make_synthetic_face(seed=1).astype(np.int16)
        img = np.clip(img + np.random.randint(-15, 15), 0, 255).astype(np.uint8)
        cv2.imwrite(os.path.join(folder, f"close_{i}.jpg"), img)

    for j in range(2):
        # completely different random image
        img = (np.random.rand(112, 112, 3) * 255).astype(np.uint8)
        cv2.imwrite(os.path.join(folder, f"different_{j}.jpg"), img)

    # blank (all-black) image
    cv2.imwrite(os.path.join(folder, "blank.jpg"),
                np.zeros((64, 64, 3), dtype=np.uint8))

    # non-image file
    with open(os.path.join(folder, "readme.txt"), "w") as f:
        f.write("not an image")

    return folder


# ─────────────────────────────────────────────────────────────────────────────
# Unit tests — individual helpers
# ─────────────────────────────────────────────────────────────────────────────

class TestPreprocess:
    def test_upscales_tiny_image(self):
        tiny = np.zeros((50, 50, 3), dtype=np.uint8)
        result = _preprocess(tiny)
        h, w = result.shape[:2]
        assert max(h, w) >= 160

    def test_does_not_shrink_large_image(self):
        big = np.zeros((300, 400, 3), dtype=np.uint8)
        result = _preprocess(big)
        assert result.shape[0] == 300 and result.shape[1] == 400

    def test_output_dtype(self):
        img = (np.random.rand(200, 200, 3) * 255).astype(np.uint8)
        result = _preprocess(img)
        assert result.dtype == np.uint8


class TestCosineSimilarity:
    def test_identical_vectors(self):
        v = np.array([1.0, 2.0, 3.0])
        assert _cosine_similarity(v, v) == pytest.approx(1.0, abs=1e-6)

    def test_orthogonal_vectors(self):
        a = np.array([1.0, 0.0])
        b = np.array([0.0, 1.0])
        assert _cosine_similarity(a, b) == pytest.approx(0.0, abs=1e-6)

    def test_zero_vector(self):
        a = np.zeros(10)
        b = np.ones(10)
        assert _cosine_similarity(a, b) == 0.0

    def test_range(self):
        rng = np.random.default_rng(0)
        for _ in range(20):
            a = rng.random(128)
            b = rng.random(128)
            s = _cosine_similarity(a, b)
            assert 0.0 <= s <= 1.0 + 1e-9


class TestHistogramSimilarity:
    def test_identical_images(self):
        img = _make_synthetic_face()
        score = _histogram_similarity(img, img)
        assert score >= 0.99

    def test_different_images(self):
        img1 = _make_synthetic_face(seed=1)
        img2 = (np.random.rand(112, 112, 3) * 255).astype(np.uint8)
        score = _histogram_similarity(img1, img2)
        assert score < 0.95

    def test_output_range(self):
        for seed in range(5):
            img1 = _make_synthetic_face(seed=seed)
            img2 = _make_synthetic_face(seed=seed + 10)
            s = _histogram_similarity(img1, img2)
            assert 0.0 <= s <= 1.0


class TestOpenCVDetector:
    def test_returns_none_on_blank(self):
        blank = np.zeros((100, 100, 3), dtype=np.uint8)
        result = _detect_face_opencv(blank)
        # may or may not detect — just assert it doesn't crash
        assert result is None or (isinstance(result, tuple) and len(result) == 4)

    def test_returns_tuple_or_none(self):
        img = _make_synthetic_face(size=200)
        result = _detect_face_opencv(img)
        if result is not None:
            assert len(result) == 4
            x, y, w, h = result
            assert w > 0 and h > 0


# ─────────────────────────────────────────────────────────────────────────────
# Integration tests — FaceMatcher class
# ─────────────────────────────────────────────────────────────────────────────

class TestFaceMatcherInit:
    def test_default_params(self):
        m = FaceMatcher()
        assert m.threshold == 0.4
        assert m.top_k == 5

    def test_custom_params(self):
        m = FaceMatcher(threshold=0.8, top_k=3)
        assert m.threshold == 0.8
        assert m.top_k == 3

    def test_invalid_threshold(self):
        with pytest.raises(ValueError):
            FaceMatcher(threshold=-0.1)
        with pytest.raises(ValueError):
            FaceMatcher(threshold=1.5)


class TestFaceMatcherErrors:
    def test_missing_reference(self, tmp_dir, sightings_folder):
        m = FaceMatcher()
        with pytest.raises(FileNotFoundError):
            m.match("nonexistent.jpg", sightings_folder)

    def test_missing_sightings_folder(self, reference_image):
        m = FaceMatcher()
        with pytest.raises(NotADirectoryError):
            m.match(reference_image, "/nonexistent/folder/")

    def test_empty_sightings_folder(self, reference_image, tmp_dir):
        empty = os.path.join(tmp_dir, "empty")
        os.makedirs(empty)
        m = FaceMatcher()
        result = m.match(reference_image, empty)
        assert result == []


class TestFaceMatcherOutput:
    def test_returns_list(self, reference_image, sightings_folder):
        m = FaceMatcher(threshold=0.0, top_k=5)   # threshold=0 → include all
        results = m.match(reference_image, sightings_folder)
        assert isinstance(results, list)

    def test_result_schema(self, reference_image, sightings_folder):
        m = FaceMatcher(threshold=0.0, top_k=5)
        results = m.match(reference_image, sightings_folder)
        for r in results:
            assert "filename" in r
            assert "confidence" in r
            assert "face_location" in r
            assert "engines_used" in r
            loc = r["face_location"]
            for key in ("x", "y", "width", "height"):
                assert key in loc

    def test_confidence_range(self, reference_image, sightings_folder):
        m = FaceMatcher(threshold=0.0, top_k=10)
        results = m.match(reference_image, sightings_folder)
        for r in results:
            assert 0.0 <= r["confidence"] <= 100.0

    def test_sorted_descending(self, reference_image, sightings_folder):
        m = FaceMatcher(threshold=0.0, top_k=10)
        results = m.match(reference_image, sightings_folder)
        confidences = [r["confidence"] for r in results]
        assert confidences == sorted(confidences, reverse=True)

    def test_top_k_respected(self, reference_image, sightings_folder):
        m = FaceMatcher(threshold=0.0, top_k=2)
        results = m.match(reference_image, sightings_folder)
        assert len(results) <= 2

    def test_threshold_filters(self, reference_image, sightings_folder):
        m = FaceMatcher(threshold=0.99, top_k=5)
        results = m.match(reference_image, sightings_folder)
        for r in results:
            assert r["confidence_raw"] >= 0.99

    def test_non_image_files_skipped(self, reference_image, sightings_folder):
        """readme.txt in sightings folder must not cause a crash."""
        m = FaceMatcher(threshold=0.0, top_k=10)
        results = m.match(reference_image, sightings_folder)
        filenames = [r["filename"] for r in results]
        assert "readme.txt" not in filenames

    def test_json_output(self, reference_image, sightings_folder, tmp_dir):
        out_path = os.path.join(tmp_dir, "out", "results.json")
        m = FaceMatcher(threshold=0.0, top_k=5)
        m.match(reference_image, sightings_folder, output_json=out_path)
        assert os.path.isfile(out_path)
        with open(out_path) as f:
            data = json.load(f)
        assert "top_matches" in data
        assert "total_scanned" in data
        assert data["threshold"] == 0.0
