const map = L.map('map', {
  zoomControl: false
}).setView([16.4637, 107.5909], 11);

// Base layers (gắn cờ để đổi qua hàm switchBase)
const tileLayers = {
  default: L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" }),
  satellite: L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" })
};
tileLayers.default.addTo(map);

// Zoom control góc phải dưới
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Cho phép đổi base map qua UI custom
function switchBase(type) {
  map.eachLayer(layer => {
    if (layer instanceof L.TileLayer) map.removeLayer(layer);
  });
  tileLayers[type].addTo(map);
}

// ==============================
//       LAYER + POPUP
// ==============================
const overlays = {
  "Vết lũ": {},
  "Trạm đo": {}
};

// VẾT LŨ
function addFloodLayer(year, color) {
  fetch('Flood_trace_all.geojson')
    .then(res => res.json())
    .then(data => {
      const layer = L.geoJSON(data, {
        filter: f => f.properties[`VL${year}`],
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 4,
          fillColor: color,
          color: '#000',
          weight: 0.5,
          fillOpacity: 0.85
        }),
        onEachFeature: (f, l) => {
          const p = f.properties;
          let popup = `<b>${p.Name || ''}</b><br><b>ID:</b> ${p.ID || ''}<br><b>Code:</b> ${p.Code || ''}<br><b>Địa điểm:</b> ${p.Commune || ''}, ${p.District || ''}<br><b>Tọa độ:</b> ${p.X}, ${p.Y}`;
          ['2020', '2022', '2023'].forEach(y => {
            let val = p[`T10_${y}`] || p[`T11_${y}`] || p[`T10.${y}`] || p[`T11.${y}`];
            if (val && !isNaN(parseFloat(val))) {
              popup += `<br><b>Độ sâu ${y}:</b> ${parseFloat(val).toFixed(2)} m`;
            }
          });
          l.bindPopup(popup, { autoClose: false });
        }
      });
      overlays["Vết lũ"][`Năm ${year}`] = layer;
      layer.addTo(map);
    });
}
addFloodLayer('2020', 'orange');
addFloodLayer('2022', 'gold');
addFloodLayer('2023', 'limegreen');

// TRẠM
fetch('Station.geojson')
  .then(res => res.json())
  .then(data => {
    const icons = {
      "Tháp báo lũ": "⚫",
      "Trạm đo H tự động": "🔵",
      "Tháp cảnh báo ngập": "🟤"
    };

    const colors = {
      "Tháp báo lũ": 'black',
      "Trạm đo H tự động": 'blue',
      "Tháp cảnh báo ngập": 'brown'
    };

    Object.keys(icons).forEach(type => {
      const label = `${icons[type]} ${type}`;
      const layer = L.geoJSON(data, {
        filter: f => f.properties.Type === type,
        pointToLayer: (f, latlng) => L.marker(latlng, {
          icon: L.divIcon({
            html: `<div style="width:18px;height:18px;background:${colors[type]};border-radius:50%;border:1px solid white;"></div>`,
            className: '',
            iconSize: [18, 18]
          }),
          riseOnHover: true
        }),
        onEachFeature: (f, l) => {
          const p = f.properties;
          const popup = `<b>${p.Name2 || p.Name || ''}</b><br><b>Loại:</b> ${p.Type || ''}<br><b>Địa điểm:</b> ${p.Name || ''}<br><b>Tọa độ:</b> ${p.X || ''}, ${p.Y || ''}`;
          l.bindPopup(popup);
        }
      });
      overlays["Trạm đo"][label] = layer;
      layer.addTo(map);
    });
  });

// GROUPED LAYER CONTROL
L.control.groupedLayers(tileLayers, overlays, {
  collapsed: false,
  position: 'topleft'
}).addTo(map);

// Co giãn marker vết lũ khi zoom
map.on("zoomend", () => {
  const z = map.getZoom();
  Object.values(overlays["Vết lũ"]).forEach(layer => {
    if (layer.setStyle) layer.setStyle({ radius: Math.max(2, z / 2.5) });
  });
});
