'use strict';

/* ════════════════════════════════════════════════════════
   Detail Modal — iOS-style hourly charts for all 8 modules
   ════════════════════════════════════════════════════════ */

const DETAIL = { type: null, dayOffset: 0 };

const DETAIL_META = {
  precip:     { icon:'🌧',  title:'Precipitation',  chartH:190 },
  uv:         { icon:'☀️', title:'UV Index',        chartH:230 },
  wind:       { icon:'💨',  title:'Wind',            chartH:220 },
  humidity:   { icon:'💧',  title:'Humidity',        chartH:190 },
  feelslike:  { icon:'🌡',  title:'Feels Like',      chartH:190 },
  visibility: { icon:'👁',  title:'Visibility',      chartH:190 },
  pressure:   { icon:'🔵',  title:'Pressure',        chartH:190 },
  cloud:      { icon:'☁️', title:'Cloud Cover',     chartH:190 },
};

/* ── Public ───────────────────────────────────────── */
function openDetail(type) {
  if (!STATE?.weather) return;
  DETAIL.type = type; DETAIL.dayOffset = 0;
  renderDetailModal();
  document.getElementById('detail-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function initDetailModal() {
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('detail-backdrop').addEventListener('click', closeDetail);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });
}

/* ── Render ───────────────────────────────────────── */
function renderDetailModal() {
  const meta = DETAIL_META[DETAIL.type];
  const tz   = STATE.location.timezone;
  document.getElementById('detail-icon').textContent  = meta.icon;
  document.getElementById('detail-title').textContent = meta.title;
  renderDayStrip(tz);
  const indices = getHoursForDay(DETAIL.dayOffset, tz);
  renderDetailHero(indices);
  requestAnimationFrame(() => renderDetailChart(indices));
  renderDetailSummary(indices);
}

/* ── Day strip ────────────────────────────────────── */
function renderDayStrip(tz) {
  const container = document.getElementById('detail-day-strip');
  container.innerHTML = '';
  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const wd  = new Intl.DateTimeFormat('en-US',{ weekday:'short', timeZone:tz }).format(date);
    const num = new Intl.DateTimeFormat('en-US',{ day:'numeric', timeZone:tz }).format(date);
    const btn = document.createElement('button');
    btn.className = 'detail-day-btn' + (d === DETAIL.dayOffset ? ' selected' : '');
    btn.innerHTML = `<div class="detail-day-weekday">${wd}</div><div class="detail-day-num">${num}</div>`;
    btn.addEventListener('click', () => {
      DETAIL.dayOffset = d;
      document.querySelectorAll('.detail-day-btn').forEach((b,i) => b.classList.toggle('selected', i===d));
      const idx = getHoursForDay(d, tz);
      renderDetailHero(idx); renderDetailChart(idx); renderDetailSummary(idx);
    });
    container.appendChild(btn);
  }
}

