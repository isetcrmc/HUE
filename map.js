
// map.js (bản tối ưu biểu tượng + popup + fix khó click)

const map = L.map('map').setView([16.4637, 107.5909], 11);

// Base map Google
const baseLayers = {
  "Roadmap": L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" }),
  "Satellite": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" })
};
baseLayers["Roadmap"].addTo(map);

// Overlay nhóm
const overlays = {
  "Vết lũ": {},
  "Trạm đo": {}
};

// Load vết lũ
function addFloodLayer(year, color) {
  fetch("Flood_trace_all.geojson").then(res => res.json()).then(data => {
    const layer = L.geoJSON(data, {
      filter: f => f.properties[`VL${year}`],
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: 4,
        fillColor: color,
        color: "#000",
        weight: 0.5,
        fillOpacity: 0.85
      }),
      onEachFeature: (f, l) => {
        const p = f.properties;
        let popup = `<b>${p.Name || ""}</b><br><b>ID:</b> ${p.Code || ""}<br><b>Địa điểm:</b> ${p.Commune || ""}, ${p.District || ""}<br><b>Tọa độ:</b> ${p.X || ""}, ${p.Y || ""}`;
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

// Load Station
fetch("Station.geojson").then(res => res.json()).then(data => {
  const iconDefs = {
    "Tháp báo lũ": L.AwesomeMarkers.icon({
      icon: 'sliders', prefix: 'fa', markerColor: 'black', iconColor: 'white'
    }),
    "Trạm đo H tự động": L.AwesomeMarkers.icon({
      icon: 'tint', prefix: 'fa', markerColor: 'blue', iconColor: 'white'
    }),
    "Tháp cảnh báo ngập": L.AwesomeMarkers.icon({
      icon: 'exclamation-triangle', prefix: 'fa', markerColor: 'brown', iconColor: 'white'
    })
  };

  const types = Object.keys(iconDefs);

  types.forEach(type => {
    const layer = L.geoJSON(data, {
      filter: f => f.properties.Type === type,
      pointToLayer: (f, latlng) => L.marker(latlng, {
        icon: iconDefs[type],
        riseOnHover: true
      }),
      onEachFeature: (f, l) => {
        const p = f.properties;
        const popup = `<b>${p.Name2 || p.Name || ""}</b><br><b>Loại:</b> ${p.Type || ""}<br><b>Địa điểm:</b> ${p.Name || ""}<br><b>Tọa độ:</b> ${p.X || ""}, ${p.Y || ""}`;
        l.bindPopup(popup);
      }
    });
    overlays["Trạm đo"][type] = layer;
    layer.addTo(map);
  });
});

// Layer control
L.control.groupedLayers(baseLayers, overlays, {
  collapsed: false,
  position: "topleft"
}).addTo(map);

// Co giãn marker circle theo zoom
map.on("zoomend", () => {
  const z = map.getZoom();
  Object.values(overlays["Vết lũ"]).forEach(layer => {
    if (layer.setStyle) layer.setStyle({ radius: Math.max(2, z / 2.5) });
  });
});
