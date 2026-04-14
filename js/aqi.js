'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Air Quality Page Controller
   ════════════════════════════════════════════════════════ */

const ASTATE = {
  aq:       null,
  weather:  null,
  location: null,
  unit:     'F',
};

document.addEventListener('DOMContentLoaded', aqiInit);

async function aqiInit() {
  ASTATE.unit     = lsGet(LS.UNIT, 'F');
  ASTATE.location = lsGet(LS.LOCATION, {
    name: 'New York', state: 'NY', country: 'US',
    lat: 40.7128, lon: -74.006, timezone: 'America/New_York',
  });

  syncUnitToggleAQI();
  document.getElementById('unit-toggle').addEventListener('click', (e) => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === ASTATE.unit) return;
    ASTATE.unit = opt.dataset.unit;
    lsSet(LS.UNIT, ASTATE.unit);
    syncUnitToggleAQI();
  });

  const loc = ASTATE.location;
  const name = loc.name + (loc.state ? ', ' + loc.state : '');
  const cityEl = document.getElementById('page-city');
  if (cityEl) cityEl.textContent = name;

  showLoading();
  try {
    const [aq, weather] = await Promise.all([
      API.fetchAirQuality(loc.lat, loc.lon),
      API.fetchWeather(loc.lat, loc.lon),
    ]);
    ASTATE.aq      = aq;
    ASTATE.weather = weather;
    if (weather.timezone) ASTATE.location.timezone = weather.timezone;

    applyBgAQI();
    renderAQIHero();
    renderPollutants();
    renderUVBanner();
    renderAQIChart();
  } catch (err) {
    console.error(err);
    showToastAQI('Could not load air quality data', true);
  } finally {
    hideLoading();
  }
}

/* ── Background ──────────────────────────────────────── */
function applyBgAQI() {
  const c = ASTATE.weather.current;
  document.getElementById('weather-bg').className = getBgClass(c.weather_code, c.is_day);
}

/* ── AQI hero ring ───────────────────────────────────── */
function renderAQIHero() {
  const c   = ASTATE.aq.current;
  const aqi = Math.round(c.us_aqi ?? 0);
  const cat = aqiCategory(aqi);

  // Text
  setAQIText('aqi-number',   aqi);
  setAQIText('aqi-category', cat.label);
  setAQIText('aqi-guidance', getGuidance(aqi));

  // Ring arc: circumference of r=70 circle = 2π*70 ≈ 439.82
  const CIRC   = 2 * Math.PI * 70;
  const max    = 300;
  const pct    = Math.min(aqi / max, 1);
  const offset = CIRC * (1 - pct);

  const arc = document.getElementById('aqi-arc');
  if (arc) {
    // Animate via JS
    let start = null;
    const targetOffset = offset;
    const initialOffset = CIRC;
    const dur = 1500;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const e = ease(p);
      arc.style.strokeDashoffset = initialOffset - (initialOffset - targetOffset) * e;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    arc.style.stroke = cat.color;
  }
}

function getGuidance(aqi) {
  if (aqi <= 50)  return 'Air quality is satisfactory. Enjoy outdoor activities.';
  if (aqi <= 100) return 'Acceptable. Unusually sensitive individuals may want to limit prolonged outdoor exertion.';
  if (aqi <= 150) return 'Members of sensitive groups may experience health effects. Limit prolonged outdoor activity.';
  if (aqi <= 200) return 'Everyone may begin to experience health effects. Reduce prolonged outdoor activity.';
  if (aqi <= 300) return 'Health warnings of emergency conditions. Avoid outdoor activity.';
  return 'Hazardous. Everyone should avoid all outdoor exertion.';
}

/* ── Pollutant cards ─────────────────────────────────── */
const POLLUTANT_MAX = {
  pm25:  150,  // μg/m³
  pm10:  250,
  ozone: 400,
  no2:   200,
  so2:   350,
  co:    10000,
};

function renderPollutants() {
  const c = ASTATE.aq.current;

  renderPollutant('pm25',  c.pm2_5,            POLLUTANT_MAX.pm25);
  renderPollutant('pm10',  c.pm10,             POLLUTANT_MAX.pm10);
  renderPollutant('ozone', c.ozone,            POLLUTANT_MAX.ozone);
  renderPollutant('no2',   c.nitrogen_dioxide, POLLUTANT_MAX.no2);
  renderPollutant('so2',   c.sulphur_dioxide,  POLLUTANT_MAX.so2);
  renderPollutant('co',    c.carbon_monoxide,  POLLUTANT_MAX.co);
}

function renderPollutant(key, value, max) {
  const val = value !== null && value !== undefined ? Math.round(value) : null;
  const display = val !== null ? val : '—';
  const pct     = val !== null ? Math.min((val / max) * 100, 100) : 0;

  setAQIText(`${key}-val`, display);
  const bar = document.getElementById(`${key}-bar`);
  if (bar) bar.style.width = pct + '%';
}

