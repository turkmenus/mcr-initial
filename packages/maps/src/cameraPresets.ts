export interface CameraKeyframe {
  timePercent: number; // 0..1
  center: [number, number]; // [lon, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface CameraPreset {
  id: string;
  name: string;
  durationSeconds: number;
  keyframes: CameraKeyframe[];
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  "national-tour": {
    id: "national-tour",
    name: "Ülke Genel Turu (Batıdan Doğuya)",
    durationSeconds: 18,
    keyframes: [
      { timePercent: 0.0, center: [52.96, 40.01], zoom: 6.5, pitch: 30, bearing: -10 }, // Turkmenbashi
      { timePercent: 0.25, center: [54.36, 39.51], zoom: 7.0, pitch: 35, bearing: 0 },  // Balkanabat
      { timePercent: 0.50, center: [58.38, 37.95], zoom: 7.5, pitch: 40, bearing: 10 }, // Ashgabat
      { timePercent: 0.75, center: [61.83, 37.60], zoom: 7.0, pitch: 35, bearing: 15 }, // Mary
      { timePercent: 1.0, center: [63.56, 39.08], zoom: 7.0, pitch: 30, bearing: 0 },   // Turkmenabat
    ],
  },
  "capital-focus": {
    id: "capital-focus",
    name: "Başkent ve Çevresi",
    durationSeconds: 10,
    keyframes: [
      { timePercent: 0.0, center: [58.38, 37.95], zoom: 6.5, pitch: 20, bearing: 0 },
      { timePercent: 1.0, center: [58.38, 37.95], zoom: 9.0, pitch: 45, bearing: 30 },
    ],
  },
};
