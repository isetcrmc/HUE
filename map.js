// map.js (đã chỉnh sửa đẹp hơn & đầy đủ)

const map = L.map('map').setView([16.4637, 107.5909], 11);

// Base map Google
const baseLayers = {
  "Roadmap": L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" }),
  "Satellite": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" })
};
baseLayers["Roadmap"].addTo(map);

// Group overlay layers
const overlays = {
  "Vết lũ": {},
  "Trạm đo": {}
};

function addFloodLayer(year, color) {
  fetch("Flood_trace_all.geojson").then(res => res.json()).then(data => {
    const layer = L.geoJSON(data, {
      filter: f => f.properties[`VL${year}`],
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: map.getZoom() / 2,
        fillColor: color,
        color: "#000",
        weight: 1,
        fillOpacity: 0.85
      }),
      onEachFeature: (f, l) => {
        const p = f.properties;
        let popup = `<b>${p.Name || ""}</b><br><b>Code:</b> ${p.Code || ""}<br><b>Địa điểm:</b> ${p.Commune || ""}, ${p.District || ""}<br><b>Tọa độ:</b> ${p.X || ""}, ${p.Y || ""}`;
        ['2020', '2022', '2023'].forEach(y => {
          let val = p[`T10_${y}`] || p[`T11_${y}`] || p[`T10.${y}`] || p[`T11.${y}`];
          if (val && !isNaN(parseFloat(val))) {
            popup += `<br><b>Độ sâu ${y}:</b> ${parseFloat(val).toFixed(2)} m`;
          }
        });
        l.bindPopup(popup);
      }
    });
    overlays["Vết lũ"][`Năm ${year}`] = layer;
    layer.addTo(map);
  });
}

addFloodLayer('2020', 'orange');
addFloodLayer('2022', 'gold');
addFloodLayer('2023', 'limegreen');

// Station
fetch("Station.geojson").then(res => res.json()).then(data => {
  const types = ["Tháp báo lũ", "Trạm đo H tự động", "Tháp cảnh báo ngập"];
  const colors = {
    "Tháp báo lũ": "purple",
    "Trạm đo H tự động": "navy",
    "Tháp cảnh báo ngập": "teal"
  };

  types.forEach(type => {
    const layer = L.geoJSON(data, {
      filter: f => f.properties.Type === type,
      pointToLayer: (f, latlng) => L.marker(latlng, {
        icon: L.AwesomeMarkers.icon({
          icon: 'circle',
          prefix: 'fa',
          markerColor: colors[type],
          iconColor: 'white'
        })
      }),
      onEachFeature: (f, l) => {
        const p = f.properties;
        const popup = `<b>${p.Name2 || p.Name || ""}</b><br><b>Loại:</b> ${p.Type || ""}<br><b>Tọa độ:</b> ${p.X || ""}, ${p.Y || ""}`;
        l.bindPopup(popup);
      }
    });
    overlays["Trạm đo"][type] = layer;
    layer.addTo(map);
  });
});

// Load group control
setTimeout(() => {
  if (L.control.groupedLayers) {
    L.control.groupedLayers(baseLayers, overlays, {
      collapsed: false,
      position: "topleft"
    }).addTo(map);
  } else {
    console.warn("Thiếu thư viện leaflet.groupedlayercontrol.js → không tạo được bảng layer!");
  }
}, 500);

// Cập nhật kích thước circle marker khi zoom
map.on("zoomend", () => {
  const z = map.getZoom() / 2;
  Object.values(overlays["Vết lũ"]).forEach(layer => {
    if (layer.setStyle) layer.setStyle({ radius: z });
  });
});
