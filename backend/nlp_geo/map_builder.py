# backend/nlp_geo/map_builder.py
# Run once: pip install folium --break-system-packages

import folium


def generate_map_html(points: list) -> str:
    """
    points: list of dicts from app.py /api/map endpoint
    Each dict has: id, case_id, location, latitude, longitude, sighted_at, nlp_data
    Returns: full HTML string that LiveMap.jsx loads in the iframe
    """
    # Default center = India. If we have points, center on first one.
    center = [22.5, 82.0]
    zoom = 5
    if points:
        center = [points[0]["latitude"], points[0]["longitude"]]
        zoom = 7

    m = folium.Map(
        location=center,
        zoom_start=zoom,
        tiles="CartoDB dark_matter"
    )

    for p in points:
        case_id_short = str(p.get("case_id") or "")[:8]
        location_name = p.get("location") or "Unknown location"
        sighted_at    = p.get("sighted_at") or "Unknown time"

        popup_html = f"""
        <div style='
            font-family: "Courier New", monospace;
            font-size: 12px;
            padding: 6px;
            min-width: 200px;
            color: #ccc;
            background: #111;
        '>
            <div style='color:#e63946;font-weight:bold;margin-bottom:4px'>
                SIGHTING REPORT
            </div>
            <b>Location:</b> {location_name}<br>
            <b>Sighted:</b> {sighted_at}<br>
            <b>Case:</b> {case_id_short}...
        </div>
        """

        folium.CircleMarker(
            location=[p["latitude"], p["longitude"]],
            radius=9,
            color="#e63946",
            fill=True,
            fill_color="#e63946",
            fill_opacity=0.85,
            popup=folium.Popup(popup_html, max_width=240),
            tooltip=location_name,
        ).add_to(m)

    return m._repr_html_()

# # """
# # map_builder.py
# # ==============
# # Geospatial Visualizer — Part B
# # Takes a list of sighting dicts (from extractor.py) and builds
# # an interactive Folium map saved as map.html.

# # Features
# # --------
# # • Colour-coded pins by recency:
# #     red    = last 7 days
# #     orange = last 8–30 days
# #     blue   = older than 30 days
# #     gray   = no date available
# # • Rich popup card: date, location, description, confidence badge
# # • Polyline trail connecting sightings of the same person
# # • LayerControl to show/hide per-person layers
# # • Auto-centres on available sighting coordinates
# # • Geocodes city/landmark via Nominatim if no coords provided
# # """

# # import os
# # import time
# # import json
# # import logging
# # from datetime import datetime, timezone, timedelta, date
# # from typing import Optional

# # import folium
# # from folium import LayerControl, PolyLine

# # log = logging.getLogger("map_builder")
# # logging.basicConfig(
# #     level=logging.INFO,
# #     format="%(asctime)s [%(levelname)s] %(message)s",
# #     datefmt="%H:%M:%S",
# # )

# # # ── Optional geocoding ────────────────────────────────────────────────────────
# # try:
# #     from geopy.geocoders import Nominatim
# #     from geopy.exc import GeocoderServiceError
# #     _geocoder = Nominatim(user_agent="missing_persons_hackathon_v1")
# #     GEOCODING_AVAILABLE = True
# # except ImportError:
# #     GEOCODING_AVAILABLE = False
# #     log.warning("geopy not installed — geocoding disabled. "
# #                 "Add 'lat' and 'lng' keys to sighting dicts manually.")


# # # ─────────────────────────────────────────────────────────────────────────────
# # # Constants
# # # ─────────────────────────────────────────────────────────────────────────────

# # # Default map centre (central India)
# # DEFAULT_CENTER = (20.5937, 78.9629)
# # DEFAULT_ZOOM   = 5

# # # Recency thresholds
# # RECENT_DAYS  = 7
# # MEDIUM_DAYS  = 30

# # # Pin colours (Folium named colours)
# # COLOR_RECENT  = "red"
# # COLOR_MEDIUM  = "orange"
# # COLOR_OLD     = "blue"
# # COLOR_UNKNOWN = "gray"

