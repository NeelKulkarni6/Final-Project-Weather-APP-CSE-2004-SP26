'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Weather History (Time Machine)
   Open-Meteo archive API has a ~5-day data lag.
   Max selectable date is therefore 5 days ago.
   ════════════════════════════════════════════════════════ */

const TMSTATE = { location: null, unit: 'F', lastDate: null };

document.addEventListener('DOMContentLoaded', tmInit);

function tmInit() {
  TMSTATE.unit     = lsGet(LS.UNIT, 'F');
  TMSTATE.location = lsGet(LS.LOCATION, {
    name: 'St. Louis', state: 'Missouri', country: 'US',
    lat: 38.627, lon: -90.197, timezone: 'America/Chicago',
  });

  // Sync unit toggle
  document.querySelectorAll('.unit-opt').forEach(o =>
    o.classList.toggle('active', o.dataset.unit === TMSTATE.unit)
  );
  document.getElementById('unit-toggle').addEventListener('click', e => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === TMSTATE.unit) return;
    TMSTATE.unit = opt.dataset.unit;
    lsSet(LS.UNIT, TMSTATE.unit);
    document.querySelectorAll('.unit-opt').forEach(o =>
      o.classList.toggle('active', o.dataset.unit === TMSTATE.unit)
    );
    if (TMSTATE.lastDate) fetchHistoricalWeather(TMSTATE.lastDate);
  });

  // Location label
  const loc = TMSTATE.location;
  setText('tm-location', loc.name + (loc.state ? ', ' + loc.state : ''));

  // Archive API has ~5-day lag — set max to 6 days ago to be safe
  const today    = new Date();
  const fmt      = d => d.toISOString().split('T')[0];
  const maxDate  = new Date(today); maxDate.setDate(today.getDate() - 6);
  const defDate  = new Date(today); defDate.setDate(today.getDate() - 14);
  const minDate  = new Date(today); minDate.setFullYear(today.getFullYear() - 1);

  const picker = document.getElementById('tm-date');
  picker.max   = fmt(maxDate);
  picker.min   = fmt(minDate);
  picker.value = fmt(defDate);

  document.getElementById('tm-go').addEventListener('click', () => {
    const date = picker.value;
    if (date) fetchHistoricalWeather(date);
  });
  picker.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('tm-go').click();
  });

  // Auto-load on open
  fetchHistoricalWeather(fmt(defDate));
}

async function fetchHistoricalWeather(dateStr) {
  TMSTATE.lastDate = dateStr;
  const loc = TMSTATE.location;
  const resultEl = document.getElementById('tm-result');
  const errorEl  = document.getElementById('tm-error');
  if (resultEl) resultEl.style.display = 'none';
  if (errorEl)  errorEl.style.display  = 'none';
  document.getElementById('loading-overlay').classList.add('active');

  try {
    const DAILY = [
      'weather_code','temperature_2m_max','temperature_2m_min',
      'precipitation_sum','wind_speed_10m_max','wind_gusts_10m_max',
      'sunrise','sunset','precipitation_hours','sunshine_duration',
    ].join(',');
    const HOURLY = [
      'temperature_2m','precipitation','wind_speed_10m',
      'weather_code','relative_humidity_2m','apparent_temperature',
    ].join(',');

    const params = new URLSearchParams({
      latitude: loc.lat, longitude: loc.lon,
      start_date: dateStr, end_date: dateStr,
      daily: DAILY, hourly: HOURLY, timezone: 'auto',
    });

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?${params}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // Validate we got actual data
    if (!data.daily || !data.daily.weather_code || data.daily.weather_code.length === 0) {
      throw new Error('No data for this date — it may be too recent for the archive.');
    }

    if (data.timezone) TMSTATE.location.timezone = data.timezone;
    renderTimeMachineResult(data, dateStr);

  } catch (err) {
    console.error('Archive fetch error:', err);
    const msg = err.name === 'AbortError'
      ? 'Request timed out. Check your connection and try again.'
      : err.message.includes('No data')
        ? err.message
        : 'Could not load data. Try a date at least one week ago.';
    setText('tm-error-msg', msg);
    if (errorEl) errorEl.style.display = '';
  } finally {
    document.getElementById('loading-overlay').classList.remove('active');
  }
}

