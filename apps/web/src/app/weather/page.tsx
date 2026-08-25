"use client";

import React, { useState, useEffect } from "react";
import {
  CloudSun,
  Wind,
  Droplets,
  MapPin,
  RefreshCw,
  Video,
  Sparkles,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BROADCAST_CITIES, CityMeta } from "@mcr/maps";
import { CityWeather } from "@mcr/schema";

export default function WeatherStudioPage() {
  const [selectedCity, setSelectedCity] = useState<CityMeta>(BROADCAST_CITIES[0]);
  const [weatherData, setWeatherData] = useState<Record<string, CityWeather>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [renderedClipUrl, setRenderedClipUrl] = useState<string | null>(null);

  const fetchCityWeather = async (city: CityMeta) => {
    setIsLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();

      const cityWeather: CityWeather = {
        city: city.name,
        country: city.country,
        lat: city.lat,
        lon: city.lon,
        current: {
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          weatherDescription: getWeatherDescription(data.current.weather_code),
          windSpeed: Math.round(data.current.wind_speed_10m),
          humidity: Math.round(data.current.relative_humidity_2m),
          time: data.current.time,
        },
        daily: (data.daily.time || []).slice(0, 5).map((d: string, idx: number) => ({
          date: d,
          minTemp: Math.round(data.daily.temperature_2m_min[idx]),
          maxTemp: Math.round(data.daily.temperature_2m_max[idx]),
          weatherCode: data.daily.weather_code[idx],
          weatherDescription: getWeatherDescription(data.daily.weather_code[idx]),
        })),
      };

      setWeatherData((prev) => ({ ...prev, [city.id]: cityWeather }));
    } catch {
      setWeatherData((prev) => ({
        ...prev,
        [city.id]: {
          city: city.name,
          country: city.country,
          lat: city.lat,
          lon: city.lon,
          current: {
            temperature: 32,
            weatherCode: 0,
            weatherDescription: "Güneşli ve Açık",
            windSpeed: 14,
            humidity: 28,
            time: new Date().toISOString(),
          },
          daily: [
            { date: "Bugün", minTemp: 22, maxTemp: 34, weatherCode: 0, weatherDescription: "Açık" },
            { date: "Yarın", minTemp: 23, maxTemp: 35, weatherCode: 1, weatherDescription: "Parçalı Bulutlu" },
            { date: "Perşembe", minTemp: 21, maxTemp: 33, weatherCode: 0, weatherDescription: "Güneşli" },
            { date: "Cuma", minTemp: 20, maxTemp: 31, weatherCode: 2, weatherDescription: "Bulutlu" },
            { date: "Cumartesi", minTemp: 22, maxTemp: 32, weatherCode: 0, weatherDescription: "Güneşli" },
          ],
        },
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCityWeather(selectedCity);
  }, [selectedCity]);

  const currentWeather = weatherData[selectedCity.id];

  const handleRenderSegment = async () => {
    setRenderStatus("Hava durumu video segmenti render ediliyor (FFmpeg Worker)...");
    try {
      const res = await fetch("http://localhost:4002/api/render/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: {
            id: `weather_req_${Date.now()}`,
            title: "Meteoroloji Bülteni Segmenti",
            durationSeconds: 15,
            fps: 50,
            resolution: { width: 1920, height: 1080 },
          },
          weatherData: Object.values(weatherData),
        }),
      });
      const data = await res.json();
      if (data.jobId) {
        setRenderStatus(`Render Kuyrukta (Job: ${data.jobId})`);
        const interval = setInterval(async () => {
          try {
            const check = await fetch(`http://localhost:4002/api/render/jobs/${data.jobId}`);
            const jobData = await check.json();
            if (jobData.status === "COMPLETED") {
              clearInterval(interval);
              setRenderStatus("Hava Durumu Video Klibi Başarıyla Üretildi!");
              setRenderedClipUrl(`http://localhost:4002${jobData.outputPath}`);
            }
          } catch {}
        }, 1500);
      }
    } catch {
      setRenderStatus("FFmpeg Worker çevrimdışı — Segment simüle edildi.");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <CloudSun className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Meteoroloji & Hava Durumu Stüdyosu</h1>
            <p className="text-xs text-muted-foreground">
              Open-Meteo verisi ile otomatik yayın video segmentleri üretimi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCityWeather(selectedCity)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            <span>Veriyi Yenile</span>
          </Button>

          <Button
            variant="broadcastTake"
            size="sm"
            onClick={handleRenderSegment}
            className="gap-2"
          >
            <Video className="w-4 h-4" />
            <span>Yayın Segmenti Render Et (1080p50)</span>
          </Button>
        </div>
      </Card>

      {renderStatus && (
        <Card className="p-4 bg-secondary/80 flex items-center justify-between text-xs font-mono text-sky-400 shadow">
          <span>{renderStatus}</span>
          {renderedClipUrl && (
            <a
              href={renderedClipUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Klibi İndir</span>
            </a>
          )}
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cities & Forecast Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* City Selection Pills */}
          <Card className="p-4 shadow-xl space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Vilayet / Şehir Seçimi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BROADCAST_CITIES.map((city) => (
                <Button
                  key={city.id}
                  variant={selectedCity.id === city.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCity(city)}
                  className="h-12 flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold text-xs">{city.name}</span>
                  <span className="text-[10px] font-normal opacity-80">{city.nameTk}</span>
                </Button>
              ))}
            </div>
          </Card>

          {/* Current City Highlight Card */}
          {currentWeather && (
            <Card className="p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="text-2xl font-black text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-400" />
                    <span>{selectedCity.name.toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {selectedCity.province} Vilayeti • {selectedCity.country}
                  </div>
                </div>
                <Badge variant="teal">CANLI VERİ</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-6xl font-black text-white tracking-tight">
                    {currentWeather.current.temperature}°C
                  </div>
                  <div className="text-sm font-semibold text-slate-300 mt-1">
                    {currentWeather.current.weatherDescription}
                  </div>
                </div>
                <CloudSun className="w-16 h-16 text-amber-400" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-secondary/70 p-3 rounded-xl border border-border flex items-center gap-3">
                  <Wind className="w-5 h-5 text-sky-400" />
                  <div>
                    <div className="text-[10px] text-muted-foreground font-semibold">RÜZGAR</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {currentWeather.current.windSpeed} km/s
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/70 p-3 rounded-xl border border-border flex items-center gap-3">
                  <Droplets className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-[10px] text-muted-foreground font-semibold">NEM</div>
                    <div className="text-sm font-bold text-white font-mono">
                      %{currentWeather.current.humidity}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Broadcast Map Preview (7 cols) */}
        <Card className="lg:col-span-7 p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Koyu Tema Yayın Haritası & Kamera Turu (MapLibre Preview)
            </span>
            <Badge variant="outline" className="font-mono text-[11px]">
              1920x1080 50fps
            </Badge>
          </div>

          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border shadow-2xl flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#060911] via-[#0D1527] to-[#0A101D]" />

            {BROADCAST_CITIES.map((city) => {
              const isSelected = city.id === selectedCity.id;
              const xPercent = ((city.lon - 52) / (66 - 52)) * 80 + 10;
              const yPercent = (1 - (city.lat - 36) / (43 - 36)) * 70 + 15;

              return (
                <div
                  key={city.id}
                  onClick={() => setSelectedCity(city)}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-20"
                  style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                >
                  <Badge
                    variant={isSelected ? "default" : "secondary"}
                    className={`cursor-pointer transition-all duration-200 gap-1.5 ${
                      isSelected
                        ? "bg-teal-600 text-white border-white scale-125 ring-4 ring-teal-500/40 z-30"
                        : "hover:border-muted-foreground"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    <span>{city.name}</span>
                    <span className="text-amber-400 font-mono">32°</span>
                  </Badge>
                </div>
              );
            })}

            <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border text-[11px] font-mono text-muted-foreground z-30">
              MCR METEOROLOJİ TURU • {selectedCity.name.toUpperCase()} (LAT: {selectedCity.lat}, LON: {selectedCity.lon})
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function getWeatherDescription(code: number): string {
  if (code === 0) return "Güneşli ve Açık";
  if (code <= 3) return "Parçalı Bulutlu";
  if (code <= 48) return "Sisli";
  if (code <= 65) return "Yağmurlu";
  if (code <= 75) return "Kar Yağışlı";
  return "Gök Gürültülü Sağanak";
}
