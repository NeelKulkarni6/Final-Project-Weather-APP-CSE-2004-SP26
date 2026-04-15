'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — City Comparison
   ════════════════════════════════════════════════════════ */

const CMPSTATE = {
  cityA: null, cityB: null,
  weatherA: null, weatherB: null,
  unit: 'F',
};

document.addEventListener('DOMContentLoaded', cmpInit);

function cmpInit() {
  CMPSTATE.unit = lsGet(LS.UNIT, 'F');
  syncUnitCmp();

  document.getElementById('unit-toggle').addEventListener('click', e => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === CMPSTATE.unit) return;
    CMPSTATE.unit = opt.dataset.unit;
    lsSet(LS.UNIT, CMPSTATE.unit);
    syncUnitCmp();
    if (CMPSTATE.weatherA && CMPSTATE.weatherB) renderComparison();
  });

  // Pre-fill City A from saved location
  const saved = lsGet(LS.LOCATION, null);
  if (saved) {
    CMPSTATE.cityA = saved;
    document.getElementById('search-a').value =
      saved.name + (saved.state ? ', ' + saved.state : '');
  }

  initCitySearch('a');
  initCitySearch('b');

  document.getElementById('cmp-go').addEventListener('click', compareNow);
}

function syncUnitCmp() {
  document.querySelectorAll('.unit-opt').forEach(o =>
    o.classList.toggle('active', o.dataset.unit === CMPSTATE.unit)
  );
}

/* ── City search ────────────────────────────────────── */
function initCitySearch(side) {
  const input = document.getElementById('search-' + side);
  const drop  = document.getElementById('drop-' + side);
  let timer, lastResults = [];

  input.addEventListener('input', () => {
    clearTimeout(timer);
    // Clear selection when user types
    if (side === 'a') CMPSTATE.cityA = null;
    else              CMPSTATE.cityB = null;

    const q = input.value.trim();
    if (q.length < 2) { closeDrop(drop); lastResults = []; return; }
    timer = setTimeout(async () => {
      lastResults = await API.searchLocations(q);
      renderDrop(drop, lastResults, side, input);
    }, 320);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      // Select first result if available
      const first = drop.querySelector('.cmp-drop-item');
      if (first) { first.click(); return; }
      // Otherwise try to geocode what's typed
      triggerGeocode(side, input.value.trim());
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-' + side) && !e.target.closest('#drop-' + side)) {
      closeDrop(drop);
    }
  });
}

function renderDrop(drop, results, side, input) {
  if (!results.length) { closeDrop(drop); return; }
  drop.innerHTML = results.slice(0, 6).map(r => {
    const region = [r.admin1, r.country_code].filter(Boolean).join(', ');
    return `<div class="cmp-drop-item"
      data-lat="${r.latitude}" data-lon="${r.longitude}"
      data-name="${r.name}" data-state="${r.admin1 ?? ''}"
      data-tz="${r.timezone ?? 'auto'}">
      <div class="dropdown-city">${r.name}</div>
      <div class="dropdown-region">${region}</div>
    </div>`;
  }).join('');

  drop.querySelectorAll('.cmp-drop-item').forEach(item => {
    item.addEventListener('click', () => {
      const loc = {
        name: item.dataset.name, state: item.dataset.state,
        lat:  parseFloat(item.dataset.lat), lon: parseFloat(item.dataset.lon),
        timezone: item.dataset.tz,
      };
      if (side === 'a') CMPSTATE.cityA = loc;
      else              CMPSTATE.cityB = loc;
      input.value = loc.name + (loc.state ? ', ' + loc.state : '');
      closeDrop(drop);
    });
  });
  drop.classList.add('open');
}

function closeDrop(drop) {
  drop.classList.remove('open');
  drop.innerHTML = '';
}

async function triggerGeocode(side, query) {
  if (!query) return;
  const results = await API.searchLocations(query);
  if (!results.length) return;
  const r = results[0];
  const loc = {
    name: r.name, state: r.admin1 ?? '',
    lat: r.latitude, lon: r.longitude,
    timezone: r.timezone ?? 'auto',
  };
  if (side === 'a') CMPSTATE.cityA = loc;
  else              CMPSTATE.cityB = loc;
  const input = document.getElementById('search-' + side);
  input.value = loc.name + (loc.state ? ', ' + loc.state : '');
}