/* ── Hero value ───────────────────────────────────── */
function renderDetailHero(indices) {
  const h    = STATE.weather.hourly;
  const u    = STATE.unit;
  const type = DETAIL.type;
  const tz   = STATE.location.timezone;
  if (!indices.length) return;
  const nowIdx = DETAIL.dayOffset === 0 ? findNowIndex(indices) : (indices[12] ?? indices[0]);
  const bigEl  = document.getElementById('detail-big-val');
  const lblEl  = document.getElementById('detail-val-label');
  const subEl  = document.getElementById('detail-val-sub');
  const hvEl   = document.getElementById('detail-hourly-vals');
  hvEl.innerHTML = '';

  if (type === 'precip') {
    const max = Math.max(...indices.map(i => h.precipitation_probability?.[i] ?? 0));
    bigEl.textContent = max; lblEl.textContent = '%';
    subEl.textContent = `${getDayLabel(DETAIL.dayOffset, tz)}'s peak chance`;
    indices.filter((_,i) => i%3===0).forEach(i => {
      const d = document.createElement('div'); d.className='detail-hv-item';
      d.textContent = (h.precipitation_probability?.[i]??0)+'%'; hvEl.appendChild(d);
    });

  } else if (type === 'uv') {
    const maxUV = Math.max(...indices.map(i => h.uv_index?.[i]??0));
    const cat   = uvDescription(maxUV);
    bigEl.textContent = Math.round(maxUV); lblEl.textContent = cat.label; lblEl.style.color = cat.color;
    subEl.textContent = 'WHO UV Index';
    indices.forEach(i => {
      const d = document.createElement('div'); const v = Math.round(h.uv_index?.[i]??0);
      d.className = 'detail-hv-item' + (v===Math.round(maxUV)&&v>0?' peak':'');
      d.textContent = v; hvEl.appendChild(d);
    });

  } else if (type === 'wind') {
    const speeds = indices.map(i => kmhToMph(h.wind_speed_10m?.[i]??0));
    const gusts  = indices.map(i => kmhToMph(h.wind_gusts_10m?.[i]??0));
    bigEl.textContent = `${Math.min(...speeds)}–${Math.max(...speeds)}`;
    lblEl.textContent = 'mph';
    subEl.textContent = `Gusts up to ${Math.max(...gusts)} mph`;

  } else if (type === 'humidity') {
    const v   = h.relative_humidity_2m?.[nowIdx]??0;
    const tempC = h.temperature_2m?.[nowIdx]??20;
    const dew   = Math.round(tempC - ((100-v)/5));
    bigEl.textContent = v; lblEl.textContent = '%';
    subEl.textContent = `Dew point: ${u==='F'?cToF(dew):dew}°${u}`;
    indices.filter((_,i) => i%6===0).forEach(i => {
      const d = document.createElement('div'); d.className='detail-hv-item';
      d.textContent = (h.relative_humidity_2m?.[i]??0)+'%'; hvEl.appendChild(d);
    });

  } else if (type === 'feelslike') {
    const v = convertTemp(h.apparent_temperature?.[nowIdx]??h.temperature_2m?.[nowIdx]??0, u);
    bigEl.textContent = v; lblEl.textContent = `°${u}`;
    subEl.textContent = feelsLikeDescription(
      h.apparent_temperature?.[nowIdx]??0,
      h.temperature_2m?.[nowIdx]??0
    );

  } else if (type === 'visibility') {
    const v = metersToMiles(h.visibility?.[nowIdx]??10000);
    bigEl.textContent = v; lblEl.textContent = 'mi';
    subEl.textContent = visibilityDescription(h.visibility?.[nowIdx]??10000);

  } else if (type === 'pressure') {
    const v = Math.round(h.surface_pressure?.[nowIdx]??1013);
    bigEl.textContent = v; lblEl.textContent = 'hPa';
    subEl.textContent = pressureDescription(v);

  } else if (type === 'cloud') {
    const v = h.cloud_cover?.[nowIdx]??0;
    bigEl.textContent = v; lblEl.textContent = '%';
    subEl.textContent = v > 80 ? 'Overcast' : v > 50 ? 'Mostly cloudy' : v > 20 ? 'Partly cloudy' : 'Clear skies';
  }
}

/* ── Chart dispatch ───────────────────────────────── */
function renderDetailChart(indices) {
  const canvas = document.getElementById('detail-chart');
  if (!canvas || !indices.length) return;
  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth;
  const cssH = DETAIL_META[DETAIL.type].chartH;
  canvas.width  = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW+'px'; canvas.style.height = cssH+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); ctx.clearRect(0,0,cssW,cssH);
  switch (DETAIL.type) {
    case 'precip':     drawPrecipChart    (ctx,cssW,cssH,indices); break;
    case 'uv':         drawUVChart        (ctx,cssW,cssH,indices); break;
    case 'wind':       drawWindChart      (ctx,cssW,cssH,indices); break;
    case 'humidity':   drawHumidityChart  (ctx,cssW,cssH,indices); break;
    case 'feelslike':  drawFeelsLikeChart (ctx,cssW,cssH,indices); break;
    case 'visibility': drawVisibilityChart(ctx,cssW,cssH,indices); break;
    case 'pressure':   drawPressureChart  (ctx,cssW,cssH,indices); break;
    case 'cloud':      drawCloudChart     (ctx,cssW,cssH,indices); break;
  }
}

/* ═══════════════════════════════════════════════════
   CHART DRAWING FUNCTIONS
   ═══════════════════════════════════════════════════ */

/* ── Shared helpers ───────────────────────────────── */
function smoothPath(ctx, pts) {
  if (!pts.length) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length-1; i++) {
    const xc = (pts[i].x+pts[i+1].x)/2, yc = (pts[i].y+pts[i+1].y)/2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  if (pts.length>1) ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
}

