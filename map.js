// map.js - nâng cấp logic & giao diện đầy đủ

const map = L.map('map', {
  zoomControl: false
}).setView([16.4637, 107.5909], 11);

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

const overlays = { "Vết lũ": {}, "Trạm đo": {} };

// ICON tùy chỉnh dạng thước kẻ SVG (tăng kích thước icon)
const stationIcons = {
  "Tháp báo lũ": L.icon({ iconUrl: 'icons/ruler_black.svg', iconSize: [28, 28] }),
  "Tháp cảnh báo ngập": L.icon({ iconUrl: 'icons/ruler_brown.svg', iconSize: [28, 28] }),
  "Trạm đo mực nước tự động": L.icon({ iconUrl: 'icons/ruler_blue.svg', iconSize: [28, 28] })
};

function addFloodLayer(year, color) {
  fetch("Flood_trace_all.geojson").then(res => res.json()).then(data => {
    const layer = L.geoJSON(data, {
      filter: f => f.properties[`VL${year}`],
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: 3.5,
        fillColor: color,
        color: "#333",
        weight: 0.5,
        fillOpacity: 0.75,
        className: 'flood-point'
      }),
      onEachFeature: (f, l) => {
        let p = f.properties;
        let popup = `<b>Tên vết lũ:</b> ${p.Name || ''}<br><b>ID:</b> ${p.ID || ''}<br><b>Code:</b> ${p.Code || ''}`;
        if (p.Commune || p.District) {
          popup += `<br><b>Địa điểm:</b> ${(p.Commune || '') + (p.District ? ', ' + p.District : '')}`;
        }
        popup += `<br><b>Tọa độ:</b> ${p.X}, ${p.Y}`;

        ['2020', '2022', '2023'].forEach(y => {
          let val = p[`T10_${y}`] || p[`T11_${y}`] || p[`T10.${y}`] || p[`T11.${y}`] || p[`'T10.${y}'`] || p[`'T11.${y}'`];
          if (val && !isNaN(val)) {
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

fetch("Station.geojson").then(res => res.json()).then(data => {
  const types = Object.keys(stationIcons);
  types.forEach(type => {
    const iconHtml = `<img src='${stationIcons[type].options.iconUrl}' width='34' style='vertical-align:middle;margin-right:6px;'>`;
    const layer = L.geoJSON(data, {
      filter: f => f.properties.Type === type,
      pointToLayer: (f, latlng) => L.marker(latlng, {
        icon: stationIcons[type]
      }),
      onEachFeature: (f, l) => {
        const p = f.properties;
        let popup = `<b>${p.Name2 || p.Name || ''}</b><br><b>Loại:</b> ${p.Type}`;
        if (p.Commune || p.District) {
          popup += `<br><b>Địa điểm:</b> ${(p.Commune || '') + (p.District ? ', ' + p.District : '')}`;
        }
        popup += `<br><b>Tọa độ:</b> ${p.X}, ${p.Y}`;
        l.bindPopup(popup);
      }
    });
    overlays["Trạm đo"][`${iconHtml} ${type}`] = layer;
    layer.addTo(map);
  });
});

setTimeout(() => {
  if (L.control.groupedLayers) {
    L.control.groupedLayers({}, overlays, {
      collapsed: false,
      position: "topleft"
    }).addTo(map);
  } else {
    console.warn("Thiếu thư viện groupedLayers");
  }
}, 1000);

map.on("zoomend", () => {
  const z = Math.max(2.5, map.getZoom() / 2.2);
  Object.values(overlays["Vết lũ"]).forEach(layer => {
    layer.eachLayer(l => {
      if (l.setRadius) l.setRadius(z);
    });
  });
});
