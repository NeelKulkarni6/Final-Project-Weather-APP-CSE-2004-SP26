'use strict';

/* ─── Unit conversions ──────────────────────────────────── */
const cToF  = c => Math.round(c * 9 / 5 + 32);
const fToC  = f => Math.round((f - 32) * 5 / 9);
const convertTemp = (celsius, unit) => unit === 'F' ? cToF(celsius) : Math.round(celsius);
const kmhToMph    = kmh => Math.round(kmh * 0.621371);
const metersToMiles = m => {
  const mi = m / 1609.34;
  return mi >= 10 ? '10+' : mi.toFixed(1);
};
const hpaToInHg = hpa => (hpa * 0.02953).toFixed(2);

/* ─── Wind direction ────────────────────────────────────── */
const CARDINALS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const degreesToCardinal = deg => CARDINALS[Math.round(deg / 22.5) % 16];

/* ─── Time helpers ──────────────────────────────────────── */
function formatHour(isoStr, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    hour:   'numeric',
    hour12: true,
    timeZone: timezone,
  }).format(new Date(isoStr));
}

function formatSunTime(isoStr, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone ?? 'UTC',
  }).format(new Date(isoStr));
}

function formatDayShort(isoDateStr, timezone) {
  // isoDateStr is "YYYY-MM-DD"
  const [y, m, d] = isoDateStr.split('-').map(Number);
  // Build a date at noon to avoid timezone-off-by-one
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const nowInTz = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: timezone,
  }).format(new Date());

  const dateInTz = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: timezone,
  }).format(date);

  if (dateInTz === nowInTz) return 'Today';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  }).format(date);
}

/** Find the hourly array index matching the current local hour at the location */
function getCurrentHourIndex(times, timezone) {
  const now    = new Date();
  const parts  = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});

  const hr  = parts.hour === '24' ? '00' : parts.hour;
  const key = `${parts.year}-${parts.month}-${parts.day}T${hr}:00`;
  const idx = times.indexOf(key);
  return idx >= 0 ? idx : 0;
}

/* ─── Descriptive labels ────────────────────────────────── */
function uvDescription(uv) {
  if (uv <= 2)  return { label: 'Low',       color: '#4CAF50' };
  if (uv <= 5)  return { label: 'Moderate',  color: '#CDDC39' };
  if (uv <= 7)  return { label: 'High',      color: '#FF9800' };
  if (uv <= 10) return { label: 'Very High', color: '#F44336' };
  return              { label: 'Extreme',   color: '#9C27B0' };
}

function aqiCategory(aqi) {
  if (aqi <= 50)  return { label: 'Good',                        color: '#4CAF50' };
  if (aqi <= 100) return { label: 'Moderate',                    color: '#CDDC39' };
  if (aqi <= 150) return { label: 'Sensitive Groups',            color: '#FF9800' };
  if (aqi <= 200) return { label: 'Unhealthy',                   color: '#F44336' };
  if (aqi <= 300) return { label: 'Very Unhealthy',              color: '#9C27B0' };
  return               { label: 'Hazardous',                    color: '#7B1FA2' };
}

function humidityDescription(h) {
  if (h < 25)  return 'Very dry';
  if (h < 45)  return 'Dry';
  if (h < 60)  return 'Comfortable';
  if (h < 75)  return 'Humid';
  return 'Very humid';
}

function visibilityDescription(meters) {
  const mi = meters / 1609.34;
  if (mi >= 10) return 'Excellent';
  if (mi >= 6)  return 'Good';
  if (mi >= 3)  return 'Moderate';
  if (mi >= 1)  return 'Poor';
  return 'Very poor';
}

function pressureDescription(hpa) {
  if (hpa >= 1022) return 'High · Clear';
  if (hpa >= 1009) return 'Normal';
  if (hpa >= 1000) return 'Slightly low';
  return 'Low · Unsettled';
}

function feelsLikeDescription(apparent, actual) {
  const diff = apparent - actual;
  if (Math.abs(diff) <= 1) return 'Feels like the actual temperature.';
  if (diff > 5)  return 'Humidity is making it feel much warmer.';
  if (diff > 0)  return 'Humidity is making it feel warmer.';
  if (diff < -5) return 'Wind is making it feel much colder.';
  return 'Wind is making it feel cooler.';
}

function windDescription(kmh) {
  const mph = kmhToMph(kmh);
  if (mph < 1)  return 'Calm';
  if (mph < 8)  return 'Light breeze';
  if (mph < 18) return 'Gentle breeze';
  if (mph < 28) return 'Moderate wind';
  if (mph < 38) return 'Fresh wind';
  if (mph < 55) return 'Strong wind';
  return 'Storm force';
}

/* ─── SVG geometry helpers ──────────────────────────────── */

/**
 * Returns (x, y) position of the sun on the arc for a given time
 * Arc is a semicircle: center(80, 75), radius 65
 * Spans from (15,75) [left] to (145,75) [right]
 */
function getSunPosition(sunriseIso, sunsetIso) {
  const now  = Date.now();
  const rise = new Date(sunriseIso).getTime();
  const set  = new Date(sunsetIso).getTime();
  const p    = Math.max(0, Math.min(1, (now - rise) / (set - rise)));
  const cx = 80, cy = 75, r = 65;
  const angle = Math.PI * (1 - p); // π → 0
  return {
    x:        cx + r * Math.cos(angle),
    y:        cy - r * Math.sin(angle), // minus because SVG y increases downward
    progress: p,
  };
}

/**
 * Builds the SVG "d" attribute for the progress arc
 */
function buildSunArcPath(progress) {
  if (progress <= 0) return '';
  const cx = 80, cy = 75, r = 65;
  const angle = Math.PI * (1 - progress);
  const ex = cx + r * Math.cos(angle);
  const ey = cy - r * Math.sin(angle);
  const largeArc = progress > 0.5 ? 1 : 0;
  return `M 15 75 A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

/**
 * Returns (x, y) for the UV gauge indicator dot
 * Semicircle: center(60,60), radius 50, spans (10,60) to (110,60)
 */
function getUVPosition(uvIndex) {
  const p     = Math.min(uvIndex / 11, 1);
  const cx = 60, cy = 60, r = 50;
  const angle = Math.PI * (1 - p);
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
    p,
  };
}

/* ─── localStorage helpers ──────────────────────────────── */
const LS = {
  LOCATION: 'aura_location',
  UNIT:     'aura_unit',
  SAVED:    'aura_saved',
  CACHE:    'aura_weather_cache',
};

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch (_) { return fallback; }
}
