// Khởi tạo bản đồ
const map = L.map('map', { zoomControl: false }).setView([16.4637, 107.5909], 11);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Bản đồ nền
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

// Lưu trữ các lớp
const layerMapping = {};
window.layerMapping = layerMapping;

const promises = [];

// Ranh giới hành chính (phường)
promises.push(
  fetch("Ward_2025.geojson").then(res => res.json()).then(data => {
    layerMapping["ward"] = L.geoJSON(data, {
      style: { color: '#1E90FF', weight: 1.2, fillOpacity: 0 },
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Name || ''}</b>`)
    });
  })
);

// Ranh giới cộng đồng
promises.push(
  fetch("Community.geojson").then(res => res.json()).then(data => {
    layerMapping["community"] = L.geoJSON(data, {
      style: { color: '#FF8C00', weight: 1.2, fillOpacity: 0 },
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Name || ''}</b>`)
    });
  })
);

// Đỗ xe tránh ngập
promises.push(
  fetch("Do_xe.geojson").then(res => res.json()).then(data => {
    const fc1 = data.features.filter(f => f.properties.RoadType === "1 chiều");
    const fc2 = data.features.filter(f => f.properties.RoadType === "2 chiều");
    layerMapping["do_xe_1"] = L.geoJSON({ type: 'FeatureCollection', features: fc1 });
    layerMapping["do_xe_2"] = L.geoJSON({ type: 'FeatureCollection', features: fc2 });
  })
);

// Trạm đo mưa (Vrain)
promises.push(
  fetch("Vrain.geojson").then(res => res.json()).then(data => {
    const smallIcon = L.icon({ iconUrl: 'icons/rain.svg', iconSize: [14, 14] });
    layerMapping["vrain"] = L.geoJSON(data, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: smallIcon }),
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Ten || ''}</b>`)
    });
  })
);

// Vết lũ
["2020", "2022", "2023"].forEach((year, idx) => {
  const colors = ["orange", "gold", "limegreen"];
  const idKey = `flood${year}`;
  promises.push(
    fetch("Flood_trace_all.geojson").then(res => res.json()).then(data => {
      const layer = L.geoJSON(data, {
        filter: f => f.properties[`VL${year}`],
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 3.5,
          fillColor: colors[idx],
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
    })
  );
});

// Trạm đo các loại
const stationIcons = {
  "Tháp báo lũ": L.icon({ iconUrl: 'icons/ruler_black.svg', iconSize: [28, 28] }),
  "Tháp cảnh báo ngập": L.icon({ iconUrl: 'icons/ruler_brown.svg', iconSize: [28, 28] }),
  "Trạm đo H tự động": L.icon({ iconUrl: 'icons/ruler_blue.svg', iconSize: [28, 28] })
};

promises.push(
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
  })
);

Promise.all(promises).then(() => {
  const groupedOverlays = {
    "Lớp bản đồ nền": {
      "Ranh giới hành chính": layerMapping.ward,
      "Ranh giới phường": layerMapping.ward,
      "Ranh giới cộng đồng": layerMapping.community
    },
    "Đỗ xe tránh ngập": {
      "Đỗ xe 1 chiều": layerMapping.do_xe_1,
      "Đỗ xe 2 chiều": layerMapping.do_xe_2
    },
    "Trạm quan trắc KTTV": {
      "Trạm đo mưa": layerMapping.vrain
    },
    "Giám sát ngập lụt": {
      "Vết lũ": {
        "Năm 2020": layerMapping.flood2020,
        "Năm 2022": layerMapping.flood2022,
        "Năm 2023": layerMapping.flood2023
      },
      "Trạm đo": {
        "Tháp báo lũ": layerMapping.ruler_black,
        "Tháp cảnh báo ngập": layerMapping.ruler_brown,
        "Trạm đo mực nước tự động": layerMapping.ruler_blue
      }
    }
  };

  L.control.groupedLayers(null, groupedOverlays, {
    exclusiveGroups: [],
    collapsed: false
  }).addTo(map);
});