function drawAreaChart(ctx, W, H, pts, lineColor, fillColor0, fillColor1, PAD) {
  const iH = H - PAD.top - PAD.bottom;
  // Fill
  const grad = ctx.createLinearGradient(0,PAD.top,0,PAD.top+iH);
  grad.addColorStop(0, fillColor0); grad.addColorStop(1, fillColor1);
  ctx.beginPath(); smoothPath(ctx, pts);
  ctx.lineTo(pts[pts.length-1].x, PAD.top+iH);
  ctx.lineTo(pts[0].x, PAD.top+iH); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  // Line
  ctx.beginPath(); ctx.strokeStyle=lineColor; ctx.lineWidth=2.5;
  ctx.lineJoin='round'; ctx.lineCap='round';
  smoothPath(ctx, pts); ctx.stroke();
}

function drawYAxis(ctx, W, H, PAD, ticks, suffix, yOf) {
  ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='right';
  ticks.forEach(v => {
    const y = yOf(v);
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W-PAD.right, y); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.fillText(`${v}${suffix}`, W-6, y+3.5);
  });
}

function drawXAxis(ctx, H, PAD, indices, tz) {
  ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.40)';
  ctx.font='10px DM Sans,sans-serif';
  const n = indices.length; const iW = ctx.canvas.width/window.devicePixelRatio - PAD.left - PAD.right;
  for (let i=0; i<n; i+=6) {
    const hr = getHourFromHourlyIndex(indices[i]);
    ctx.fillText(String(hr).padStart(2,'0'), PAD.left + (i/(n-1))*iW, H-PAD.bottom+14);
  }
}

/* ── Precipitation ────────────────────────────────── */
function drawPrecipChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => h.precipitation_probability?.[i]??0);
  const n    = vals.length; if(!n) return;
  const PAD  = {top:12, bottom:28, left:10, right:72};
  const iW   = W-PAD.left-PAD.right, iH = H-PAD.top-PAD.bottom;
  const xOf  = i => PAD.left + (i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top  + (1-v/100)*iH;
  const pts  = vals.map((v,i) => ({x:xOf(i), y:yOf(v)}));

  drawYAxis(ctx,W,H,PAD,[0,20,40,60,80,100],'%',yOf);
  // Dashed 40% reference
  ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
  ctx.beginPath(); ctx.moveTo(PAD.left,yOf(40)); ctx.lineTo(W-PAD.right,yOf(40)); ctx.stroke();
  ctx.setLineDash([]);
  drawXAxis(ctx,H,PAD,indices);
  drawAreaChart(ctx,W,H,pts,'#64B5F6','rgba(100,181,246,0.55)','rgba(100,181,246,0.02)',PAD);

  // Peak dot
  const maxV = Math.max(...vals); const pi = vals.indexOf(maxV);
  if (maxV>0) {
    ctx.beginPath(); ctx.arc(xOf(pi),yOf(maxV),4.5,0,Math.PI*2);
    ctx.fillStyle='#64B5F6'; ctx.fill();
    ctx.beginPath(); ctx.arc(xOf(pi),yOf(maxV),2,0,Math.PI*2);
    ctx.fillStyle='white'; ctx.fill();
  }
}

