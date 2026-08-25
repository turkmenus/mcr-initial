/**
 * MapLibre Broadcast Dark Style definition
 */
export const BROADCAST_DARK_STYLE = {
  version: 8,
  name: "MCR Broadcast Dark",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#0B0F19",
      },
    },
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.4,
        "raster-contrast": 0.2,
        "raster-saturation": -0.8,
      },
    },
  ],
};