# # # Trail line colours per person (cycles if > 8 persons)
# # _TRAIL_PALETTE = [
# #     "#E53935", "#8E24AA", "#1E88E5", "#00897B",
# #     "#F4511E", "#6D4C41", "#039BE5", "#43A047",
# # ]


# # # ─────────────────────────────────────────────────────────────────────────────
# # # Helpers
# # # ─────────────────────────────────────────────────────────────────────────────

# # def _parse_date(sighting: dict) -> Optional[date]:
# #     """Extract a date object from sighting dict. Returns None if unparseable."""
# #     raw = sighting.get("date")
# #     if not raw:
# #         return None
# #     try:
# #         return date.fromisoformat(str(raw))
# #     except ValueError:
# #         return None


# # def _pin_color(sighting: dict) -> str:
# #     """Return Folium colour name based on how recent the sighting is."""
# #     d = _parse_date(sighting)
# #     if d is None:
# #         return COLOR_UNKNOWN
# #     today = date.today()
# #     delta = (today - d).days
# #     if delta <= RECENT_DAYS:
# #         return COLOR_RECENT
# #     elif delta <= MEDIUM_DAYS:
# #         return COLOR_MEDIUM
# #     return COLOR_OLD


# # def _geocode(city: Optional[str], landmark: Optional[str],
# #              country: str = "India") -> Optional[tuple]:
# #     """
# #     Geocode a location string using Nominatim.
# #     Returns (lat, lng) or None.
# #     Respects Nominatim's 1 req/sec rate limit.
# #     """
# #     if not GEOCODING_AVAILABLE:
# #         return None
# #     query_parts = [p for p in [landmark, city, country] if p]
# #     if not query_parts:
# #         return None
# #     query = ", ".join(query_parts)
# #     try:
# #         time.sleep(1.1)  # Nominatim ToS: max 1 req/sec
# #         result = _geocoder.geocode(query, timeout=6)
# #         if result:
# #             log.info(f"  Geocoded '{query}' → {result.latitude:.4f}, {result.longitude:.4f}")
# #             return (result.latitude, result.longitude)
# #         log.warning(f"  No geocoding result for '{query}'")
# #     except GeocoderServiceError as e:
# #         log.warning(f"  Geocoding error for '{query}': {e}")
# #     except Exception as e:
# #         log.warning(f"  Unexpected geocoding error: {e}")
# #     return None


# # def _get_coords(sighting: dict) -> Optional[tuple]:
# #     """
# #     Return (lat, lng) from sighting.
# #     Checks 'lat'/'lng' keys first, then tries geocoding.
# #     """
# #     lat = sighting.get("lat")
# #     lng = sighting.get("lng")
# #     if lat is not None and lng is not None:
# #         try:
# #             return (float(lat), float(lng))
# #         except (ValueError, TypeError):
# #             pass

# #     # Try geocoding from location block
# #     loc = sighting.get("location") or {}
# #     return _geocode(
# #         city=loc.get("city"),
# #         landmark=loc.get("landmark"),
# #         country=loc.get("country") or "India",
# #     )


# # def _confidence_badge(score: int) -> str:
# #     """HTML badge for confidence score."""
# #     if score >= 75:
# #         bg, label = "#2e7d32", "HIGH"
# #     elif score >= 45:
# #         bg, label = "#e65100", "MEDIUM"
# #     else:
# #         bg, label = "#b71c1c", "LOW"
# #     return (
# #         f'<span style="background:{bg};color:#fff;padding:2px 8px;'
# #         f'border-radius:10px;font-size:11px;font-weight:700;">'
# #         f'{label} {score}%</span>'
# #     )


# # def _build_popup(sighting: dict, pin_number: int) -> folium.Popup:
# #     """Build a styled HTML popup card for a sighting pin."""
# #     loc  = sighting.get("location") or {}
# #     pid  = sighting.get("person_id", "UNKNOWN")
# #     conf = sighting.get("confidence", 0)
# #     raw  = sighting.get("raw_text", "")