/* ── UV Index ─────────────────────────────────────── */
function drawUVChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => h.uv_index?.[i]??0);
  const n    = vals.length; if(!n) return;
  const PAD  = {top:18, bottom:28, left:10, right:96};
  const iW   = W-PAD.left-PAD.right, iH = H-PAD.top-PAD.bottom;
  const maxY = 12;
  const xOf  = i => PAD.left+(i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top+(1-Math.min(v,maxY)/maxY)*iH;
  const pts  = vals.map((v,i) => ({x:xOf(i),y:yOf(v)}));

  // Category lines
  const cats = [
    {max:2,'label':'Low','color':'#4CAF50'},{max:5,'label':'Moderate','color':'#CDDC39'},
    {max:7,'label':'High','color':'#FF9800'},{max:10,'label':'Very High','color':'#F44336'},
    {max:12,'label':'Extreme','color':'#9C27B0'},
  ];
  ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='right';
  cats.forEach(c => {
    const y=yOf(c.max);
    ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(W-PAD.right,y); ctx.stroke();
    ctx.fillStyle=c.color; ctx.fillText(c.label,W-2,y+3.5);
  });
  drawXAxis(ctx,H,PAD,indices);

  // Gradient fill
  const uvGrad = ctx.createLinearGradient(0,yOf(12),0,yOf(0));
  uvGrad.addColorStop(0,'rgba(76,175,80,0.55)'); uvGrad.addColorStop(0.17,'rgba(76,175,80,0.55)');
  uvGrad.addColorStop(0.42,'rgba(205,220,57,0.55)'); uvGrad.addColorStop(0.58,'rgba(255,152,0,0.55)');
  uvGrad.addColorStop(0.83,'rgba(244,67,54,0.55)'); uvGrad.addColorStop(1,'rgba(156,39,176,0.55)');
  ctx.beginPath(); smoothPath(ctx,pts);
  ctx.lineTo(xOf(n-1),PAD.top+iH); ctx.lineTo(xOf(0),PAD.top+iH); ctx.closePath();
  ctx.fillStyle=uvGrad; ctx.fill();

  // Line
  const maxUV = Math.max(...vals);
  const lc = maxUV<=2?'#4CAF50':maxUV<=5?'#CDDC39':maxUV<=7?'#FF9800':maxUV<=10?'#F44336':'#9C27B0';
  ctx.beginPath(); ctx.strokeStyle=lc; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.lineCap='round';
  smoothPath(ctx,pts); ctx.stroke();

  // Peak dot + label
  const pi = vals.indexOf(maxUV);
  if (maxUV>0) {
    ctx.beginPath(); ctx.arc(xOf(pi),yOf(maxUV),5.5,0,Math.PI*2); ctx.fillStyle=lc; ctx.fill();
    ctx.beginPath(); ctx.arc(xOf(pi),yOf(maxUV),2.5,0,Math.PI*2); ctx.fillStyle='white'; ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='bold 10px DM Sans,sans-serif';
    ctx.textAlign='center'; ctx.fillText(Math.round(maxUV),xOf(pi),yOf(maxUV)-10);
  }
}

/* ── Wind ─────────────────────────────────────────── */
function drawWindChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const spds = indices.map(i => kmhToMph(h.wind_speed_10m?.[i]??0));
  const gsts = indices.map(i => kmhToMph(h.wind_gusts_10m?.[i]??0));
  const dirs = indices.map(i => h.wind_direction_10m?.[i]??0);
  const n    = spds.length; if(!n) return;
  const ARW  = 22;
  const PAD  = {top:ARW+10, bottom:28, left:10, right:46};
  const iW   = W-PAD.left-PAD.right, iH=H-PAD.top-PAD.bottom;
  const maxV = Math.max(...gsts,5)+5;
  const xOf  = i => PAD.left+(i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top+(1-v/maxV)*iH;

  drawYAxis(ctx,W,H,PAD,[0,10,20,30,40].filter(t=>t<=maxV),'',yOf);
  drawXAxis(ctx,H,PAD,indices);

  // Gusts fill
  const gg=ctx.createLinearGradient(0,PAD.top,0,PAD.top+iH);
  gg.addColorStop(0,'rgba(165,214,167,0.22)'); gg.addColorStop(1,'rgba(165,214,167,0.01)');
  ctx.beginPath(); smoothPath(ctx,gsts.map((v,i)=>({x:xOf(i),y:yOf(v)})));
  ctx.lineTo(xOf(n-1),PAD.top+iH); ctx.lineTo(xOf(0),PAD.top+iH); ctx.closePath();
  ctx.fillStyle=gg; ctx.fill();

  // Speed fill
  const sg=ctx.createLinearGradient(0,PAD.top,0,PAD.top+iH);
  sg.addColorStop(0,'rgba(79,195,247,0.35)'); sg.addColorStop(1,'rgba(79,195,247,0.03)');
  ctx.beginPath(); smoothPath(ctx,spds.map((v,i)=>({x:xOf(i),y:yOf(v)})));
  ctx.lineTo(xOf(n-1),PAD.top+iH); ctx.lineTo(xOf(0),PAD.top+iH); ctx.closePath();
  ctx.fillStyle=sg; ctx.fill();

  // Lines
  ctx.beginPath(); ctx.strokeStyle='#A5D6A7'; ctx.lineWidth=1.8; ctx.lineJoin='round';
  smoothPath(ctx,gsts.map((v,i)=>({x:xOf(i),y:yOf(v)}))); ctx.stroke();
  ctx.beginPath(); ctx.strokeStyle='#4FC3F7'; ctx.lineWidth=2.5; ctx.lineJoin='round';
  smoothPath(ctx,spds.map((v,i)=>({x:xOf(i),y:yOf(v)}))); ctx.stroke();

  // Direction arrows
  const step = Math.ceil(n/12);
  for (let i=0; i<n; i+=step) {
    const rad = ((dirs[i]+180)%360-90)*Math.PI/180;
    ctx.save(); ctx.translate(xOf(i), ARW/2+2); ctx.rotate(rad);
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(-3.5,4); ctx.lineTo(0,1); ctx.lineTo(3.5,4);
    ctx.closePath(); ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fill(); ctx.restore();
  }
}

