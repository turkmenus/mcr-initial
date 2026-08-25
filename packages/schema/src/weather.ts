import { z } from "zod";

/**
 * City Weather Data
 */
export const CityWeatherSchema = z.object({
  city: z.string(),
  country: z.string().default("Türkmenistan"),
  lat: z.number(),
  lon: z.number(),
  current: z.object({
    temperature: z.number(),
    weatherCode: z.number(),
    weatherDescription: z.string(),
    windSpeed: z.number(),
    humidity: z.number(),
    time: z.string(),
  }),
  daily: z.array(z.object({
    date: z.string(),
    minTemp: z.number(),
    maxTemp: z.number(),
    weatherCode: z.number(),
    weatherDescription: z.string(),
  })).default([]),
});

export type CityWeather = z.infer<typeof CityWeatherSchema>;

/**
 * Weather Segment Render Request
 */
export const WeatherSegmentRequestSchema = z.object({
  id: z.string(),
  title: z.string().default("Hava Durumu Bülteni"),
  theme: z.enum(["dark-broadcast", "light-broadcast", "high-contrast"]).default("dark-broadcast"),
  locations: z.array(z.string()).default(["Aşkabat", "Türkmenabat", "Daşoguz", "Mary", "Balkanabat"]),
  durationSeconds: z.number().default(18),
  fps: z.number().default(50),
  resolution: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
  }).default({ width: 1920, height: 1080 }),
  cameraTour: z.enum(["national-tour", "capital-focus", "regional-grid"]).default("national-tour"),
});

export type WeatherSegmentRequest = z.infer<typeof WeatherSegmentRequestSchema>;
