'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Time Machine
   Uses Open-Meteo Archive API to show historical weather
   for any date in the past year at the saved location.
   ════════════════════════════════════════════════════════ */

const TMSTATE = { location: null, unit: 'F' };

document.addEventListener('DOMContentLoaded', tmInit);

function tmInit() {
  TMSTATE.unit     = lsGet(LS.UNIT, 'F');
  TMSTATE.location = lsGet(LS.LOCATION, {
    name:'St. Louis', state:'Missouri', country:'US',
    lat:38.627, lon:-90.197, timezone:'America/Chicago',
  });

  const loc  = TMSTATE.location;
  const el   = document.getElementById('tm-location');
  if (el) el.textContent = loc.name + (loc.state ? ', ' + loc.state : '');

  // Constrain date picker: yesterday to 1 year ago
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const oneYearAgo = new Date(today); oneYearAgo.setFullYear(today.getFullYear() - 1);
  const fmt = d => d.toISOString().split('T')[0];
  const picker = document.getElementById('tm-date');
  picker.max = fmt(yesterday);
  picker.min = fmt(oneYearAgo);
  picker.value = fmt(yesterday);

  document.getElementById('tm-go').addEventListener('click', () => {
    const date = document.getElementById('tm-date').value;
    if (date) fetchHistoricalWeather(date);
  });
  document.getElementById('tm-date').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('tm-go').click();
  });

  // Load yesterday on open
  fetchHistoricalWeather(fmt(yesterday));
}

async function fetchHistoricalWeather(dateStr) {
  const loc = TMSTATE.location;
  document.getElementById('tm-result').style.display = 'none';
  document.getElementById('tm-loading').classList.add('active');

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
    const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
    if (!res.ok) throw new Error('Archive API ' + res.status);
    const data = await res.json();
    if (data.timezone) TMSTATE.location.timezone = data.timezone;
    renderTimeMachineResult(data, dateStr);
  } catch (err) {
    console.error(err);
    document.getElementById('tm-error').style.display = '';
  } finally {
    document.getElementById('tm-loading').classList.remove('active');
  }
}

function renderTimeMachineResult(data, dateStr) {
  const d    = data.daily;
  const h    = data.hourly;
  const u    = TMSTATE.unit;
  const tz   = TMSTATE.location.timezone;
  const info = getWeatherInfo(d.weather_code[0]);

  // Format date header
  const dateObj  = new Date(dateStr + 'T12:00:00Z');
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC'
  }).format(dateObj);

  // How long ago
  const daysAgo = Math.round((Date.now() - dateObj.getTime()) / 86400000);
  let agoLabel = '';
  if (daysAgo === 1) agoLabel = 'Yesterday';
  else if (daysAgo < 7) agoLabel = daysAgo + ' days ago';
  else if (daysAgo < 14) agoLabel = '1 week ago';
  else if (daysAgo < 60) agoLabel = Math.round(daysAgo/7) + ' weeks ago';
  else if (daysAgo < 365) agoLabel = Math.round(daysAgo/30) + ' months ago';
  else agoLabel = 'About a year ago';

  setText('tm-date-label',    dateLabel);
  setText('tm-ago-label',     agoLabel);
  setText('tm-condition',     info.label);
  setText('tm-high',          convertTemp(d.temperature_2m_max[0], u) + '\u00b0' + u);
  setText('tm-low',           convertTemp(d.temperature_2m_min[0], u) + '\u00b0' + u);
  setText('tm-precip',        d.precipitation_sum[0].toFixed(1) + ' mm');
  setText('tm-wind-max',      kmhToMph(d.wind_speed_10m_max[0]) + ' mph');
  setText('tm-gusts',         kmhToMph(d.wind_gusts_10m_max[0]) + ' mph');
  setText('tm-sunshine',      Math.round((d.sunshine_duration[0]||0)/3600) + ' hrs');
  setText('tm-precip-hours',  (d.precipitation_hours[0]||0) + ' hrs');
  setText('tm-sunrise',       formatSunTime(d.sunrise[0], tz));
  setText('tm-sunset',        formatSunTime(d.sunset[0],  tz));

  // Weather icon
  const iconEl = document.getElementById('tm-icon');
  if (iconEl) iconEl.textContent = info.emoji;

  // Hourly temperature chart
  drawTMChart(h, u, tz);

  // Generate a narrative summary
  const hi  = convertTemp(d.temperature_2m_max[0], u);
  const lo  = convertTemp(d.temperature_2m_min[0], u);
  const precip = d.precipitation_sum[0];
  const wind   = kmhToMph(d.wind_speed_10m_max[0]);
  const sun    = Math.round((d.sunshine_duration[0]||0)/3600);
  const tempWord = u === 'F'
    ? (hi >= 95 ? 'scorching' : hi >= 85 ? 'hot' : hi >= 75 ? 'warm'
    :  hi >= 60 ? 'mild'      : hi >= 45 ? 'cool': hi >= 32 ? 'cold' : 'frigid')
    : (hi >= 35 ? 'scorching' : hi >= 29 ? 'hot' : hi >= 24 ? 'warm'
    :  hi >= 16 ? 'mild'      : hi >= 7  ? 'cool': hi >= 0  ? 'cold' : 'frigid');
  let narrative = `${agoLabel}, ${TMSTATE.location.name} had a ${tempWord} day with ${info.label.toLowerCase()}. `;
  narrative += `The high reached ${hi}\u00b0${u} and the low dropped to ${lo}\u00b0${u}. `;
  if (precip > 10) narrative += `Heavy precipitation totaling ${precip.toFixed(1)} mm fell over ${d.precipitation_hours[0]||0} hours. `;
  else if (precip > 1) narrative += `Light precipitation of ${precip.toFixed(1)} mm was recorded. `;
  else narrative += `No significant precipitation was recorded. `;
  if (wind > 30) narrative += `Winds were gusty, peaking at ${wind} mph.`;
  else narrative += `Winds were calm, peaking at ${wind} mph.`;
  if (sun > 0) narrative += ` There was approximately ${sun} hour${sun !== 1 ? 's' : ''} of sunshine.`;
  setText('tm-narrative', narrative);

  document.getElementById('tm-result').style.display = '';
  document.getElementById('tm-error').style.display = 'none';
}