/* ── Humidity ─────────────────────────────────────── */
function drawHumidityChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => h.relative_humidity_2m?.[i]??0);
  const n    = vals.length; if(!n) return;
  const PAD  = {top:12, bottom:28, left:10, right:72};
  const iW   = W-PAD.left-PAD.right, iH=H-PAD.top-PAD.bottom;
  const xOf  = i => PAD.left+(i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top+(1-v/100)*iH;
  const pts  = vals.map((v,i) => ({x:xOf(i),y:yOf(v)}));

  drawYAxis(ctx,W,H,PAD,[0,20,40,60,80,100],'%',yOf);
  drawXAxis(ctx,H,PAD,indices);

  const nowAbs  = DETAIL.dayOffset===0 ? findNowIndex(indices) : -1;
  const relIdx  = nowAbs>=0 ? indices.indexOf(nowAbs) : -1;
  const splitX  = relIdx>=0 ? xOf(relIdx) : W+10;

  // Past (teal)
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,splitX,H); ctx.clip();
  const pg=ctx.createLinearGradient(0,PAD.top,0,PAD.top+iH);
  pg.addColorStop(0,'rgba(38,198,218,0.55)'); pg.addColorStop(1,'rgba(38,198,218,0.02)');
  ctx.beginPath(); smoothPath(ctx,pts);
  ctx.lineTo(pts[n-1].x,PAD.top+iH); ctx.lineTo(pts[0].x,PAD.top+iH); ctx.closePath();
  ctx.fillStyle=pg; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle='#26C6DA'; ctx.lineWidth=2.5; ctx.lineJoin='round';
  smoothPath(ctx,pts); ctx.stroke(); ctx.restore();

  // Future (green)
  ctx.save(); ctx.beginPath(); ctx.rect(splitX,0,W-splitX,H); ctx.clip();
  const fg=ctx.createLinearGradient(0,PAD.top,0,PAD.top+iH);
  fg.addColorStop(0,'rgba(102,187,106,0.55)'); fg.addColorStop(1,'rgba(102,187,106,0.02)');
  ctx.beginPath(); smoothPath(ctx,pts);
  ctx.lineTo(pts[n-1].x,PAD.top+iH); ctx.lineTo(pts[0].x,PAD.top+iH); ctx.closePath();
  ctx.fillStyle=fg; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle='#66BB6A'; ctx.lineWidth=2.5; ctx.lineJoin='round';
  smoothPath(ctx,pts); ctx.stroke(); ctx.restore();

  // Current dot
  if (relIdx>=0) {
    ctx.beginPath(); ctx.arc(xOf(relIdx),yOf(vals[relIdx]),5,0,Math.PI*2);
    ctx.fillStyle='white'; ctx.fill();
    ctx.beginPath(); ctx.arc(xOf(relIdx),yOf(vals[relIdx]),2.5,0,Math.PI*2);
    ctx.fillStyle='#26C6DA'; ctx.fill();
  }
}

