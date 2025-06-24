const currentPage = window.location.pathname.includes('detail') ? 'detail' : 'home';

function createNavBar() {
  const nav = document.createElement("div");
  nav.style = "position:fixed;top:60px;left:0;right:0;height:40px;background:#0074D9;color:#fff;display:flex;align-items:center;padding-left:15px;z-index:9999;font-family:Calibri;font-size:16px;gap:20px";
  nav.innerHTML = `
    <a href="index.html" style="color:white;text-decoration:none;font-weight:${currentPage === 'home' ? 'bold' : 'normal'}">Trang chủ</a>
    <a href="detail.html" style="color:white;text-decoration:none;font-weight:${currentPage === 'detail' ? 'bold' : 'normal'}">Dữ liệu chi tiết</a>
  `;
  document.body.appendChild(nav);
}
createNavBar();

if (currentPage === 'home') {
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
  window.switchBase = switchBase;

  const groupedOverlays = {
    "Lớp bản đồ nền": {
      "Ranh giới hành chính": {},
      "Giao thông": {},
      "Trạm quan trắc KTTV": {}
    },
    "Giám sát ngập lụt": {
      "Vết lũ": {},
      "Trạm đo": {}
    }
  };

  fetch("Ward_2025.geojson").then(res => res.json()).then(data => {
    const layer = L.geoJSON(data);
    groupedOverlays["Lớp bản đồ nền"]["Ranh giới hành chính"]["Ranh giới phường"] = layer;
  });

  fetch("Community.geojson").then(res => res.json()).then(data => {
    const layer = L.geoJSON(data);
    groupedOverlays["Lớp bản đồ nền"]["Ranh giới hành chính"]["Ranh giới cộng đồng"] = layer;
  });

  fetch("Do_xe.geojson").then(res => res.json()).then(data => {
    const roadTypes = {};
    data.features.forEach(f => {
      const type = f.properties.RoadType || "Khác";
      if (!roadTypes[type]) roadTypes[type] = [];
      roadTypes[type].push(f);
    });
    Object.entries(roadTypes).forEach(([type, features]) => {
      const layer = L.geoJSON({ type: 'FeatureCollection', features });
      groupedOverlays["Lớp bản đồ nền"]["Giao thông"][`Đỗ xe - ${type}`] = layer;
    });
  });

  fetch("Vrain.geojson").then(res => res.json()).then(data => {
    const layer = L.geoJSON(data, {
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Ten || ''}</b>`)
    });
    groupedOverlays["Lớp bản đồ nền"]["Trạm quan trắc KTTV"]["Trạm đo mưa"] = layer;
  });

  function addFloodLayer(year, color) {
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
          ['2020', '2022', '2023'].forEach(y => {
            let val = p[`T10_${y}_`] || p[`T11_${y}_`] || p[`T10_${y}`] || p[`T11_${y}`] || p[`T10.${y}`] || p[`T11.${y}`] || p[`'T10.${y}'`] || p[`'T11.${y}'`];
            if (val && !isNaN(val)) popup += `<br><b>Độ sâu ${y}:</b> ${parseFloat(val).toFixed(2)} m`;
          });
          l.bindPopup(popup);
        }
      });
      groupedOverlays["Giám sát ngập lụt"]["Vết lũ"][`Năm ${year}`] = layer;
    });
  }
  addFloodLayer('2020', 'orange');
  addFloodLayer('2022', 'gold');
  addFloodLayer('2023', 'limegreen');

  const stationIcons = {
    "Tháp báo lũ": L.icon({ iconUrl: 'icons/ruler_black.svg', iconSize: [28, 28] }),
    "Tháp báo ngập": L.icon({ iconUrl: 'icons/ruler_brown.svg', iconSize: [28, 28] }),
    "Trạm đo H tự động": L.icon({ iconUrl: 'icons/ruler_blue.svg', iconSize: [28, 28] })
  };
  const displayName = {
    "Tháp báo lũ": "Tháp báo lũ",
    "Tháp báo ngập": "Tháp cảnh báo ngập",
    "Trạm đo H tự động": "Trạm đo mực nước tự động"
  };

  fetch("Station.geojson").then(res => res.json()).then(data => {
    Object.keys(stationIcons).forEach(type => {
      const layer = L.geoJSON(data, {
        filter: f => f.properties.Type === type,
        pointToLayer: (f, latlng) => L.marker(latlng, { icon: stationIcons[type] }),
        onEachFeature: (f, l) => {
          const p = f.properties;
          l.bindPopup(`<b>${p.Name2 || p.Name || ''}</b><br><b>Loại:</b> ${p.Type}<br><b>Tọa độ:</b> ${p.X || ''}, ${p.Y || ''}`);
        }
      });
      const iconHtml = `<img src='${stationIcons[type].options.iconUrl}' width='28' style='vertical-align:middle;margin-right:6px;'>`;
      groupedOverlays["Giám sát ngập lụt"]["Trạm đo"][`${iconHtml} ${displayName[type]}`] = layer;
    });
  });

  setTimeout(() => {
    L.control.groupedLayers({}, groupedOverlays, {
      collapsed: false,
      position: "topleft"
    }).addTo(map);
  }, 1500);

  map.on("zoomend", () => {
    const z = Math.max(2.5, map.getZoom() / 2.2);
    Object.values(groupedOverlays["Giám sát ngập lụt"]["Vết lũ"]).forEach(layer => {
      layer.eachLayer(l => { if (l.setRadius) l.setRadius(z); });
    });
  });
}

if (currentPage === 'detail') {
  const tableDiv = document.createElement("div");
  tableDiv.style = "padding:90px 20px 20px;font-family:Calibri";
  tableDiv.innerHTML = '<h2>Bảng dữ liệu vết lũ</h2><div id="table"></div>';
  document.body.appendChild(tableDiv);

  fetch("Flood_trace_all.geojson").then(res => res.json()).then(data => {
    const container = document.getElementById("table");
    const headers = Object.keys(data.features[0].properties);
    let html = `<table border="1" cellspacing="0" cellpadding="6"><tr>` + headers.map(h => `<th>${h}</th>`).join("") + `</tr>`;
    data.features.forEach(f => {
      const p = f.properties;
      html += `<tr>` + headers.map(h => `<td>${p[h] !== undefined ? p[h] : ''}</td>`).join("") + `</tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
  });
}
