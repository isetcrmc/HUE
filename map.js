const map = L.map('map', { zoomControl: false }).setView([16.4637, 107.5909], 11);
L.control.zoom({ position: 'bottomright' }).addTo(map);

let baseRoad = L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" });
let baseSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" });
baseRoad.addTo(map);

function switchBase(type) {
  if (type === 'satellite') {
    map.removeLayer(baseRoad);
    map.addLayer(baseSat);
  } else {
    map.removeLayer(baseSat);
    map.addLayer(baseRoad);
  }
}

const layerMapping = {}; // Liên kết với bảng điều khiển lớp

// Ranh giới phường
fetch("Ward_2025.geojson").then(res => res.json()).then(data => {
  const layer = L.geoJSON(data);
  layerMapping["ward"] = layer;
});

// Ranh giới cộng đồng
fetch("Community.geojson").then(res => res.json()).then(data => {
  const layer = L.geoJSON(data);
  layerMapping["community"] = layer;
});

// Đỗ xe tránh ngập: chia theo RoadType
fetch("Do_xe.geojson").then(res => res.json()).then(data => {
  const fc1 = data.features.filter(f => f.properties.RoadType === "1 chiều");
  const fc2 = data.features.filter(f => f.properties.RoadType === "2 chiều");
  layerMapping["do_xe_1"] = L.geoJSON({ type: 'FeatureCollection', features: fc1 });
  layerMapping["do_xe_2"] = L.geoJSON({ type: 'FeatureCollection', features: fc2 });
});

// Trạm đo mưa (Vrain)
fetch("Vrain.geojson").then(res => res.json()).then(data => {
  const layer = L.geoJSON(data, {
    onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Ten || ''}</b>`)
  });
  layerMapping["vrain"] = layer;
});

// Flood trace theo năm
function addFloodLayer(year, color, idKey) {
  fetch("Flood_trace_all.geojson").then(res => res.json()).then(data => {
    const layer = L.geoJSON(data, {
      filter: f => f.properties[`VL${year}`],
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: 3.5,
        fillColor: color,
        color: "#333",
        weight: 0.5,
        fillOpacity: 0.75
      }),
      onEachFeature: (f, l) => {
        let p = f.properties;
        let popup = `<b>Tên vết lũ:</b> ${p.Name || ''}<br><b>ID:</b> ${p.ID || ''}<br><b>Code:</b> ${p.Code || ''}`;
        if (p.Commune || p.District) popup += `<br><b>Địa điểm:</b> ${(p.Commune || '') + (p.District ? ', ' + p.District : '')}`;
        popup += `<br><b>Tọa độ:</b> ${p.X || ''}, ${p.Y || ''}`;
        ["2020", "2022", "2023"].forEach(y => {
          let val = p[`T10_${y}_`] || p[`T11_${y}_`] || p[`T10.${y}`] || p[`T11.${y}`] || p[`'T10.${y}'`] || p[`'T11.${y}'`];
          if (val && !isNaN(val)) popup += `<br><b>Độ sâu ${y}:</b> ${parseFloat(val).toFixed(2)} m`;
        });
        l.bindPopup(popup);
      }
    });
    layerMapping[idKey] = layer;
  });
}
addFloodLayer("2020", "orange", "flood2020");
addFloodLayer("2022", "gold", "flood2022");
addFloodLayer("2023", "limegreen", "flood2023");

// Trạm đo theo icon
const stationIcons = {
  "Tháp báo lũ": L.icon({ iconUrl: 'icons/ruler_black.svg', iconSize: [28, 28] }),
  "Tháp báo ngập": L.icon({ iconUrl: 'icons/ruler_brown.svg', iconSize: [28, 28] }),
  "Trạm đo H tự động": L.icon({ iconUrl: 'icons/ruler_blue.svg', iconSize: [28, 28] })
};

fetch("Station.geojson").then(res => res.json()).then(data => {
  Object.entries(stationIcons).forEach(([type, icon]) => {
    const layer = L.geoJSON(data, {
      filter: f => f.properties.Type === type,
      pointToLayer: (f, latlng) => L.marker(latlng, { icon }),
      onEachFeature: (f, l) => {
        const p = f.properties;
        l.bindPopup(`<b>${p.Name2 || p.Name || ''}</b><br><b>Loại:</b> ${p.Type}<br><b>Tọa độ:</b> ${p.X || ''}, ${p.Y || ''}`);
      }
    });
    const key = icon.options.iconUrl.split('/').pop().replace('.svg', '');
    layerMapping[key] = layer;
  });
});