/* ── Feels Like ───────────────────────────────────── */
function drawFeelsLikeChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const u    = STATE.unit;
  const raw  = indices.map(i => h.apparent_temperature?.[i] ?? h.temperature_2m?.[i] ?? 0);
  const vals = raw.map(v => convertTemp(v, u));
  const n    = vals.length; if(!n) return;
  const PAD  = {top:12, bottom:28, left:10, right:72};
  const iW   = W-PAD.left-PAD.right, iH=H-PAD.top-PAD.bottom;
  const minV = Math.min(...vals)-5, maxV=Math.max(...vals)+5;
  const xOf  = i => PAD.left+(i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top+(1-(v-minV)/(maxV-minV))*iH;
  const pts  = vals.map((v,i)=>({x:xOf(i),y:yOf(v)}));

  // Y-axis ticks
  const step = Math.ceil((maxV-minV)/4);
  const ticks = [];
  for (let v=Math.round(minV); v<=maxV; v+=step) ticks.push(v);
  drawYAxis(ctx,W,H,PAD,ticks,`°${u}`,yOf);
  drawXAxis(ctx,H,PAD,indices);
  drawAreaChart(ctx,W,H,pts,'#FF8A65','rgba(255,138,101,0.50)','rgba(255,138,101,0.02)',PAD);
}

/* ── Visibility ───────────────────────────────────── */
function drawVisibilityChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => parseFloat(metersToMiles(h.visibility?.[i]??10000)));
  const n    = vals.length; if(!n) return;
  const PAD  = {top:12, bottom:28, left:10, right:72};
  const iW   = W-PAD.left-PAD.right, iH=H-PAD.top-PAD.bottom;
  const maxV = Math.max(Math.max(...vals)+1, 11);
  const xOf  = i => PAD.left+(i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top+(1-Math.min(v,maxV)/maxV)*iH;
  const pts  = vals.map((v,i)=>({x:xOf(i),y:yOf(v)}));
  drawYAxis(ctx,W,H,PAD,[0,2,4,6,8,10],'mi',yOf);
  drawXAxis(ctx,H,PAD,indices);
  drawAreaChart(ctx,W,H,pts,'#80DEEA','rgba(128,222,234,0.50)','rgba(128,222,234,0.02)',PAD);
}

/* ── Pressure ─────────────────────────────────────── */
function drawPressureChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => Math.round(h.surface_pressure?.[i]??1013));
  const n    = vals.length; if(!n) return;
  const PAD  = {top:12, bottom:28, left:10, right:72};
  const iW   = W-PAD.left-PAD.right, iH=H-PAD.top-PAD.bottom;
  const minV = Math.min(...vals)-3, maxV=Math.max(...vals)+3;
  const xOf  = i => PAD.left+(i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top+(1-(v-minV)/(maxV-minV))*iH;
  const pts  = vals.map((v,i)=>({x:xOf(i),y:yOf(v)}));
  const ticks = [];
  const step = Math.max(2, Math.ceil((maxV-minV)/4));
  for (let v=Math.round(minV); v<=maxV; v+=step) ticks.push(v);
  drawYAxis(ctx,W,H,PAD,ticks,'hPa',yOf);
  drawXAxis(ctx,H,PAD,indices);
  drawAreaChart(ctx,W,H,pts,'#CE93D8','rgba(206,147,216,0.50)','rgba(206,147,216,0.02)',PAD);
}

/* ── Cloud Cover ──────────────────────────────────── */
function drawCloudChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => h.cloud_cover?.[i]??0);
  const n    = vals.length; if(!n) return;
  const PAD  = {top:12, bottom:28, left:10, right:72};
  const iW   = W-PAD.left-PAD.right, iH=H-PAD.top-PAD.bottom;
  const xOf  = i => PAD.left+(i/Math.max(n-1,1))*iW;
  const yOf  = v => PAD.top+(1-v/100)*iH;
  const pts  = vals.map((v,i)=>({x:xOf(i),y:yOf(v)}));
  drawYAxis(ctx,W,H,PAD,[0,25,50,75,100],'%',yOf);
  drawXAxis(ctx,H,PAD,indices);
  drawAreaChart(ctx,W,H,pts,'#B0BEC5','rgba(176,190,197,0.50)','rgba(176,190,197,0.02)',PAD);
}