/* ── Compare ────────────────────────────────────────── */
async function compareNow() {
  const inputA = document.getElementById('search-a').value.trim();
  const inputB = document.getElementById('search-b').value.trim();

  // Auto-geocode if user typed but didn't pick from dropdown
  if (!CMPSTATE.cityA && inputA) await triggerGeocode('a', inputA);
  if (!CMPSTATE.cityB && inputB) await triggerGeocode('b', inputB);

  if (!CMPSTATE.cityA) { showToastCmp('Enter a first city.', true); return; }
  if (!CMPSTATE.cityB) { showToastCmp('Enter a second city.', true); return; }

  document.getElementById('loading-overlay').classList.add('active');
  document.getElementById('cmp-result').style.display = 'none';

  try {
    const [wA, wB] = await Promise.all([
      API.fetchWeather(CMPSTATE.cityA.lat, CMPSTATE.cityA.lon),
      API.fetchWeather(CMPSTATE.cityB.lat, CMPSTATE.cityB.lon),
    ]);
    CMPSTATE.weatherA = wA;
    CMPSTATE.weatherB = wB;
    renderComparison();
  } catch (err) {
    console.error(err);
    showToastCmp('Could not load weather data. Try again.', true);
  } finally {
    document.getElementById('loading-overlay').classList.remove('active');
  }
}

/* ── Render ─────────────────────────────────────────── */
function renderComparison() {
  const wA = CMPSTATE.weatherA, wB = CMPSTATE.weatherB;
  const u  = CMPSTATE.unit;
  const cA = wA.current, cB = wB.current;
  const dA = wA.daily,   dB = wB.daily;
  const iA = getWeatherInfo(cA.weather_code);
  const iB = getWeatherInfo(cB.weather_code);

  // Legend & color coding
  setText('legend-a-name',  CMPSTATE.cityA.name);
  setText('legend-b-name',  CMPSTATE.cityB.name);
  setText('chart-legend-a', CMPSTATE.cityA.name);
  setText('chart-legend-b', CMPSTATE.cityB.name);
  document.getElementById('cmp-hero-a').style.borderTopColor = 'rgba(100,181,246,0.55)';
  document.getElementById('cmp-hero-b').style.borderTopColor = 'rgba(244,143,177,0.55)';

  renderHero('a', CMPSTATE.cityA, cA, dA, iA, u);
  renderHero('b', CMPSTATE.cityB, cB, dB, iB, u);

  renderMetric('temp',     convertTemp(cA.temperature_2m, u),          convertTemp(cB.temperature_2m, u),          u==='F'?-20:0, u==='F'?110:43, '\u00b0'+u, 'higherWarmer', 'Temperature');
  renderMetric('feels',    convertTemp(cA.apparent_temperature, u),     convertTemp(cB.apparent_temperature, u),    u==='F'?-20:0, u==='F'?110:43, '\u00b0'+u, 'higherWarmer', 'Feels Like');
  renderMetric('humidity', cA.relative_humidity_2m,                     cB.relative_humidity_2m,                   0, 100, '%',   'neutral',     'Humidity');
  renderMetric('wind',     kmhToMph(cA.wind_speed_10m),                 kmhToMph(cB.wind_speed_10m),               0, 60,  ' mph', 'lowerBetter', 'Wind Speed');
  renderMetric('uv',       Math.round(cA.uv_index ?? dA.uv_index_max?.[0] ?? 0),
                           Math.round(cB.uv_index ?? dB.uv_index_max?.[0] ?? 0),
                           0, 12, '',     'lowerBetter', 'UV Index');
  renderMetric('pressure', Math.round(cA.surface_pressure),             Math.round(cB.surface_pressure),           950, 1040, ' hPa', 'neutral',   'Pressure');
  renderMetric('precip',   +(dA.precipitation_sum?.[0] ?? 0).toFixed(1), +(dB.precipitation_sum?.[0] ?? 0).toFixed(1), 0, 40, ' mm', 'lowerBetter', 'Precip Today');

  // Show result FIRST so canvas has a clientWidth, then draw chart
  document.getElementById('cmp-result').style.display = '';
  requestAnimationFrame(() => drawForecastChart(dA, dB, u));
}

function renderHero(side, loc, c, d, info, u) {
  const p = 'cmp-' + side + '-';
  setText(p + 'city',      loc.name);
  setText(p + 'state',     loc.state || loc.country || '');
  setText(p + 'temp',      convertTemp(c.temperature_2m, u) + '\u00b0' + u);
  setText(p + 'condition', info.label);
  setText(p + 'icon',      info.emoji);
  setText(p + 'high',      'H: ' + convertTemp(d.temperature_2m_max[0], u) + '\u00b0');
  setText(p + 'low',       'L: ' + convertTemp(d.temperature_2m_min[0], u) + '\u00b0');
}

