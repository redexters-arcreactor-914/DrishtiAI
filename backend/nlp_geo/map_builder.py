"""
map_builder.py
==============
Builds the Folium map served by GET /api/map and loaded in LiveMap.jsx's iframe.

- Returns a full standalone HTML document (not the Jupyter "Trust Notebook"
  wrapper that `_repr_html_()` produces, which rendered as a small box).
- One colour per case, with a chronological trail between that case's sightings.
- Newest sighting per case is drawn larger.
- Auto-fits the viewport to all points.
"""

from html import escape

import folium

_PALETTE = ["#e63946", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7",
            "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"]

# Base maps that need no API key. (CARTO's basemaps now require a key and
# render "API KEY REQUIRED" watermarks without one.)
_DARK_TILES = ("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/"
               "World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}")
_DARK_LABELS = ("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/"
                "World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}")
_DARK_ATTR = "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
_OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
_OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'


def _sort_key(p):
    return p.get("sighted_at") or p.get("created_at") or ""


def generate_map_html(points: list, case_names: dict | None = None) -> str:
    """
    points: list of dicts with id, case_id, location, latitude, longitude,
            sighted_at, nlp_data (as produced by app.py /api/map)
    case_names: optional {case_id: name}
    Returns a complete HTML document.
    """
    case_names = case_names or {}
    pts = [p for p in points
           if p.get("latitude") is not None and p.get("longitude") is not None]

    center, zoom = [22.5, 82.0], 5
    if len(pts) == 1:
        center, zoom = [pts[0]["latitude"], pts[0]["longitude"]], 12

    m = folium.Map(location=center, zoom_start=zoom, tiles=None,
                   control_scale=True, prefer_canvas=True)
    folium.TileLayer(_DARK_TILES, attr=_DARK_ATTR, name="Dark", max_zoom=16,
                     max_native_zoom=16).add_to(m)
    folium.TileLayer(_OSM_TILES, attr=_OSM_ATTR, name="Street (OSM)", max_zoom=19,
                     show=False).add_to(m)
    folium.TileLayer(_DARK_LABELS, attr=_DARK_ATTR, name="Place names", overlay=True,
                     control=True, max_zoom=16, max_native_zoom=16).add_to(m)

    by_case: dict = {}
    for p in pts:
        by_case.setdefault(p.get("case_id") or "unlinked", []).append(p)

    for i, (case_id, items) in enumerate(sorted(by_case.items())):
        color = "#9ca3af" if case_id == "unlinked" else _PALETTE[i % len(_PALETTE)]
        name = case_names.get(case_id) or ("Unlinked reports" if case_id == "unlinked"
                                           else f"Case {str(case_id)[:8]}")
        group = folium.FeatureGroup(name=escape(name), show=True).add_to(m)
        items = sorted(items, key=_sort_key)

        if len(items) > 1:
            folium.PolyLine(
                [[p["latitude"], p["longitude"]] for p in items],
                color=color, weight=2, opacity=0.6, dash_array="6 6",
            ).add_to(group)

        for idx, p in enumerate(items):
            latest = idx == len(items) - 1
            location_name = escape(p.get("location") or "Unknown location")
            sighted_at = escape((p.get("sighted_at") or "Unknown time").replace("T", " "))
            raw = escape((p.get("raw_text") or "")[:220])
            popup_html = f"""
            <div style="font-family:'Courier New',monospace;font-size:12px;min-width:220px;">
              <div style="color:{color};font-weight:bold;margin-bottom:4px">
                SIGHTING #{idx + 1} — {escape(name)}{' (LATEST)' if latest else ''}
              </div>
              <b>Location:</b> {location_name}<br>
              <b>Sighted:</b> {sighted_at}<br>
              {f'<div style="margin-top:4px;color:#555">{raw}</div>' if raw else ''}
            </div>"""
            folium.CircleMarker(
                location=[p["latitude"], p["longitude"]],
                radius=11 if latest else 7,
                color="#ffffff" if latest else color,
                weight=2 if latest else 1,
                fill=True, fill_color=color, fill_opacity=0.9,
                popup=folium.Popup(popup_html, max_width=280),
                tooltip=f"{escape(name)} · {location_name}",
            ).add_to(group)

    folium.LayerControl(collapsed=bool(not by_case)).add_to(m)

    if len(pts) > 1:
        lats = [p["latitude"] for p in pts]
        lngs = [p["longitude"] for p in pts]
        m.fit_bounds([[min(lats), min(lngs)], [max(lats), max(lngs)]],
                     padding=(40, 40), max_zoom=13)

    if not pts:
        m.get_root().html.add_child(folium.Element(
            '<div style="position:fixed;top:16px;left:50%;transform:translateX(-50%);'
            'z-index:9999;background:#111;color:#e63946;padding:8px 14px;'
            'font-family:monospace;font-size:12px;border:1px solid #e63946;">'
            'NO GEOLOCATED SIGHTINGS YET</div>'))

    return m.get_root().render()
