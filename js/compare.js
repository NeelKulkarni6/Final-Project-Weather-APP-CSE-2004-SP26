'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — City Compare
   ════════════════════════════════════════════════════════ */

const CMPSTATE = {
  cityA: null, cityB: null, weatherA: null, weatherB: null, unit: 'F',
};

document.addEventListener('DOMContentLoaded', cmpInit);

function cmpInit() {
  CMPSTATE.unit = lsGet(LS.UNIT, 'F');
  syncUnitCmp();

  document.getElementById('unit-toggle').addEventListener('click', e => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === CMPSTATE.unit) return;
    CMPSTATE.unit = opt.dataset.unit; lsSet(LS.UNIT, CMPSTATE.unit); syncUnitCmp();
    if (CMPSTATE.weatherA && CMPSTATE.weatherB) renderComparison();
  });

  // Prefill City A from saved location
  const saved = lsGet(LS.LOCATION, null);
  if (saved) {
    CMPSTATE.cityA = saved;
    document.getElementById('search-a').value = saved.name + (saved.state ? ', ' + saved.state : '');
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

/* ── City search inputs ─────────────────────────────── */
function initCitySearch(side) {
  const input = document.getElementById('search-' + side);
  const drop  = document.getElementById('drop-' + side);
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { drop.innerHTML=''; drop.classList.remove('open'); return; }
    timer = setTimeout(async () => {
      const results = await API.searchLocations(q);
      if (!results.length) { drop.classList.remove('open'); return; }
      drop.innerHTML = results.slice(0,6).map(r => {
        const region = [r.admin1, r.country_code].filter(Boolean).join(', ');
        return `<div class="dropdown-item cmp-drop-item" data-lat="${r.latitude}" data-lon="${r.longitude}"
          data-name="${r.name}" data-state="${r.admin1??''}" data-tz="${r.timezone??'auto'}">
          <div class="dropdown-city">${r.name}</div>
          <div class="dropdown-region">${region}</div>
        </div>`;
      }).join('');
      drop.querySelectorAll('.cmp-drop-item').forEach(item => {
        item.addEventListener('click', () => {
          const loc = {
            name:item.dataset.name, state:item.dataset.state,
            lat:parseFloat(item.dataset.lat), lon:parseFloat(item.dataset.lon),
            timezone:item.dataset.tz,
          };
          if (side === 'a') CMPSTATE.cityA = loc;
          else              CMPSTATE.cityB = loc;
          input.value = loc.name + (loc.state ? ', ' + loc.state : '');
          drop.classList.remove('open'); drop.innerHTML = '';
        });
      });
      drop.classList.add('open');
    }, 320);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-' + side) && !e.target.closest('#drop-' + side)) {
      drop.classList.remove('open'); drop.innerHTML = '';
    }
  });
}

/* ── Compare ────────────────────────────────────────── */
async function compareNow() {
  if (!CMPSTATE.cityA || !CMPSTATE.cityB) {
    const msg = !CMPSTATE.cityA ? 'Select a first city.' : 'Select a second city.';
    showToastCmp(msg, true); return;
  }
  document.getElementById('cmp-loading').classList.add('active');
  document.getElementById('cmp-result').style.display = 'none';
  try {
    const [wA, wB] = await Promise.all([
      API.fetchWeather(CMPSTATE.cityA.lat, CMPSTATE.cityA.lon),
      API.fetchWeather(CMPSTATE.cityB.lat, CMPSTATE.cityB.lon),
    ]);
    CMPSTATE.weatherA = wA; CMPSTATE.weatherB = wB;
    renderComparison();
  } catch (err) {
    console.error(err); showToastCmp('Could not load weather data.', true);
  } finally {
    document.getElementById('cmp-loading').classList.remove('active');
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

  // Heroes
  renderHero('a', CMPSTATE.cityA, cA, dA, iA, u);
  renderHero('b', CMPSTATE.cityB, cB, dB, iB, u);

  // Metric comparisons
  renderMetric('temp',     convertTemp(cA.temperature_2m, u), convertTemp(cB.temperature_2m, u),
    u==='F'?-20:0, u==='F'?110:43, `\u00b0${u}`, 'higherWarmer', 'Temperature');
  renderMetric('feels',    convertTemp(cA.apparent_temperature,u), convertTemp(cB.apparent_temperature,u),
    u==='F'?-20:0, u==='F'?110:43, `\u00b0${u}`, 'higherWarmer', 'Feels Like');
  renderMetric('humidity', cA.relative_humidity_2m, cB.relative_humidity_2m,
    0, 100, '%', 'neutral', 'Humidity');
  renderMetric('wind',     kmhToMph(cA.wind_speed_10m), kmhToMph(cB.wind_speed_10m),
    0, 60, ' mph', 'lowerBetter', 'Wind Speed');
  renderMetric('uv',       cA.uv_index ?? dA.uv_index_max?.[0] ?? 0,
    cB.uv_index ?? dB.uv_index_max?.[0] ?? 0, 0, 12, '', 'lowerBetter', 'UV Index');
  renderMetric('pressure', Math.round(cA.surface_pressure), Math.round(cB.surface_pressure),
    950, 1040, ' hPa', 'neutral', 'Pressure');
  renderMetric('precip',   (dA.precipitation_sum?.[0]||0).toFixed(1)*1,
    (dB.precipitation_sum?.[0]||0).toFixed(1)*1, 0, 40, ' mm', 'lowerBetter', 'Precip Today');

  // 7-day forecast chart
  drawForecastChart(dA, dB, u);

  document.getElementById('cmp-result').style.display = '';
}

function renderHero(side, loc, c, d, info, u) {
  const pre = 'cmp-' + side + '-';
  setText(pre + 'city',      loc.name);
  setText(pre + 'state',     loc.state || loc.country || '');
  setText(pre + 'temp',      convertTemp(c.temperature_2m, u) + '\u00b0' + u);
  setText(pre + 'condition', info.label);
  setText(pre + 'icon',      info.emoji);
  setText(pre + 'high',      'H: ' + convertTemp(d.temperature_2m_max[0], u) + '\u00b0');
  setText(pre + 'low',       'L: ' + convertTemp(d.temperature_2m_min[0], u) + '\u00b0');
}

function renderMetric(key, valA, valB, minV, maxV, suffix, better, label) {
  const pA = Math.max(0, Math.min(100, ((valA - minV)/(maxV - minV))*100));
  const pB = Math.max(0, Math.min(100, ((valB - minV)/(maxV - minV))*100));

  let winA = false, winB = false;
  if (better === 'higherWarmer') { winA = valA > valB; winB = valB > valA; }
  else if (better === 'lowerBetter') { winA = valA < valB; winB = valB < valA; }
  // neutral: no winner

  const barColorA = winA ? 'rgba(100,181,246,0.8)' : winB ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.35)';
  const barColorB = winB ? 'rgba(100,181,246,0.8)' : winA ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.35)';

  const el = document.getElementById('metric-' + key);
  if (!el) return;
  el.innerHTML = `
    <div class="metric-label">${label}</div>
    <div class="metric-row">
      <div class="metric-val-a${winA?' winner':''}">${formatMetricVal(valA, suffix)}</div>
      <div class="metric-bars">
        <div class="metric-bar-wrap"><div class="metric-bar-fill" style="width:${pA}%;background:${barColorA}"></div></div>
        <div class="metric-bar-wrap"><div class="metric-bar-fill" style="width:${pB}%;background:${barColorB}"></div></div>
      </div>
      <div class="metric-val-b${winB?' winner':''}">${formatMetricVal(valB, suffix)}</div>
    </div>
  `;
}