function renderMetric(key, valA, valB, minV, maxV, suffix, better, label) {
  const el = document.getElementById('metric-' + key);
  if (!el) return;

  const pA = Math.max(0, Math.min(100, ((valA - minV) / (maxV - minV)) * 100));
  const pB = Math.max(0, Math.min(100, ((valB - minV) / (maxV - minV)) * 100));

  let winA = false, winB = false;
  if      (better === 'higherWarmer') { winA = valA > valB;  winB = valB > valA; }
  else if (better === 'lowerBetter')  { winA = valA < valB;  winB = valB < valA; }

  const colA = winA ? 'rgba(100,181,246,0.85)' : 'rgba(255,255,255,0.25)';
  const colB = winB ? 'rgba(244,143,177,0.85)' : 'rgba(255,255,255,0.25)';

  const fmtV = v => (Number.isInteger(v) ? v : (+v).toFixed(1)) + suffix;

  el.innerHTML = `
    <div class="metric-label">${label}</div>
    <div class="metric-row">
      <div class="metric-val-a${winA ? ' winner' : ''}">${fmtV(valA)}</div>
      <div class="metric-bars">
        <div class="metric-bar-wrap"><div class="metric-bar-fill" style="width:${pA.toFixed(1)}%;background:${colA}"></div></div>
        <div class="metric-bar-wrap"><div class="metric-bar-fill" style="width:${pB.toFixed(1)}%;background:${colB}"></div></div>
      </div>
      <div class="metric-val-b${winB ? ' winner' : ''}">${fmtV(valB)}</div>
    </div>`;
}

/* ── 7-day forecast chart ───────────────────────────── */
function drawForecastChart(dA, dB, unit) {
  const canvas = document.getElementById('cmp-chart');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = Math.max(200, canvas.parentElement.clientWidth - 4);
  const cssH = 200;
  canvas.width  = cssW * dpr;  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const n    = Math.min(7, dA.temperature_2m_max.length, dB.temperature_2m_max.length);
  const PAD  = { top: 14, bottom: 32, left: 8, right: 52 };
  const iW   = cssW - PAD.left - PAD.right;
  const iH   = cssH - PAD.top  - PAD.bottom;

  const allH = [...dA.temperature_2m_max.slice(0,n), ...dB.temperature_2m_max.slice(0,n)];
  const allL = [...dA.temperature_2m_min.slice(0,n), ...dB.temperature_2m_min.slice(0,n)];
  const minV = convertTemp(Math.min(...allL) - 4, unit);
  const maxV = convertTemp(Math.max(...allH) + 4, unit);
  const xOf  = i => PAD.left + (i / (n - 1)) * iW;
  const yOf  = v => PAD.top  + (1 - (v - minV) / (maxV - minV)) * iH;

  // Grid + y-axis
  const step = Math.max(2, Math.ceil((maxV - minV) / 4));
  ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'right';
  for (let v = Math.round(minV); v <= maxV; v += step) {
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(cssW - PAD.right, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(`${v}\u00b0`, cssW - 6, y + 3.5);
  }

  // X-axis day labels
  ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.textAlign = 'center';
  dA.time.slice(0, n).forEach((t, i) => {
    ctx.fillText(parseInt(t.split('-')[2]), xOf(i), cssH - PAD.bottom + 14);
  });

  // Draw both cities
  [
    { daily: dA, lineColor: '#64B5F6', bandColor: 'rgba(100,181,246,0.12)' },
    { daily: dB, lineColor: '#F48FB1', bandColor: 'rgba(244,143,177,0.12)' },
  ].forEach(({ daily, lineColor, bandColor }) => {
    const highs = daily.temperature_2m_max.slice(0,n).map(v => convertTemp(v, unit));
    const lows  = daily.temperature_2m_min.slice(0,n).map(v => convertTemp(v, unit));
    const hPts  = highs.map((v,i) => ({x:xOf(i), y:yOf(v)}));
    const lPts  = lows.map( (v,i) => ({x:xOf(i), y:yOf(v)}));

    // Band
    ctx.beginPath();
    hPts.forEach((p,i) => i === 0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    [...lPts].reverse().forEach(p => ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.fillStyle = bandColor; ctx.fill();

    // High line
    ctx.beginPath(); ctx.strokeStyle = lineColor; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    hPts.forEach((p,i) => i === 0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // Dots
    hPts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      ctx.fillStyle = lineColor; ctx.fill();
    });
  });
}

/* ── Utilities ──────────────────────────────────────── */
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

let _cmpToastTimer;
function showToastCmp(msg, err = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'show' + (err ? ' error' : '');
  clearTimeout(_cmpToastTimer);
  _cmpToastTimer = setTimeout(() => { el.className = ''; }, 3200);
}

window.addEventListener('resize', () => {
  clearTimeout(window._cmpRT);
  window._cmpRT = setTimeout(() => {
    if (CMPSTATE.weatherA && CMPSTATE.weatherB) renderComparison();
  }, 200);
});