# #     location_str = ", ".join(
# #         p for p in [loc.get("landmark"), loc.get("city"),
# #                     loc.get("state"), loc.get("country")] if p
# #     ) or "Unknown location"

# #     date_str = sighting.get("date") or "Unknown"
# #     time_str = sighting.get("time") or "—"
# #     desc_str = sighting.get("description") or "No description"
# #     raw_snippet = (raw[:130] + "…") if len(raw) > 130 else raw

# #     html = f"""
# #     <div style="font-family:'Segoe UI',Arial,sans-serif;
# #                 min-width:250px;max-width:310px;font-size:13px;">

# #       <!-- Header -->
# #       <div style="background:#1a237e;color:#fff;padding:9px 13px;
# #                   border-radius:6px 6px 0 0;margin:-1px;">
# #         <b>SIGHTING #{pin_number}</b>
# #         <span style="float:right;opacity:.75;font-size:11px;">{pid}</span>
# #       </div>

# #       <!-- Body -->
# #       <div style="border:1px solid #ddd;border-top:none;padding:11px 13px;
# #                   background:#fff;border-radius:0 0 6px 6px;">
# #         <div style="margin-bottom:7px;">{_confidence_badge(conf)}</div>
# #         <div style="line-height:1.8;color:#333;">
# #           📍 <b>Location:</b> {location_str}<br>
# #           📅 <b>Date:</b> {date_str}&nbsp;&nbsp;🕐 <b>Time:</b> {time_str}<br>
# #           🧍 <b>Description:</b> {desc_str}
# #         </div>
# #         <hr style="border:none;border-top:1px solid #eee;margin:9px 0;">
# #         <div style="font-size:10px;color:#999;font-style:italic;">
# #           "{raw_snippet}"
# #         </div>
# #       </div>
# #     </div>
# #     """
# #     return folium.Popup(folium.IFrame(html, width=330, height=230),
# #                         max_width=330)


# # # ─────────────────────────────────────────────────────────────────────────────
# # # Legend HTML (injected as a custom Folium element)
# # # ─────────────────────────────────────────────────────────────────────────────

# # _LEGEND_HTML = """
# # <div style="position:fixed;bottom:30px;left:30px;z-index:9999;
# #             background:rgba(255,255,255,0.93);border:1px solid #ccc;
# #             border-radius:8px;padding:12px 16px;
# #             font-family:'Segoe UI',Arial,sans-serif;font-size:12px;
# #             box-shadow:0 2px 8px rgba(0,0,0,0.2);">
# #   <b style="font-size:13px;">📍 Pin Recency</b><br><br>
# #   <span style="color:#d32f2f;">●</span> &nbsp;Last 7 days<br>
# #   <span style="color:#f57c00;">●</span> &nbsp;Last 8–30 days<br>
# #   <span style="color:#1565c0;">●</span> &nbsp;Older than 30 days<br>
# #   <span style="color:#757575;">●</span> &nbsp;Date unknown
# # </div>
# # """


# # # ─────────────────────────────────────────────────────────────────────────────
# # # Main builder function
# # # ─────────────────────────────────────────────────────────────────────────────

# # def build_map(
# #     sightings: list,
# #     output_path: str = "map.html",
# #     map_tiles: str = "OpenStreetMap",
# # ) -> str:
# #     """
# #     Build an interactive Folium map from a list of sighting dicts.

# #     Parameters
# #     ----------
# #     sightings : list of dict
# #         Each dict should follow the schema from extractor.py.
# #         Optionally include 'lat' and 'lng' keys to skip geocoding.
# #     output_path : str
# #         Where to save the HTML file. Default: 'map.html'.
# #     map_tiles : str
# #         Folium tile provider. Options: 'OpenStreetMap', 'CartoDB positron',
# #         'CartoDB dark_matter'. Default: 'OpenStreetMap'.

# #     Returns
# #     -------
# #     str  — absolute path to the saved HTML file.

# #     Raises
# #     ------
# #     ValueError  — if sightings list is empty
# #     RuntimeError — if no sighting could be geocoded (nothing to plot)
# #     """
# #     if not sightings:
# #         raise ValueError("Sightings list is empty — nothing to plot.")

