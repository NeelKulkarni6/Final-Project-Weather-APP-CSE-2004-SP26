'use strict';

const API = {

  /* ── 1. Open-Meteo Forecast ───────────────────────── */
  async fetchWeather(lat, lon) {
    const CURRENT = [
      'temperature_2m','relative_humidity_2m','apparent_temperature',
      'precipitation','weather_code','cloud_cover',
      'wind_speed_10m','wind_direction_10m','wind_gusts_10m',
      'surface_pressure','visibility','is_day','uv_index',
    ].join(',');

    const HOURLY = [
      'temperature_2m','apparent_temperature','weather_code',
      'precipitation_probability','precipitation',
      'wind_speed_10m','wind_gusts_10m','wind_direction_10m',
      'is_day','visibility','surface_pressure','cloud_cover',
      'relative_humidity_2m','uv_index',
    ].join(',');

    const DAILY = [
      'weather_code','temperature_2m_max','temperature_2m_min',
      'sunrise','sunset','uv_index_max',
      'precipitation_sum','precipitation_probability_max',
      'wind_speed_10m_max','wind_gusts_10m_max',
    ].join(',');

    const params = new URLSearchParams({
      latitude: lat, longitude: lon,
      current: CURRENT, hourly: HOURLY, daily: DAILY,
      forecast_days: 14, timezone: 'auto',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    return res.json();
  },

  /* ── 2. Open-Meteo Geocoding ─────────────────────── */
  async searchLocations(query) {
    if (!query || query.trim().length < 2) return [];
    const params = new URLSearchParams({ name:query.trim(), count:8, language:'en', format:'json' });
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  },

  /* ── 3. Open-Meteo Air Quality ───────────────────── */
  async fetchAirQuality(lat, lon) {
    const CUR = ['us_aqi','pm10','pm2_5','carbon_monoxide',
                 'nitrogen_dioxide','sulphur_dioxide','ozone','uv_index','dust'].join(',');
    const HRL = ['pm10','pm2_5','carbon_monoxide','nitrogen_dioxide',
                 'sulphur_dioxide','ozone','us_aqi','european_aqi','uv_index'].join(',');
    const params = new URLSearchParams({
      latitude:lat, longitude:lon, current:CUR, hourly:HRL, forecast_days:5, timezone:'auto',
    });
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
    if (!res.ok) throw new Error(`AQ API ${res.status}`);
    return res.json();
  },

  /* ── 4. Nominatim Reverse Geocoding ─────────────── */
  async reverseGeocode(lat, lon) {
    const params = new URLSearchParams({ lat, lon, format:'json', zoom:10, addressdetails:1 });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      { headers:{ 'Accept-Language':'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    return {
      name:    addr.city || addr.town || addr.village || addr.county || 'Unknown',
      state:   addr.state ?? '',
      country: addr.country_code?.toUpperCase() ?? '',
      lat: parseFloat(lat), lon: parseFloat(lon), timezone:'auto',
    };
  },

  /* ── 5. Wikipedia Location Image ─────────────────── */
  async fetchLocationImage(cityName) {
    if (!cityName) return null;

    // Build a list of attempts: some cities need specific Wikipedia article titles
    const WIKI_OVERRIDES = {
      'New York':      'New York City',
      'New York City': 'New York City',
      'London':        'London',
      'Washington':    'Washington, D.C.',
      'Kansas City':   'Kansas City, Missouri',
      'Portland':      'Portland, Oregon',
      'Springfield':   'Springfield, Illinois',
      'Columbus':      'Columbus, Ohio',
      'Charlotte':     'Charlotte, North Carolina',
      'Memphis':       'Memphis, Tennessee',
      'Jacksonville':  'Jacksonville, Florida',
    };

    const attempts = [
      WIKI_OVERRIDES[cityName] ?? cityName,
      cityName,
      cityName.split(',')[0].trim(),
    ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

    for (const title of attempts) {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers:{ 'Accept':'application/json; charset=utf-8' } }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const img = data.originalimage?.source || data.thumbnail?.source;
        if (img) return img;
      } catch (_) { continue; }
    }
    return null;
  },

  /* ── 6. Browser Geolocation ──────────────────────── */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        p  => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        err => reject(err),
        { timeout:10000, maximumAge:300000 }
      );
    });
  },
};