/* ── UV Banner ───────────────────────────────────────── */
function renderUVBanner() {
  const c   = ASTATE.aq.current;
  const uv  = c.uv_index ?? 0;
  const cat = uvDescription(uv);
  setAQIText('aq-uv-num', Math.round(uv));
  setAQIText('aq-uv-cat', cat.label);
  document.getElementById('aq-uv-cat').style.color = cat.color;

  let advice = '';
  if (uv <= 2)  advice = 'No protection required.';
  else if (uv <= 5)  advice = 'Wear sunscreen and sunglasses.';
  else if (uv <= 7)  advice = 'Reduce time in the sun. Cover up and wear SPF 30+.';
  else if (uv <= 10) advice = 'Extra protection needed. Minimize sun exposure 10am–4pm.';
  else advice = 'Take all precautions. Stay in shade during midday.';
  setAQIText('uv-advice', advice);
}

/* ── Hourly AQI chart ────────────────────────────────── */
function renderAQIChart() {
  const canvas = document.getElementById('aqi-chart');
  if (!canvas) return;

  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 48 || 600;
  const cssH = 160;
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  drawAQIChart(ctx, cssW, cssH);
}

function drawAQIChart(ctx, W, H) {
  const h    = ASTATE.aq.hourly;
  const tz   = ASTATE.location.timezone;
  const n    = Math.min(48, h.time.length);

  const aqiVals = h.us_aqi.slice(0, n).map(v => v ?? 0);
  if (!aqiVals.length) return;

  const PAD    = { top: 20, bottom: 34, left: 40, right: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top  - PAD.bottom;

  const maxVal = Math.max(...aqiVals, 50) + 20;
  const xOf = i => PAD.left + (i / (n - 1)) * innerW;
  const yOf = v => PAD.top  + (1 - v / maxVal) * innerH;

  // AQI color zones background bands
  const zones = [
    { max: 50,  color: 'rgba(76,175,80,0.06)'   },
    { max: 100, color: 'rgba(205,220,57,0.06)'  },
    { max: 150, color: 'rgba(255,152,0,0.06)'   },
    { max: 200, color: 'rgba(244,67,54,0.06)'   },
    { max: 300, color: 'rgba(156,39,176,0.06)'  },
  ];
  let prevY = PAD.top;
  zones.forEach(z => {
    const y = yOf(z.max);
    if (y >= PAD.top) {
      ctx.fillStyle = z.color;
      ctx.fillRect(PAD.left, Math.max(y, PAD.top), innerW, Math.min(prevY - y, innerH));
    }
    prevY = y;
  });

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 1;
  [50, 100, 150, 200].forEach(v => {
    if (v < maxVal) {
      const y = yOf(v);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `10px DM Sans, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(v, PAD.left - 6, y + 3);
    }
  });

  // Gradient fill under curve
  const grad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
  grad.addColorStop(0, 'rgba(100, 181, 246, 0.35)');
  grad.addColorStop(1, 'rgba(100, 181, 246, 0)');

  ctx.beginPath();
  aqiVals.forEach((v, i) => {
    if (i === 0) ctx.moveTo(xOf(i), yOf(v));
    else {
      const xc = (xOf(i - 1) + xOf(i)) / 2;
      const yc = (yOf(aqiVals[i - 1]) + yOf(v)) / 2;
      ctx.quadraticCurveTo(xOf(i - 1), yOf(aqiVals[i - 1]), xc, yc);
    }
  });
  ctx.lineTo(xOf(n - 1), H - PAD.bottom);
  ctx.lineTo(xOf(0),     H - PAD.bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#64B5F6';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  aqiVals.forEach((v, i) => {
    if (i === 0) ctx.moveTo(xOf(i), yOf(v));
    else {
      const xc = (xOf(i - 1) + xOf(i)) / 2;
      const yc = (yOf(aqiVals[i - 1]) + yOf(v)) / 2;
      ctx.quadraticCurveTo(xOf(i - 1), yOf(aqiVals[i - 1]), xc, yc);
    }
  });
  ctx.stroke();

  // Time labels every 6 hours
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font      = '10px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i += 6) {
    const t = formatHour(h.time[i] + ':00', tz);
    ctx.fillText(t, xOf(i), H - PAD.bottom + 14);
  }
}

/* ── Helpers ─────────────────────────────────────────── */
function setAQIText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function syncUnitToggleAQI() {
  document.querySelectorAll('.unit-opt').forEach(o => {
    o.classList.toggle('active', o.dataset.unit === ASTATE.unit);
  });
}

function showLoading() { document.getElementById('loading-overlay').classList.add('active'); }
function hideLoading() { document.getElementById('loading-overlay').classList.remove('active'); }

let toastTimer = null;
function showToastAQI(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (err ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3200);
}

window.addEventListener('resize', () => {
  clearTimeout(window._aqiResizeTimer);
  window._aqiResizeTimer = setTimeout(() => {
    if (ASTATE.aq) renderAQIChart();
  }, 200);
});