function renderTimeMachineResult(data, dateStr) {
  const d   = data.daily;
  const h   = data.hourly;
  const u   = TMSTATE.unit;
  const tz  = TMSTATE.location.timezone;
  const code = d.weather_code[0] ?? 0;
  const info = getWeatherInfo(code);

  // Date labels
  const dateObj   = new Date(dateStr + 'T12:00:00Z');
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(dateObj);
  const daysAgo   = Math.round((Date.now() - dateObj.getTime()) / 86400000);
  const agoLabel  = daysAgo < 7 ? daysAgo + ' days ago'
    : daysAgo < 14 ? '1 week ago'
    : daysAgo < 60 ? Math.round(daysAgo/7) + ' weeks ago'
    : daysAgo < 370 ? Math.round(daysAgo/30) + ' months ago'
    : 'About a year ago';

  setText('tm-date-label',   dateLabel);
  setText('tm-ago-label',    agoLabel);
  setText('tm-condition',    info.label);
  setText('tm-icon',         info.emoji);
  setText('tm-high',         convertTemp(d.temperature_2m_max[0], u) + '\u00b0' + u);
  setText('tm-low',          convertTemp(d.temperature_2m_min[0], u) + '\u00b0' + u);
  setText('tm-precip',       (d.precipitation_sum[0] ?? 0).toFixed(1) + ' mm');
  setText('tm-wind-max',     kmhToMph(d.wind_speed_10m_max[0] ?? 0) + ' mph');
  setText('tm-gusts',        kmhToMph(d.wind_gusts_10m_max[0] ?? 0) + ' mph');
  setText('tm-sunshine',     Math.round((d.sunshine_duration[0] ?? 0) / 3600) + ' hrs');
  setText('tm-precip-hours', (d.precipitation_hours[0] ?? 0) + ' hrs');
  setText('tm-sunrise',      formatSunTime(d.sunrise[0], tz));
  setText('tm-sunset',       formatSunTime(d.sunset[0],  tz));

  // Hourly chart
  drawTMChart(h, u);

  // Narrative
  const hi     = convertTemp(d.temperature_2m_max[0], u);
  const lo     = convertTemp(d.temperature_2m_min[0], u);
  const precip = d.precipitation_sum[0] ?? 0;
  const wind   = kmhToMph(d.wind_speed_10m_max[0] ?? 0);
  const sun    = Math.round((d.sunshine_duration[0] ?? 0) / 3600);
  const hot    = u === 'F' ? hi >= 85 : hi >= 29;
  const cold   = u === 'F' ? hi < 45  : hi < 7;
  const tempWord = hot ? 'a hot' : cold ? 'a cold' : (u === 'F' ? hi >= 70 : hi >= 21) ? 'a warm' : 'a mild';

  let narrative = `${agoLabel} in ${TMSTATE.location.name}, it was ${tempWord} day with ${info.label.toLowerCase()}. `;
  narrative += `Temperatures ranged from a high of ${hi}\u00b0${u} down to ${lo}\u00b0${u}. `;
  if (precip > 10)     narrative += `Heavy precipitation totaling ${precip.toFixed(1)}\u00a0mm fell over ${d.precipitation_hours[0] ?? 0} hours. `;
  else if (precip > 0) narrative += `Light precipitation of ${precip.toFixed(1)}\u00a0mm was recorded. `;
  else                 narrative += 'No precipitation was recorded. ';
  if (wind > 30) narrative += `It was a windy day, with gusts reaching ${kmhToMph(d.wind_gusts_10m_max[0] ?? 0)} mph.`;
  else           narrative += `Winds were calm, peaking at ${wind} mph.`;
  if (sun > 0)   narrative += ` There were about ${sun} hour${sun !== 1 ? 's' : ''} of sunshine.`;
  setText('tm-narrative', narrative);

  document.getElementById('tm-result').style.display = '';
}

function drawTMChart(hourly, unit) {
  const canvas = document.getElementById('tm-chart');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = Math.max(200, canvas.parentElement.clientWidth - 4);
  const cssH = 180;
  canvas.width  = cssW * dpr;  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const temps = hourly.temperature_2m.map(v => convertTemp(v ?? 0, unit));
  const prec  = hourly.precipitation.map(v => v ?? 0);
  const n     = temps.length;
  if (!n) return;

  const PAD  = { top: 14, bottom: 28, left: 8, right: 68 };
  const iW   = cssW - PAD.left - PAD.right;
  const iH   = cssH - PAD.top  - PAD.bottom;
  const minV = Math.min(...temps) - 3;
  const maxV = Math.max(...temps) + 3;
  const xOf  = i => PAD.left + (i / Math.max(n - 1, 1)) * iW;
  const yOf  = v => PAD.top  + (1 - (v - minV) / (maxV - minV)) * iH;

  // Y-axis
  const step = Math.max(2, Math.ceil((maxV - minV) / 4));
  ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'right';
  for (let v = Math.round(minV); v <= maxV; v += step) {
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(cssW - PAD.right, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.fillText(`${v}\u00b0`, cssW - 6, y + 3.5);
  }

  // X-axis (every 6 hours)
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.textAlign = 'center';
  for (let i = 0; i < n; i += 6) {
    const hr = i % 24;
    const label = hr === 0 ? '12 AM' : hr === 12 ? '12 PM' : hr < 12 ? hr + ' AM' : (hr - 12) + ' PM';
    ctx.fillText(label, xOf(i), cssH - PAD.bottom + 14);
  }

  // Precip bars
  const maxP = Math.max(...prec, 0.1);
  prec.forEach((p, i) => {
    if (p <= 0) return;
    const barH = Math.min((p / maxP) * iH * 0.28, iH * 0.28);
    ctx.fillStyle = 'rgba(100,181,246,0.28)';
    ctx.fillRect(xOf(i) - 3, cssH - PAD.bottom - barH, 6, barH);
  });

  // Temp fill
  const pts  = temps.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
  const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + iH);
  grad.addColorStop(0, 'rgba(255,171,64,0.50)');
  grad.addColorStop(1, 'rgba(255,171,64,0.03)');
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else {
      const xc = (pts[i-1].x + p.x) / 2, yc = (pts[i-1].y + p.y) / 2;
      ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, xc, yc);
    }
  });
  ctx.lineTo(xOf(n-1), cssH - PAD.bottom);
  ctx.lineTo(xOf(0), cssH - PAD.bottom);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

  // Temp line
  ctx.beginPath(); ctx.strokeStyle = '#FFAB40'; ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else {
      const xc = (pts[i-1].x + p.x)/2, yc = (pts[i-1].y + p.y)/2;
      ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, xc, yc);
    }
  }); ctx.stroke();
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

window.addEventListener('resize', () => {
  clearTimeout(window._tmRT);
  window._tmRT = setTimeout(() => {
    const r = document.getElementById('tm-result');
    if (r && r.style.display !== 'none' && TMSTATE.lastDate) fetchHistoricalWeather(TMSTATE.lastDate);
  }, 300);
});
