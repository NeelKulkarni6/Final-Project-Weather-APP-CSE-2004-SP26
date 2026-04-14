'use strict';

const ASTATE = {
  aq: null, weather: null, location: null, unit: 'F',
};

document.addEventListener('DOMContentLoaded', aqiInit);

async function aqiInit() {
  ASTATE.unit     = lsGet(LS.UNIT, 'F');
  ASTATE.location = lsGet(LS.LOCATION, {
    name:'St. Louis',state:'Missouri',country:'US',
    lat:38.627,lon:-90.197,timezone:'America/Chicago',
  });

  syncUnitAQI();
  document.getElementById('unit-toggle').addEventListener('click', e => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === ASTATE.unit) return;
    ASTATE.unit = opt.dataset.unit; lsSet(LS.UNIT, ASTATE.unit); syncUnitAQI();
  });

  const loc  = ASTATE.location;
  const name = loc.name + (loc.state ? ', ' + loc.state : '');
  const el   = document.getElementById('page-city');
  if (el) el.textContent = name;

  showLoadingAQI();
  try {
    const [aq, weather] = await Promise.all([
      API.fetchAirQuality(loc.lat, loc.lon),
      API.fetchWeather(loc.lat, loc.lon),
    ]);
    ASTATE.aq = aq; ASTATE.weather = weather;
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
    hideLoadingAQI();
  }
}

function applyBgAQI() {
  const c = ASTATE.weather.current;
  document.getElementById('weather-bg').className = getBgClass(c.weather_code, c.is_day);
}