# #     log.info(f"Building map for {len(sightings)} sighting(s)...")

# #     # ── Step 1: resolve coordinates for every sighting ────────────────────────
# #     resolved = []
# #     for i, s in enumerate(sightings, 1):
# #         log.info(f"[{i}/{len(sightings)}] Resolving coords for sighting...")
# #         coords = _get_coords(s)
# #         if coords is None:
# #             log.warning(f"  No coordinates — sighting will be skipped on map.")
# #         resolved.append({**s, "_coords": coords, "_pin_number": i})

# #     plottable = [s for s in resolved if s["_coords"] is not None]
# #     if not plottable:
# #         raise RuntimeError(
# #             "None of the sightings could be geocoded or had lat/lng. "
# #             "Add 'lat'/'lng' keys to your sighting dicts, or install geopy."
# #         )

# #     log.info(f"{len(plottable)}/{len(resolved)} sighting(s) have coordinates.")

# #     # ── Step 2: compute map centre ────────────────────────────────────────────
# #     all_lats = [s["_coords"][0] for s in plottable]
# #     all_lngs = [s["_coords"][1] for s in plottable]
# #     center = (sum(all_lats) / len(all_lats), sum(all_lngs) / len(all_lngs))
# #     zoom   = 12 if len(plottable) == 1 else (
# #              10 if len(plottable) <= 4 else DEFAULT_ZOOM
# #     )

# #     # ── Step 3: create base map ───────────────────────────────────────────────
# #     m = folium.Map(
# #         location=center,
# #         zoom_start=zoom,
# #         tiles=map_tiles,
# #         control_scale=True,
# #     )

# #     # ── Step 4: group plottable sightings by person_id ────────────────────────
# #     groups: dict[str, list] = {}
# #     for s in plottable:
# #         pid = s.get("person_id", "UNKNOWN")
# #         groups.setdefault(pid, []).append(s)

# #     # ── Step 5: add one FeatureGroup per person ───────────────────────────────
# #     for p_idx, (pid, person_sightings) in enumerate(groups.items()):
# #         trail_color = _TRAIL_PALETTE[p_idx % len(_TRAIL_PALETTE)]
# #         layer_name  = f"Person: {pid}"
# #         fg = folium.FeatureGroup(name=layer_name)

# #         # Sort sightings chronologically for trail ordering
# #         person_sightings_sorted = sorted(
# #             person_sightings,
# #             key=lambda s: (str(_parse_date(s) or ""), s["_pin_number"]),
# #         )

# #         # ── Polyline trail ─────────────────────────────────────────────────────
# #         if len(person_sightings_sorted) > 1:
# #             trail_coords = [s["_coords"] for s in person_sightings_sorted]
# #             PolyLine(
# #                 locations=trail_coords,
# #                 color=trail_color,
# #                 weight=3,
# #                 opacity=0.7,
# #                 tooltip=f"Trail: {pid}",
# #                 dash_array="6 4",  # dashed line
# #             ).add_to(fg)

# #         # ── Markers ────────────────────────────────────────────────────────────
# #         for s in person_sightings_sorted:
# #             pin_color = _pin_color(s)
# #             popup     = _build_popup(s, s["_pin_number"])
# #             loc_parts = [
# #                 s.get("location", {}).get("landmark"),
# #                 s.get("location", {}).get("city"),
# #             ]
# #             tooltip_text = " | ".join(p for p in loc_parts if p) or pid

# #             folium.Marker(
# #                 location=s["_coords"],
# #                 popup=popup,
# #                 tooltip=f"#{s['_pin_number']} {tooltip_text}",
# #                 icon=folium.Icon(
# #                     color=pin_color,
# #                     icon="user",
# #                     prefix="fa",
# #                 ),
# #             ).add_to(fg)

# #         fg.add_to(m)

# #     # ── Step 6: controls & legend ─────────────────────────────────────────────
# #     LayerControl(collapsed=False).add_to(m)