/* ── Summary text ─────────────────────────────────── */
function renderDetailSummary(indices) {
  const h   = STATE.weather.hourly;
  const d   = STATE.weather.daily;
  const tz  = STATE.location.timezone;
  const u   = STATE.unit;
  const day = getDayLabel(DETAIL.dayOffset, tz);
  const el  = document.getElementById('detail-summary-text');
  let text  = '';

  if (DETAIL.type === 'precip') {
    const max = Math.max(...indices.map(i => h.precipitation_probability?.[i]??0));
    const sum = (d.precipitation_sum?.[DETAIL.dayOffset]??0).toFixed(1);
    text = max>=70 ? `High rain probability on ${day}. Expect ${sum}mm total.`
         : max>=40 ? `Moderate rain chance on ${day}. Keep an umbrella handy.`
                   : `${day} stays mostly dry with precipitation below 40%.`;
  } else if (DETAIL.type === 'uv') {
    const maxUV = Math.max(...indices.map(i => h.uv_index?.[i]??0));
    const cat   = uvDescription(maxUV);
    text = `${day} UV index peaks at ${Math.round(maxUV)} (${cat.label}). ` +
      (maxUV>=3 ? 'Sun protection recommended 8 AM–4 PM.' : 'No special precautions needed.');
  } else if (DETAIL.type === 'wind') {
    const mx  = kmhToMph(Math.max(...indices.map(i => h.wind_speed_10m?.[i]??0)));
    const mn  = kmhToMph(Math.min(...indices.map(i => h.wind_speed_10m?.[i]??0)));
    const gst = kmhToMph(Math.max(...indices.map(i => h.wind_gusts_10m?.[i]??0)));
    text = `${day} winds range from ${mn} to ${mx} mph, with gusts up to ${gst} mph.`;
  } else if (DETAIL.type === 'humidity') {
    const avg  = Math.round(indices.reduce((s,i)=>s+(h.relative_humidity_2m?.[i]??0),0)/indices.length);
    text = `Average humidity on ${day} is ${avg}% (${humidityDescription(avg).toLowerCase()}).`;
  } else if (DETAIL.type === 'feelslike') {
    const max = convertTemp(Math.max(...indices.map(i=>h.apparent_temperature?.[i]??-99)),u);
    const min = convertTemp(Math.min(...indices.map(i=>h.apparent_temperature?.[i]??99)),u);
    text = `Apparent temperature on ${day} ranges from ${min}° to ${max}°${u}.`;
  } else if (DETAIL.type === 'visibility') {
    const avg = Math.round(indices.reduce((s,i)=>s+(parseFloat(metersToMiles(h.visibility?.[i]??10000))),0)/indices.length*10)/10;
    text = `Average visibility on ${day} is ${avg} miles. ${visibilityDescription(avg*1609.34)}.`;
  } else if (DETAIL.type === 'pressure') {
    const avg = Math.round(indices.reduce((s,i)=>s+(h.surface_pressure?.[i]??1013),0)/indices.length);
    text = `Average pressure on ${day} is ${avg} hPa. ${pressureDescription(avg)}.`;
  } else if (DETAIL.type === 'cloud') {
    const avg = Math.round(indices.reduce((s,i)=>s+(h.cloud_cover?.[i]??0),0)/indices.length);
    text = `Average cloud cover on ${day} is ${avg}%. ` +
      (avg>80?'Expect overcast skies all day.':avg>50?'Mostly cloudy conditions.':'Partly cloudy to clear skies.');
  }

  el.textContent = text;
}

/* ── Utilities ────────────────────────────────────── */
function getHoursForDay(dayOffset, timezone) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const dayStr = new Intl.DateTimeFormat('en-CA',{
    year:'numeric',month:'2-digit',day:'2-digit', timeZone:timezone
  }).format(date);
  return (STATE.weather?.hourly.time ?? []).reduce((acc,t,i) => {
    if (t.startsWith(dayStr)) acc.push(i); return acc;
  }, []);
}

function findNowIndex(indices) {
  const tz    = STATE.location.timezone;
  const parts = new Intl.DateTimeFormat('en-US',{
    timeZone:tz, year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit', hour12:false,
  }).formatToParts(new Date()).reduce((a,p)=>{a[p.type]=p.value;return a;},{});
  const hr  = parts.hour==='24'?'00':parts.hour;
  const key = `${parts.year}-${parts.month}-${parts.day}T${hr}:00`;
  const abs = STATE.weather.hourly.time.indexOf(key);
  if (abs<0) return indices[0];
  return indices.includes(abs) ? abs : indices[0];
}

function getHourFromHourlyIndex(idx) {
  return parseInt((STATE.weather?.hourly.time[idx]??'T00').split('T')[1]??'0');
}

function getDayLabel(offset, tz) {
  if (offset===0) return 'Today'; if (offset===1) return 'Tomorrow';
  const d = new Date(); d.setDate(d.getDate()+offset);
  return new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:tz}).format(d);
}
