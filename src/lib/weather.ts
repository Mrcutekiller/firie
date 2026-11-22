import type { WeatherSnapshot } from "./types";

/**
 * Weather provider.
 *
 * Uses Open-Meteo (a free third-party weather service, no API key required)
 * for geocoding + current conditions. Falls back to a deterministic local
 * estimate when the device is offline so Pro recommendations still work.
 */

const WEATHER_CODES: Record<number, { condition: string; icon: string }> = {
  0: { condition: "Clear sky", icon: "☀️" },
  1: { condition: "Mainly clear", icon: "🌤️" },
  2: { condition: "Partly cloudy", icon: "⛅" },
  3: { condition: "Overcast", icon: "☁️" },
  45: { condition: "Fog", icon: "🌫️" },
  48: { condition: "Rime fog", icon: "🌫️" },
  51: { condition: "Light drizzle", icon: "🌦️" },
  53: { condition: "Drizzle", icon: "🌦️" },
  55: { condition: "Dense drizzle", icon: "🌧️" },
  61: { condition: "Light rain", icon: "🌦️" },
  63: { condition: "Rain", icon: "🌧️" },
  65: { condition: "Heavy rain", icon: "🌧️" },
  71: { condition: "Light snow", icon: "🌨️" },
  73: { condition: "Snow", icon: "❄️" },
  75: { condition: "Heavy snow", icon: "❄️" },
  80: { condition: "Rain showers", icon: "🌦️" },
  81: { condition: "Rain showers", icon: "🌧️" },
  82: { condition: "Violent showers", icon: "⛈️" },
  95: { condition: "Thunderstorm", icon: "⛈️" },
  96: { condition: "Thunderstorm", icon: "⛈️" },
  99: { condition: "Thunderstorm", icon: "⛈️" },
};

const PRESET_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  "addis ababa": { lat: 9.03, lon: 38.74, name: "Addis Ababa" },
  "bole, addis ababa": { lat: 8.99, lon: 38.78, name: "Bole, Addis Ababa" },
  "kazanchis, addis ababa": { lat: 9.01, lon: 38.77, name: "Kazanchis, Addis Ababa" },
  "piazza, addis ababa": { lat: 9.03, lon: 38.75, name: "Piazza, Addis Ababa" },
  "sarbet, addis ababa": { lat: 9.00, lon: 38.73, name: "Sarbet, Addis Ababa" },
  "hawassa": { lat: 7.06, lon: 38.48, name: "Hawassa" },
  "dire dawa": { lat: 9.60, lon: 41.86, name: "Dire Dawa" },
};

let cachedWeather: { place: string; data: WeatherSnapshot; expires: number } | null = null;

async function geocode(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const norm = city.trim().toLowerCase();
  if (PRESET_COORDS[norm]) return PRESET_COORDS[norm];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Deterministic offline estimate from the date + city name. */
function fallbackWeather(city: string): WeatherSnapshot {
  const month = new Date().getMonth();
  const base = [22, 23, 24, 24, 22, 20, 19, 19, 21, 22, 22, 21][month];
  const jitter = (city.length % 5) - 2;
  return {
    city: city || "Addis Ababa",
    temperatureC: base + jitter,
    condition: month >= 5 && month <= 8 ? "Light rain" : "Sunny & clear",
    icon: month >= 5 && month <= 8 ? "🌦️" : "☀️",
    capturedAt: Date.now(),
  };
}

export async function getWeather(city: string): Promise<WeatherSnapshot> {
  const place = city?.trim() || "Addis Ababa";
  const now = Date.now();
  if (cachedWeather && cachedWeather.place === place && cachedWeather.expires > now) {
    return cachedWeather.data;
  }

  try {
    const geo = await geocode(place);
    if (!geo) {
      const fb = fallbackWeather(place);
      cachedWeather = { place, data: fb, expires: now + 600000 };
      return fb;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,weather_code,is_day`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();
    const temp = data?.current?.temperature_2m;
    const code = data?.current?.weather_code;
    const isDay = data?.current?.is_day ?? 1;
    let meta = WEATHER_CODES[code] ?? { condition: "Clear", icon: isDay ? "☀️" : "🌙" };
    if (!isDay && (code === 0 || code === 1)) {
      meta = { condition: "Clear night", icon: "🌙" };
    }
    if (typeof temp !== "number") throw new Error("Invalid temp");
    const snapshot: WeatherSnapshot = {
      city: geo.name,
      temperatureC: Math.round(temp),
      condition: meta.condition,
      icon: meta.icon,
      capturedAt: now,
    };
    cachedWeather = { place, data: snapshot, expires: now + 600000 }; // 10 min cache
    return snapshot;
  } catch {
    const fb = fallbackWeather(place);
    cachedWeather = { place, data: fb, expires: now + 300000 };
    return fb;
  }
}