function renderAQIHero() {
  const c   = ASTATE.aq.current;
  const aqi = Math.round(c.us_aqi ?? 0);
  const cat = aqiCategory(aqi);
  setAQIText('aqi-number',   aqi);
  setAQIText('aqi-category', cat.label);
  setAQIText('aqi-guidance', getGuidance(aqi));
  // Animate ring
  const CIRC = 2 * Math.PI * 70;
  const pct  = Math.min(aqi / 300, 1);
  const arc  = document.getElementById('aqi-arc');
  if (arc) {
    arc.style.stroke = cat.color;
    let start = null;
    const tick = ts => {
      if (!start) start = ts;
      const p = Math.min((ts-start)/1500, 1);
      const e = 1-Math.pow(1-p,3);
      arc.style.strokeDashoffset = CIRC - CIRC*pct*e;
      if (p<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

function getGuidance(aqi) {
  if (aqi<=50)  return 'Air quality is satisfactory. Enjoy outdoor activities freely.';
  if (aqi<=100) return 'Acceptable quality. Sensitive individuals should limit prolonged outdoor exertion.';
  if (aqi<=150) return 'Sensitive groups may experience health effects. Reduce prolonged outdoor activity.';
  if (aqi<=200) return 'Everyone may experience health effects. Reduce prolonged outdoor activity.';
  if (aqi<=300) return 'Health alert. Avoid all outdoor exertion if possible.';
  return 'Hazardous. Everyone should avoid outdoor exertion immediately.';
}

function renderPollutants() {
  const c = ASTATE.aq.current;
  const MAXES = { pm25:150, pm10:250, ozone:400, no2:200, so2:350, co:10000 };
  renderPoll('pm25',  c.pm2_5,            MAXES.pm25);
  renderPoll('pm10',  c.pm10,             MAXES.pm10);
  renderPoll('ozone', c.ozone,            MAXES.ozone);
  renderPoll('no2',   c.nitrogen_dioxide, MAXES.no2);
  renderPoll('so2',   c.sulphur_dioxide,  MAXES.so2);
  renderPoll('co',    c.carbon_monoxide,  MAXES.co);
}

function renderPoll(key, value, max) {
  const val = value !== null && value !== undefined ? Math.round(value) : null;
  setAQIText(`${key}-val`, val !== null ? val : '—');
  const bar = document.getElementById(`${key}-bar`);
  if (bar) bar.style.width = val !== null ? Math.min((val/max)*100,100)+'%' : '0%';
}

function renderUVBanner() {
  const c  = ASTATE.aq.current;
  const uv = c.uv_index ?? 0;
  const cat = uvDescription(uv);
  setAQIText('aq-uv-num', Math.round(uv));
  setAQIText('aq-uv-cat', cat.label);
  const el = document.getElementById('aq-uv-cat');
  if (el) el.style.color = cat.color;
  let advice = '';
  if (uv<=2)       advice = 'No protection required.';
  else if (uv<=5)  advice = 'Wear sunscreen SPF 15+ and sunglasses.';
  else if (uv<=7)  advice = 'Reduce time in sun. Wear SPF 30+, hat, and seek shade.';
  else if (uv<=10) advice = 'Extra protection essential. Avoid sun 10 AM–4 PM.';
  else             advice = 'Stay indoors. If outside, apply SPF 50+, wear full coverage.';
  setAQIText('uv-advice', advice);
}

/* ── AQI Hourly Chart (high contrast) ──────────────── */
function renderAQIChart() {
  const canvas = document.getElementById('aqi-chart');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 48 || 600;
  const cssH = 180;
  canvas.width  = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW+'px'; canvas.style.height = cssH+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  drawAQIChart(ctx, cssW, cssH);
}

function drawAQIChart(ctx, W, H) {
  const h    = ASTATE.aq.hourly;
  const tz   = ASTATE.location.timezone;
  const n    = Math.min(48, h.time.length);
  const vals = h.us_aqi.slice(0,n).map(v => v??0);
  if (!vals.length) return;

  const PAD    = {top:22, bottom:34, left:44, right:14};
  const iW     = W - PAD.left - PAD.right;
  const iH     = H - PAD.top  - PAD.bottom;
  const maxVal = Math.max(...vals, 50) + 25;
  const xOf    = i => PAD.left + (i/Math.max(n-1,1))*iW;
  const yOf    = v => PAD.top  + (1-v/maxVal)*iH;

  // Colored zone backgrounds (more visible)
  const zones = [
    {lo:0,   hi:50,  color:'rgba(76,175,80,0.10)'   },
    {lo:50,  hi:100, color:'rgba(255,235,59,0.10)'  },
    {lo:100, hi:150, color:'rgba(255,152,0,0.10)'   },
    {lo:150, hi:200, color:'rgba(244,67,54,0.10)'   },
    {lo:200, hi:300, color:'rgba(156,39,176,0.10)'  },
  ];
  zones.forEach(z => {
    if (z.hi > maxVal) return;
    ctx.fillStyle = z.color;
    ctx.fillRect(PAD.left, yOf(Math.min(z.hi,maxVal)), iW, Math.abs(yOf(z.lo)-yOf(Math.min(z.hi,maxVal))));
  });

  // Grid lines + y-axis (higher contrast)
  ctx.font = '11px DM Sans,sans-serif';
  ctx.textAlign = 'right';
  const aqi_ticks = [0,50,100,150,200].filter(v => v < maxVal);
  const aqi_colors = { 0:'#4CAF50', 50:'#CDDC39', 100:'#FF9800', 150:'#F44336', 200:'#9C27B0' };
  aqi_ticks.forEach(v => {
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(W-PAD.right,y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = aqi_colors[v] ?? 'rgba(255,255,255,0.6)';
    ctx.fillText(v, PAD.left-6, y+4);
  });

  // Gradient fill under curve (bright)
  const grad = ctx.createLinearGradient(0,PAD.top,0,H-PAD.bottom);
  grad.addColorStop(0, 'rgba(79,195,247,0.55)');
  grad.addColorStop(0.6,'rgba(79,195,247,0.20)');
  grad.addColorStop(1, 'rgba(79,195,247,0.02)');

  ctx.beginPath();
  vals.forEach((v,i)=>{
    if (i===0) ctx.moveTo(xOf(i),yOf(v));
    else { const xc=(xOf(i-1)+xOf(i))/2, yc=(yOf(vals[i-1])+yOf(v))/2;
           ctx.quadraticCurveTo(xOf(i-1),yOf(vals[i-1]),xc,yc); }
  });
  ctx.lineTo(xOf(n-1),H-PAD.bottom); ctx.lineTo(xOf(0),H-PAD.bottom); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line (bright cyan, thicker)
  ctx.beginPath(); ctx.strokeStyle='#29B6F6'; ctx.lineWidth=2.8;
  ctx.lineJoin='round'; ctx.lineCap='round';
  vals.forEach((v,i)=>{
    if (i===0) ctx.moveTo(xOf(i),yOf(v));
    else { const xc=(xOf(i-1)+xOf(i))/2, yc=(yOf(vals[i-1])+yOf(v))/2;
           ctx.quadraticCurveTo(xOf(i-1),yOf(vals[i-1]),xc,yc); }
  }); ctx.stroke();

  // Time labels (every 6h)
  ctx.fillStyle='rgba(255,255,255,0.50)'; ctx.font='10.5px DM Sans,sans-serif';
  ctx.textAlign='center';
  for (let i=0; i<n; i+=6) {
    const t = formatHour(h.time[i]+':00', tz);
    ctx.fillText(t, xOf(i), H-PAD.bottom+16);
  }
}

function setAQIText(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function syncUnitAQI() {
  document.querySelectorAll('.unit-opt').forEach(o=>o.classList.toggle('active',o.dataset.unit===ASTATE.unit));
}
function showLoadingAQI() { document.getElementById('loading-overlay').classList.add('active'); }
function hideLoadingAQI() { document.getElementById('loading-overlay').classList.remove('active'); }
let toastTimer=null;
function showToastAQI(msg, err=false) {
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='show'+(err?' error':'');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{el.className='';},3200);
}
window.addEventListener('resize',()=>{
  clearTimeout(window._aqiRT);
  window._aqiRT=setTimeout(()=>{ if(ASTATE.aq) renderAQIChart(); },200);
});