# #     # Inject legend as raw HTML element
# #     legend = folium.Element(_LEGEND_HTML)
# #     m.get_root().html.add_child(legend)

# #     # ── Step 7: save ──────────────────────────────────────────────────────────
# #     os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
# #     m.save(output_path)
# #     abs_path = os.path.abspath(output_path)
# #     log.info(f"Map saved → {abs_path}")
# #     return abs_path


# # # ── CLI convenience ───────────────────────────────────────────────────────────
# # if __name__ == "__main__":
# #     # Demo with hardcoded lat/lng so it works without geocoding
# #     demo_sightings = [
# #         {
# #             "person_id": "MP-001",
# #             "location": {"city": "New Delhi", "landmark": "Connaught Place",
# #                          "state": "Delhi", "country": "India"},
# #             "date": "2024-04-03",
# #             "time": None,
# #             "description": "child, ~10 years, red shirt",
# #             "confidence": 85,
# #             "raw_text": "A child was seen near Connaught Place, Delhi on 3rd April.",
# #             "lat": 28.6315,
# #             "lng": 77.2167,
# #         },
# #         {
# #             "person_id": "MP-001",
# #             "location": {"city": "New Delhi", "landmark": "India Gate",
# #                          "state": "Delhi", "country": "India"},
# #             "date": "2024-04-05",
# #             "time": "14:30",
# #             "description": "child, blue jacket, same build",
# #             "confidence": 72,
# #             "raw_text": "Same child spotted near India Gate on 5th April at 2:30 PM.",
# #             "lat": 28.6129,
# #             "lng": 77.2295,
# #         },
# #     ]
# #     path = build_map(demo_sightings, output_path="map.html")
# #     print(f"Demo map saved: {path}")


# # backend/nlp_geo/map_builder.py
# # import folium

# # def generate_map_html(points: list) -> str:
# #     center = [22.5, 82.0]
# #     if points:
# #         center = [points[0]["latitude"], points[0]["longitude"]]

# #     m = folium.Map(
# #         location=center,
# #         zoom_start=6,
# #         tiles="CartoDB dark_matter"
# #     )

# #     for p in points:
# #         popup_html = f"""
# #         <div style='font-family:monospace;font-size:12px;padding:4px'>
# #           <b>Location:</b> {p.get("location", "Unknown")}<br>
# #           <b>Sighted:</b> {p.get("sighted_at", "Unknown")}<br>
# #           <b>Case:</b> {str(p.get("case_id", ""))[:8]}...
# #         </div>
# #         """
# #         folium.CircleMarker(
# #             location=[p["latitude"], p["longitude"]],
# #             radius=9,
# #             color="#e63946",
# #             fill=True,
# #             fill_color="#e63946",
# #             fill_opacity=0.75,
# #             popup=folium.Popup(popup_html, max_width=220),
# #             tooltip=p.get("location", "Sighting"),
# #         ).add_to(m)

# #     return m._repr_html_()

# # backend/nlp_geo/map_builder.py
# import folium

# def generate_map_html(points: list) -> str:
#     center = [22.5, 82.0]
#     if points:
#         center = [points[0]["latitude"], points[0]["longitude"]]

#     m = folium.Map(
#         location=center,
#         zoom_start=6,
#         tiles="CartoDB dark_matter"
#     )

#     for p in points:
#         popup_html = f"""
#         <div style='font-family:monospace;font-size:12px;padding:4px'>
#           <b>Location:</b> {p.get("location", "Unknown")}<br>
#           <b>Sighted:</b> {p.get("sighted_at", "Unknown")}<br>
#           <b>Case:</b> {str(p.get("case_id", ""))[:8]}...
#         </div>
#         """
#         folium.CircleMarker(
#             location=[p["latitude"], p["longitude"]],
#             radius=9,
#             color="#e63946",
#             fill=True,
#             fill_color="#e63946",
#             fill_opacity=0.85,
#             popup=folium.Popup(popup_html, max_width=220),
#             tooltip=p.get("location", "Sighting"),
#         ).add_to(m)

#     return m._repr_html_()

