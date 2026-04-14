'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Forecast Page Controller
   ════════════════════════════════════════════════════════ */

const FSTATE = {
  weather:  null,
  unit:     'F',
  location: null,
};

document.addEventListener('DOMContentLoaded', forecastInit);

async function forecastInit() {
  FSTATE.unit     = lsGet(LS.UNIT, 'F');
  FSTATE.location = lsGet(LS.LOCATION, {
    name: 'New York', state: 'NY', country: 'US',
    lat: 40.7128, lon: -74.006, timezone: 'America/New_York',
  });

  syncUnitToggleForecast();
  initUnitToggleForecast();

  showLoading();
  try {
    FSTATE.weather = await API.fetchWeather(FSTATE.location.lat, FSTATE.location.lon);
    if (FSTATE.weather.timezone) FSTATE.location.timezone = FSTATE.weather.timezone;

    applyBgForecast();
    renderPageHeader();
    renderChart();
    renderForecastRows();
  } catch (err) {
    console.error(err);
    showToastForecast('Could not load forecast', true);
  } finally {
    hideLoading();
  }
}

/* ── Background ──────────────────────────────────────── */
function applyBgForecast() {
  const c = FSTATE.weather.current;
  document.getElementById('weather-bg').className = getBgClass(c.weather_code, c.is_day);
  updateParticlesForecast(getParticleType(c.weather_code, c.is_day));
}