function formatMetricVal(val, suffix) {
  const num = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : val;
  return num + suffix;
}

/* ── 7-day forecast chart ───────────────────────────── */
function drawForecastChart(dA, dB, unit) {
  const canvas = document.getElementById('cmp-chart');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 4;
  const cssH = 200;
  canvas.width  = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const n   = Math.min(7, dA.temperature_2m_max.length, dB.temperature_2m_max.length);
  const PAD = { top:16, bottom:32, left:10, right:52 };
  const iW  = cssW - PAD.left - PAD.right;
  const iH  = cssH - PAD.top  - PAD.bottom;

  const allHighs = [...dA.temperature_2m_max.slice(0,n), ...dB.temperature_2m_max.slice(0,n)];
  const allLows  = [...dA.temperature_2m_min.slice(0,n), ...dB.temperature_2m_min.slice(0,n)];
  const minV = convertTemp(Math.min(...allLows) - 4, unit);
  const maxV = convertTemp(Math.max(...allHighs) + 4, unit);
  const xOf  = i => PAD.left + (i/(n-1)) * iW;
  const yOf  = v => PAD.top  + (1-(v-minV)/(maxV-minV)) * iH;

  // Grid
  ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'right';
  const step = Math.max(2, Math.ceil((maxV-minV)/4));
  for (let v = Math.round(minV); v <= maxV; v += step) {
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(cssW-PAD.right, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(`${v}\u00b0`, cssW-6, y+3.5);
  }

  // Day labels
  const days = dA.time.slice(0, n);
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.40)';
  days.forEach((t, i) => {
    const [,, dd] = t.split('-');
    ctx.fillText(parseInt(dd), xOf(i), cssH-PAD.bottom+14);
  });

  // Draw city lines
  [
    { daily: dA, highColor:'#64B5F6', lowColor:'rgba(100,181,246,0.35)' },
    { daily: dB, highColor:'#F48FB1', lowColor:'rgba(244,143,177,0.35)' },
  ].forEach(({ daily, highColor, lowColor }) => {
    const highs = daily.temperature_2m_max.slice(0,n).map(v => convertTemp(v, unit));
    const lows  = daily.temperature_2m_min.slice(0,n).map(v => convertTemp(v, unit));
    const hPts  = highs.map((v,i) => ({x:xOf(i), y:yOf(v)}));
    const lPts  = lows.map( (v,i) => ({x:xOf(i), y:yOf(v)}));

    // Band fill
    ctx.beginPath();
    hPts.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
    [...lPts].reverse().forEach(p => ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.fillStyle = lowColor; ctx.fill();

    // High line
    ctx.beginPath(); ctx.strokeStyle = highColor; ctx.lineWidth = 2.2;
    hPts.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
    ctx.stroke();

    // High dots
    hPts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      ctx.fillStyle = highColor; ctx.fill();
    });
  });
}

/* ── Utilities ──────────────────────────────────────── */
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
let _toastTimer;
function showToastCmp(msg, err=false) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'show' + (err ? ' error' : '');
  clearTimeout(_toastTimer); _toastTimer = setTimeout(() => { el.className=''; }, 3000);
}
window.addEventListener('resize', () => {
  clearTimeout(window._cmpRT);
  window._cmpRT = setTimeout(() => {
    if (CMPSTATE.weatherA && CMPSTATE.weatherB) renderComparison();
  }, 200);
});