function drawTMChart(hourly, unit, tz) {
  const canvas = document.getElementById('tm-chart');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 4;
  const cssH = 180;
  canvas.width  = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  const vals = hourly.temperature_2m.map(v => convertTemp(v, unit));
  const prec = hourly.precipitation;
  const n    = vals.length;
  if (!n) return;

  const PAD  = { top:16, bottom:28, left:10, right:72 };
  const iW   = cssW - PAD.left - PAD.right;
  const iH   = cssH - PAD.top - PAD.bottom;
  const minV = Math.min(...vals) - 3;
  const maxV = Math.max(...vals) + 3;
  const xOf  = i => PAD.left + (i / Math.max(n-1,1)) * iW;
  const yOf  = v => PAD.top  + (1 - (v-minV)/(maxV-minV)) * iH;

  // Y-axis ticks
  const step = Math.max(2, Math.ceil((maxV-minV)/4));
  ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'right';
  for (let v = Math.round(minV); v <= maxV; v += step) {
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(cssW-PAD.right, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.fillText(`${v}\u00b0`, cssW - 6, y + 3.5);
  }

  // X-axis labels (every 6h)
  ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.textAlign = 'center'; ctx.font = '10px DM Sans,sans-serif';
  for (let i = 0; i < n; i += 6) {
    const hr = i % 24;
    const label = hr === 0 ? '12 AM' : hr === 12 ? '12 PM' : hr < 12 ? hr + ' AM' : (hr-12) + ' PM';
    ctx.fillText(label, xOf(i), cssH - PAD.bottom + 14);
  }

  // Precip bars (behind line)
  const maxP = Math.max(...prec, 1);
  prec.forEach((p, i) => {
    if (p <= 0) return;
    const barH = (p / maxP) * iH * 0.3;
    ctx.fillStyle = 'rgba(100,181,246,0.3)';
    ctx.fillRect(xOf(i) - 3, cssH - PAD.bottom - barH, 6, barH);
  });

  // Temperature area fill
  const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top+iH);
  grad.addColorStop(0, 'rgba(255,171,64,0.55)');
  grad.addColorStop(1, 'rgba(255,171,64,0.03)');
  const pts = vals.map((v,i) => ({x:xOf(i), y:yOf(v)}));
  ctx.beginPath();
  pts.forEach((p,i) => {
    if (i===0) ctx.moveTo(p.x, p.y);
    else {
      const xc = (pts[i-1].x + p.x)/2, yc = (pts[i-1].y + p.y)/2;
      ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, xc, yc);
    }
  });
  ctx.lineTo(xOf(n-1), cssH-PAD.bottom);
  ctx.lineTo(xOf(0), cssH-PAD.bottom);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Temp line
  ctx.beginPath(); ctx.strokeStyle = '#FFAB40'; ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  pts.forEach((p,i) => {
    if (i===0) ctx.moveTo(p.x,p.y);
    else { const xc=(pts[i-1].x+p.x)/2, yc=(pts[i-1].y+p.y)/2; ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,xc,yc); }
  }); ctx.stroke();
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
window.addEventListener('resize', () => {
  clearTimeout(window._tmRT);
  window._tmRT = setTimeout(() => {
    const h = document.getElementById('tm-result');
    if (h && h.style.display !== 'none') {
      const date = document.getElementById('tm-date').value;
      if (date) fetchHistoricalWeather(date);
    }
  }, 300);
});
