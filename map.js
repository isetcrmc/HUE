
// map.js (bổ sung: icon tháp co giãn theo zoom)

const map = L.map('map', {
  zoomControl: false
}).setView([16.4637, 107.5909], 11);

const baseLayers = {
  "Default 🌐": L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" }),
  "Satellite 🛰️": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" })
};
baseLayers["Default 🌐"].addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

const overlays = {
  "Vết lũ": {},
  "Trạm đo": {}
};

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

let stationMarkers = [];

fetch("Station.geojson").then(res => res.json()).then(data => {
  const iconBaseSize = 30;
  const createIcon = (type, size) => {
    const icons = {
      "Tháp báo lũ 🏗️": 'sliders',
      "Trạm đo H tự động 💧": 'tint',
      "Tháp cảnh báo ngập ⚠️": 'exclamation-triangle'
    };
    const colors = {
      "Tháp báo lũ 🏗️": 'black',
      "Trạm đo H tự động 💧": 'blue',
      "Tháp cảnh báo ngập ⚠️": 'brown'
    };
    return L.AwesomeMarkers.icon({
      icon: icons[type],
      prefix: 'fa',
      markerColor: colors[type],
      iconColor: 'white',
      extraClasses: 'fa-fw',
      iconSize: [size, size]
    });
  };

  const types = ["Tháp báo lũ 🏗️", "Trạm đo H tự động 💧", "Tháp cảnh báo ngập ⚠️"];
  types.forEach(type => {
    const layer = L.geoJSON(data, {
      filter: f => type.includes(f.properties.Type),
      pointToLayer: (f, latlng) => {
        const marker = L.marker(latlng, {
          icon: createIcon(type, iconBaseSize),
          riseOnHover: true
        });
        marker._customType = type;
        stationMarkers.push(marker);
        return marker;
      },
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

// Gắn lại grouped layer control
L.control.groupedLayers(baseLayers, overlays, {
  collapsed: false,
  position: "topleft"
}).addTo(map);

// Cập nhật kích thước vết lũ & icon trạm khi zoom
map.on("zoomend", () => {
  const z = map.getZoom();
  const newRadius = Math.max(2, z / 2.5);
  Object.values(overlays["Vết lũ"]).forEach(layer => {
    if (layer.setStyle) layer.setStyle({ radius: newRadius });
  });

  // Resize icon trạm đo
  stationMarkers.forEach(m => {
    const size = Math.max(20, z * 2.2);
    m.setIcon(L.AwesomeMarkers.icon({
      icon: m.options.icon.options.icon,
      prefix: 'fa',
      markerColor: m.options.icon.options.markerColor,
      iconColor: 'white'
    }));
  });
});