function updateParticlesForecast(type) {
  const container = document.getElementById('particles');
  container.innerHTML = '';
  if (type === 'rain' || type === 'storm') {
    for (let i = 0; i < 90; i++) {
      const el = document.createElement('div');
      el.className = 'rain-drop';
      el.style.cssText = `left:${Math.random()*110-5}%;height:${12+Math.random()*12}px;
        animation-duration:${0.5+Math.random()*0.5}s;animation-delay:-${Math.random()*2}s;
        opacity:${0.3+Math.random()*0.4}`;
      container.appendChild(el);
    }
  }
  if (type === 'snow') {
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'snow-flake';
      el.textContent = '❄';
      el.style.cssText = `left:${Math.random()*100}%;font-size:${8+Math.random()*12}px;
        animation-duration:${3+Math.random()*5}s;animation-delay:-${Math.random()*6}s;
        opacity:${0.4+Math.random()*0.5}`;
      container.appendChild(el);
    }
  }
  if (type === 'stars') {
    for (let i = 0; i < 100; i++) {
      const el = document.createElement('div');
      el.className = 'star-dot';
      const s = 0.8 + Math.random() * 2;
      el.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*65}%;
        width:${s}px;height:${s}px;animation-duration:${2+Math.random()*3}s;
        animation-delay:-${Math.random()*4}s`;
      container.appendChild(el);
    }
  }
}

/* ── Page header ─────────────────────────────────────── */
function renderPageHeader() {
  const loc  = FSTATE.location;
  const name = loc.name + (loc.state ? ', ' + loc.state : '');
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: loc.timezone,
  }).format(new Date());

  const cityEl = document.getElementById('page-city');
  const dateEl = document.getElementById('page-date');
  if (cityEl) cityEl.textContent = name;
  if (dateEl) dateEl.textContent = date;
}

/* ── Temperature chart ───────────────────────────────── */
function renderChart() {
  const canvas = document.getElementById('temp-chart');
  if (!canvas) return;

  // Size canvas to its CSS width
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 48 || 600;
  const cssH = 200;
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  drawTempChart(ctx, cssW, cssH);
}

function drawTempChart(ctx, W, H) {
  const d = FSTATE.weather.daily;
  const u = FSTATE.unit;
  const n = Math.min(14, d.weather_code.length);
  const tz = FSTATE.location.timezone;

  const highs = d.temperature_2m_max.slice(0, n).map(t => convertTemp(t, u));
  const lows  = d.temperature_2m_min.slice(0, n).map(t => convertTemp(t, u));
  const days  = d.time.slice(0, n).map(t => formatDayShort(t, tz));

  const PAD   = { top: 24, bottom: 44, left: 36, right: 16 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top  - PAD.bottom;

  const allT  = [...highs, ...lows];
  const minT  = Math.min(...allT) - 5;
  const maxT  = Math.max(...allT) + 5;

  const xOf = i => PAD.left + (i / (n - 1)) * innerW;
  const yOf = t => PAD.top  + (1 - (t - minT) / (maxT - minT)) * innerH;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 1;
  for (let tick = 0; tick <= 4; tick++) {
    const y = PAD.top + (tick / 4) * innerH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(W - PAD.right, y);
    ctx.stroke();
  }

  // Vertical day markers
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(xOf(i), PAD.top);
    ctx.lineTo(xOf(i), H - PAD.bottom);
    ctx.stroke();
  }

  // Band between high and low
  ctx.beginPath();
  buildSmoothPath(ctx, highs.map((t, i) => ({ x: xOf(i), y: yOf(t) })));
  lows.slice().reverse().forEach((t, ri) => {
    const i = n - 1 - ri;
    ctx.lineTo(xOf(i), yOf(t));
  });
  ctx.closePath();
  const bandGrad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
  bandGrad.addColorStop(0, 'rgba(255, 138, 101, 0.18)');
  bandGrad.addColorStop(1, 'rgba(100, 181, 246, 0.10)');
  ctx.fillStyle = bandGrad;
  ctx.fill();

  // Low line
  drawLine(ctx, lows.map((t, i) => ({ x: xOf(i), y: yOf(t) })), '#64B5F6', 2);

  // High line
  drawLine(ctx, highs.map((t, i) => ({ x: xOf(i), y: yOf(t) })), '#FF8A65', 2);

  // Dots on high/low
  highs.forEach((t, i) => drawDot(ctx, xOf(i), yOf(t), '#FF8A65', 3.5));
  lows.forEach( (t, i) => drawDot(ctx, xOf(i), yOf(t), '#64B5F6', 3));

  // Temp labels on high line
  ctx.fillStyle   = 'rgba(255,255,255,0.8)';
  ctx.font        = `600 11px DM Sans, sans-serif`;
  ctx.textAlign   = 'center';
  highs.forEach((t, i) => {
    ctx.fillText(`${t}°`, xOf(i), yOf(t) - 10);
  });

  // Day labels on x-axis
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font      = `400 11px DM Sans, sans-serif`;
  days.forEach((d, i) => {
    ctx.fillText(d, xOf(i), H - PAD.bottom + 18);
  });
}

function buildSmoothPath(ctx, pts) {
  if (pts.length < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}

function drawLine(ctx, pts, color, lw) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  buildSmoothPath(ctx, pts);
  ctx.stroke();
}

function drawDot(ctx, x, y, color, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/* ── Forecast rows ───────────────────────────────────── */
function renderForecastRows() {
  const d   = FSTATE.weather.daily;
  const h   = FSTATE.weather.hourly;
  const tz  = FSTATE.location.timezone;
  const u   = FSTATE.unit;
  const n   = Math.min(14, d.weather_code.length);
  const container = document.getElementById('forecast-rows');
  container.innerHTML = '';

  for (let di = 0; di < n; di++) {
    const info   = getWeatherInfo(d.weather_code[di]);
    const hi     = convertTemp(d.temperature_2m_max[di], u);
    const lo     = convertTemp(d.temperature_2m_min[di], u);
    const rain   = d.precipitation_probability_max[di];
    const day    = formatDayShort(d.time[di], tz);

    // Get hourly entries for this day
    const dayPrefix = d.time[di]; // "YYYY-MM-DD"
    const dayHours  = h.time.reduce((acc, t, i) => {
      if (t.startsWith(dayPrefix)) acc.push(i);
      return acc;
    }, []);

    const row = document.createElement('div');
    row.className = 'forecast-row';

    // Build expanded hourly HTML
    const hourlyHTML = dayHours.map(i => {
      const hInfo  = getWeatherInfo(h.weather_code[i]);
      const hTemp  = convertTemp(h.temperature_2m[i], u);
      const hRain  = h.precipitation_probability[i];
      const hTime  = formatHour(h.time[i] + ':00', tz);
      return `
        <div class="expand-item">
          <div class="expand-time">${hTime}</div>
          <div class="expand-icon">${hInfo.emoji}</div>
          <div class="expand-temp">${hTemp}°</div>
          <div class="expand-rain">${hRain >= 20 ? hRain + '%' : ''}</div>
        </div>
      `;
    }).join('');

    row.innerHTML = `
      <div class="forecast-row-header">
        <div class="fr-day">${day}</div>
        <div class="fr-icon">${info.emoji}</div>
        <div class="fr-label">${info.label}</div>
        <div class="fr-rain">${rain >= 20 ? rain + '%' : ''}</div>
        <div class="fr-temps">
          <span class="fr-low">${lo}°</span>${hi}°
        </div>
        <div class="fr-chevron">▾</div>
      </div>
      <div class="forecast-hourly-expand">${hourlyHTML}</div>
    `;

    row.querySelector('.forecast-row-header').addEventListener('click', () => {
      row.classList.toggle('expanded');
    });

    container.appendChild(row);
  }
}

/* ── Unit toggle ─────────────────────────────────────── */
function initUnitToggleForecast() {
  document.getElementById('unit-toggle').addEventListener('click', (e) => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === FSTATE.unit) return;
    FSTATE.unit = opt.dataset.unit;
    lsSet(LS.UNIT, FSTATE.unit);
    syncUnitToggleForecast();
    if (FSTATE.weather) { renderChart(); renderForecastRows(); }
  });
}

function syncUnitToggleForecast() {
  document.querySelectorAll('.unit-opt').forEach(o => {
    o.classList.toggle('active', o.dataset.unit === FSTATE.unit);
  });
}

/* ── Loading / toast ─────────────────────────────────── */
function showLoading() { document.getElementById('loading-overlay').classList.add('active'); }
function hideLoading() { document.getElementById('loading-overlay').classList.remove('active'); }

let toastTimer = null;
function showToastForecast(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (err ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

/* ── Resize chart on window resize ──────────────────── */
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (FSTATE.weather) renderChart();
  }, 200);
});
