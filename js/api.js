'use strict';

/**
 * API module — all external data fetching
 * APIs used:
 *  1. Open-Meteo Forecast         https://open-meteo.com
 *  2. Open-Meteo Geocoding        https://geocoding-api.open-meteo.com
 *  3. Open-Meteo Air Quality      https://air-quality-api.open-meteo.com
 *  4. Nominatim (OpenStreetMap)   https://nominatim.openstreetmap.org
 *  5. Wikipedia REST              https://en.wikipedia.org/api/rest_v1
 *  6. Browser Geolocation API     navigator.geolocation
 */
const API = {

  /* ── 1. Open-Meteo Weather Forecast ──────────────────── */
  async fetchWeather(lat, lon) {
    const CURRENT_VARS = [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
      'precipitation', 'weather_code', 'cloud_cover',
      'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
      'surface_pressure', 'visibility', 'is_day', 'uv_index',
    ].join(',');

    const HOURLY_VARS = [
      'temperature_2m', 'weather_code', 'precipitation_probability',
      'wind_speed_10m', 'is_day', 'visibility',
    ].join(',');

    const DAILY_VARS = [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'sunrise', 'sunset', 'uv_index_max',
      'precipitation_sum', 'precipitation_probability_max',
      'wind_speed_10m_max', 'wind_gusts_10m_max',
    ].join(',');

    const params = new URLSearchParams({
      latitude:      lat,
      longitude:     lon,
      current:       CURRENT_VARS,
      hourly:        HOURLY_VARS,
      daily:         DAILY_VARS,
      forecast_days: 14,
      timezone:      'auto',
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    return res.json();
  },

  /* ── 2. Open-Meteo Geocoding (city search) ────────────── */
  async searchLocations(query) {
    if (!query || query.trim().length < 2) return [];
    const params = new URLSearchParams({
      name:     query.trim(),
      count:    8,
      language: 'en',
      format:   'json',
    });
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  },

  /* ── 3. Open-Meteo Air Quality ─────────────────────────── */
  async fetchAirQuality(lat, lon) {
    const CURRENT_AQ = [
      'us_aqi', 'pm10', 'pm2_5', 'carbon_monoxide',
      'nitrogen_dioxide', 'sulphur_dioxide', 'ozone', 'uv_index', 'dust',
    ].join(',');

    const HOURLY_AQ = [
      'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide',
      'sulphur_dioxide', 'ozone', 'us_aqi', 'european_aqi', 'uv_index',
    ].join(',');

    const params = new URLSearchParams({
      latitude:      lat,
      longitude:     lon,
      current:       CURRENT_AQ,
      hourly:        HOURLY_AQ,
      forecast_days: 5,
      timezone:      'auto',
    });

    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`
    );
    if (!res.ok) throw new Error(`AQ API ${res.status}`);
    return res.json();
  },

  /* ── 4. Nominatim Reverse Geocoding ───────────────────── */
  async reverseGeocode(lat, lon) {
    const params = new URLSearchParams({
      lat:            lat,
      lon:            lon,
      format:         'json',
      zoom:           10,
      addressdetails: 1,
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    return {
      name:     addr.city || addr.town || addr.village || addr.county || 'Unknown',
      state:    addr.state ?? '',
      country:  addr.country_code?.toUpperCase() ?? '',
      lat:      parseFloat(lat),
      lon:      parseFloat(lon),
      timezone: 'auto',
    };
  },

  /* ── 5. Wikipedia Location Image ──────────────────────── */
  async fetchLocationImage(cityName) {
    if (!cityName) return null;
    const attempts = [
      cityName,
      cityName.split(',')[0].trim(),
    ];
    for (const title of attempts) {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { 'Accept': 'application/json; charset=utf-8' } }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const img = data.originalimage?.source || data.thumbnail?.source;
        if (img) return img;
      } catch (_) { continue; }
    }
    return null;
  },

  /* ── 6. Browser Geolocation ───────────────────────────── */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        err => reject(err),
        { timeout: 10000, maximumAge: 300000 }
      );
    });
  },
};
