'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Detail Modal (iOS-style hourly charts)
   Handles: Precipitation · UV Index · Wind · Humidity
   ════════════════════════════════════════════════════════ */

const DETAIL = {
  type:      null,   // 'precip' | 'uv' | 'wind' | 'humidity'
  dayOffset: 0,      // 0 = today
};

const DETAIL_META = {
  precip:   { icon: '🌧',  title: 'Precipitation',  chartH: 190 },
  uv:       { icon: '☀️',  title: 'UV Index',        chartH: 230 },
  wind:     { icon: '💨',  title: 'Wind',            chartH: 220 },
  humidity: { icon: '💧',  title: 'Humidity',        chartH: 190 },
};

/* ── Public API ──────────────────────────────────────── */
function openDetail(type) {
  if (!STATE?.weather) return;
  DETAIL.type      = type;
  DETAIL.dayOffset = 0;
  renderDetailModal();
  document.getElementById('detail-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Init listeners (called once from app.js) ─────────── */
function initDetailModal() {
  document.getElementById('detail-close')
    .addEventListener('click', closeDetail);
  document.getElementById('detail-backdrop')
    .addEventListener('click', closeDetail);

  // Swipe-down to dismiss
  let startY = 0;
  const sheet = document.querySelector('.detail-sheet');
  sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - startY > 80) closeDetail();
  }, { passive: true });
}

/* ── Render ──────────────────────────────────────────── */
function renderDetailModal() {
  const meta = DETAIL_META[DETAIL.type];
  const w    = STATE.weather;
  const tz   = STATE.location.timezone;

  // Header
  document.getElementById('detail-icon').textContent  = meta.icon;
  document.getElementById('detail-title').textContent = meta.title;

  // Day strip
  renderDayStrip(w, tz);

  // Main value + chart
  const indices = getHoursForDay(DETAIL.dayOffset, tz);
  renderDetailHero(indices);
  requestAnimationFrame(() => renderDetailChart(indices));
  renderDetailSummary(indices);
}

/* ── Day strip ───────────────────────────────────────── */
function renderDayStrip(w, tz) {
  const container = document.getElementById('detail-day-strip');
  container.innerHTML = '';

  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);

    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short', timeZone: tz,
    }).format(date);

    const dayNum = new Intl.DateTimeFormat('en-US', {
      day: 'numeric', timeZone: tz,
    }).format(date);

    const btn = document.createElement('button');
    btn.className  = 'detail-day-btn' + (d === DETAIL.dayOffset ? ' selected' : '');
    btn.innerHTML  = `
      <div class="detail-day-weekday">${weekday}</div>
      <div class="detail-day-num">${dayNum}</div>
    `;
    btn.addEventListener('click', () => {
      DETAIL.dayOffset = d;
      document.querySelectorAll('.detail-day-btn')
        .forEach((b, i) => b.classList.toggle('selected', i === d));
      const idx = getHoursForDay(d, tz);
      renderDetailHero(idx);
      renderDetailChart(idx);
      renderDetailSummary(idx);
    });
    container.appendChild(btn);
  }
}

/* ── Hero values ─────────────────────────────────────── */
function renderDetailHero(indices) {
  const h = STATE.weather.hourly;
  const u = STATE.unit;
  const type = DETAIL.type;
  const tz   = STATE.location.timezone;

  if (!indices.length) return;

  // Use current hour if today, otherwise noon of the selected day
  const nowIdx = type === 'uv' || type === 'precip'
    ? (DETAIL.dayOffset === 0 ? findNowIndex(indices) : indices[12] ?? indices[0])
    : (DETAIL.dayOffset === 0 ? findNowIndex(indices) : indices[0]);

  const bigEl  = document.getElementById('detail-big-val');
  const lblEl  = document.getElementById('detail-val-label');
  const subEl  = document.getElementById('detail-val-sub');
  const hvEl   = document.getElementById('detail-hourly-vals');

  hvEl.innerHTML = '';

  if (type === 'precip') {
    const maxProb = Math.max(...indices.map(i => h.precipitation_probability[i] ?? 0));
    const daily   = STATE.weather.daily;
    const dayPrecip = daily.precipitation_sum?.[DETAIL.dayOffset] ?? 0;
    const dayStr  = getDayLabel(DETAIL.dayOffset, tz);
    bigEl.textContent = `${maxProb}`;
    lblEl.textContent = '%';
    subEl.textContent = `${dayStr}'s peak chance · ${dayPrecip.toFixed(1)} mm total`;

    // Hourly precip values every 3h
    indices.filter((_, i) => i % 3 === 0).forEach(i => {
      const div = document.createElement('div');
      div.className = 'detail-hv-item';
      div.textContent = (h.precipitation_probability[i] ?? 0) + '%';
      hvEl.appendChild(div);
    });

  } else if (type === 'uv') {
    const currentUV = h.uv_index?.[nowIdx] ?? 0;
    const maxUV     = Math.max(...indices.map(i => h.uv_index?.[i] ?? 0));
    const cat       = uvDescription(maxUV);
    bigEl.textContent = Math.round(maxUV);
    lblEl.textContent = cat.label;
    lblEl.style.color = cat.color;
    subEl.textContent = 'World Health Organization UVI';

    // Hourly UV values
    indices.forEach(i => {
      const val = Math.round(h.uv_index?.[i] ?? 0);
      const div = document.createElement('div');
      div.className = 'detail-hv-item' + (val === Math.round(maxUV) && val > 0 ? ' peak' : '');
      div.textContent = val;
      hvEl.appendChild(div);
    });

  } else if (type === 'wind') {
    const speed = kmhToMph(h.wind_speed_10m[nowIdx] ?? 0);
    const gusts = kmhToMph(h.wind_gusts_10m?.[nowIdx] ?? 0);
    const maxSpd = kmhToMph(Math.max(...indices.map(i => h.wind_speed_10m[i] ?? 0)));
    const minSpd = kmhToMph(Math.min(...indices.map(i => h.wind_speed_10m[i] ?? 0)));
    bigEl.textContent = `${minSpd} – ${maxSpd}`;
    lblEl.textContent = 'mph';
    subEl.textContent = `Gusts up to ${gusts} mph`;
    hvEl.innerHTML = ''; // No strip for wind

  } else if (type === 'humidity') {
    const h2    = h.relative_humidity_2m?.[nowIdx] ?? 0;
    const maxH  = Math.max(...indices.map(i => h.relative_humidity_2m?.[i] ?? 0));
    const minH  = Math.min(...indices.map(i => h.relative_humidity_2m?.[i] ?? 0));
    // Dew point estimate (Magnus formula approximation)
    const tempC = h.temperature_2m?.[nowIdx] ?? 20;
    const dewPt = Math.round(tempC - ((100 - h2) / 5));
    const dewF  = u === 'F' ? cToF(dewPt) : dewPt;

    bigEl.textContent = `${h2}`;
    lblEl.textContent = '%';
    subEl.textContent = `Dew point: ${dewF}°${u}`;

    // Hourly humidity every 6h
    indices.filter((_, i) => i % 6 === 0).forEach(i => {
      const div = document.createElement('div');
      div.className = 'detail-hv-item';
      div.textContent = (h.relative_humidity_2m?.[i] ?? 0) + '%';
      hvEl.appendChild(div);
    });
  }
}

/* ── Chart ───────────────────────────────────────────── */
function renderDetailChart(indices) {
  const canvas = document.getElementById('detail-chart');
  if (!canvas || !indices.length) return;

  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth;
  const cssH = DETAIL_META[DETAIL.type].chartH;

  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  switch (DETAIL.type) {
    case 'precip':   drawPrecipChart(ctx, cssW, cssH, indices); break;
    case 'uv':       drawUVChart    (ctx, cssW, cssH, indices); break;
    case 'wind':     drawWindChart  (ctx, cssW, cssH, indices); break;
    case 'humidity': drawHumidityChart(ctx, cssW, cssH, indices); break;
  }
}

/* ─── PRECIPITATION CHART ─────────────────────────────── */
function drawPrecipChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => h.precipitation_probability?.[i] ?? 0);
  const n    = vals.length;
  if (!n) return;

  const PAD  = { top: 12, bottom: 28, left: 10, right: 46 };
  const iW   = W - PAD.left - PAD.right;
  const iH   = H - PAD.top  - PAD.bottom;

  const xOf  = i => PAD.left + (i / Math.max(n - 1, 1)) * iW;
  const yOf  = v => PAD.top + (1 - v / 100) * iH;

  // Grid lines + y-axis labels
  ctx.font      = '10px DM Sans, sans-serif';
  ctx.textAlign = 'right';
  [0, 20, 40, 60, 80, 100].forEach(v => {
    const y = yOf(v);
    ctx.strokeStyle = v === 40 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = v === 40 ? 1.5 : 1;
    ctx.setLineDash(v === 40 ? [4, 3] : []);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right + 2, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillText(`${v}%`, W - 2, y + 3.5);
  });

  // x-axis labels (every 6h)
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < n; i += 6) {
    const hour = getHourFromHourlyIndex(indices[i]);
    ctx.fillText(String(hour).padStart(2, '0'), xOf(i), H - PAD.bottom + 14);
  }

  // Area fill gradient
  const areaGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + iH);
  areaGrad.addColorStop(0,   'rgba(100,181,246,0.55)');
  areaGrad.addColorStop(0.7, 'rgba(100,181,246,0.18)');
  areaGrad.addColorStop(1,   'rgba(100,181,246,0.02)');

  ctx.beginPath();
  smoothPath(ctx, vals.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.lineTo(xOf(n - 1), PAD.top + iH);
  ctx.lineTo(xOf(0),     PAD.top + iH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#64B5F6';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  smoothPath(ctx, vals.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.stroke();

  // Dots at peaks
  const maxV = Math.max(...vals);
  if (maxV > 0) {
    vals.forEach((v, i) => {
      if (v === maxV) {
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#64B5F6';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      }
    });
  }
}

/* ─── UV INDEX CHART ──────────────────────────────────── */
function drawUVChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => h.uv_index?.[i] ?? 0);
  const n    = vals.length;
  if (!n) return;

  const PAD  = { top: 18, bottom: 28, left: 10, right: 76 };
  const iW   = W - PAD.left - PAD.right;
  const iH   = H - PAD.top  - PAD.bottom;
  const maxY = 12;

  const xOf  = i => PAD.left + (i / Math.max(n - 1, 1)) * iW;
  const yOf  = v => PAD.top + (1 - Math.min(v, maxY) / maxY) * iH;

  // Category band lines + labels (right side)
  const UV_CATS = [
    { max: 2,  label: 'Low',       color: '#4CAF50'  },
    { max: 5,  label: 'Moderate',  color: '#CDDC39'  },
    { max: 7,  label: 'High',      color: '#FF9800'  },
    { max: 10, label: 'Very High', color: '#F44336'  },
    { max: 12, label: 'Extreme',   color: '#9C27B0'  },
  ];

  ctx.font      = '10px DM Sans, sans-serif';
  ctx.textAlign = 'right';
  UV_CATS.forEach(cat => {
    const y = yOf(cat.max);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
    ctx.fillStyle = cat.color;
    ctx.fillText(cat.label, W - 2, y + 3.5);
  });

  // x-axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < n; i += 6) {
    const hour = getHourFromHourlyIndex(indices[i]);
    ctx.fillText(String(hour).padStart(2, '0'), xOf(i), H - PAD.bottom + 14);
  }

  // Area gradient fill (fixed vertical gradient, green→yellow→orange→red→purple)
  const uvGrad = ctx.createLinearGradient(0, yOf(12), 0, yOf(0));
  uvGrad.addColorStop(0,    'rgba(76,175,80,0.55)');
  uvGrad.addColorStop(0.17, 'rgba(76,175,80,0.55)');
  uvGrad.addColorStop(0.42, 'rgba(205,220,57,0.55)');
  uvGrad.addColorStop(0.58, 'rgba(255,152,0,0.55)');
  uvGrad.addColorStop(0.83, 'rgba(244,67,54,0.55)');
  uvGrad.addColorStop(1,    'rgba(156,39,176,0.55)');

  ctx.beginPath();
  smoothPath(ctx, vals.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.lineTo(xOf(n - 1), PAD.top + iH);
  ctx.lineTo(xOf(0),     PAD.top + iH);
  ctx.closePath();
  ctx.fillStyle = uvGrad;
  ctx.fill();

  // Line (colored by peak UV)
  const maxUV = Math.max(...vals);
  const lineColor = maxUV <= 2 ? '#4CAF50' : maxUV <= 5 ? '#CDDC39' :
                    maxUV <= 7 ? '#FF9800' : maxUV <= 10 ? '#F44336' : '#9C27B0';
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  smoothPath(ctx, vals.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.stroke();

  // Peak dot
  const peakIdx = vals.indexOf(maxUV);
  if (maxUV > 0) {
    ctx.beginPath();
    ctx.arc(xOf(peakIdx), yOf(maxUV), 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(xOf(peakIdx), yOf(maxUV), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    // Peak label above
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font      = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(maxUV), xOf(peakIdx), yOf(maxUV) - 10);
  }
}

/* ─── WIND CHART ──────────────────────────────────────── */
function drawWindChart(ctx, W, H, indices) {
  const h         = STATE.weather.hourly;
  const speeds    = indices.map(i => kmhToMph(h.wind_speed_10m?.[i]  ?? 0));
  const gusts     = indices.map(i => kmhToMph(h.wind_gusts_10m?.[i]  ?? 0));
  const dirs      = indices.map(i => h.wind_direction_10m?.[i] ?? 0);
  const n         = speeds.length;
  if (!n) return;

  const ARROW_H = 22;
  const PAD = { top: ARROW_H + 10, bottom: 28, left: 10, right: 46 };
  const iW  = W - PAD.left - PAD.right;
  const iH  = H - PAD.top  - PAD.bottom;

  const maxVal = Math.max(...gusts, 5) + 5;
  const xOf   = i => PAD.left + (i / Math.max(n - 1, 1)) * iW;
  const yOf   = v => PAD.top + (1 - v / maxVal) * iH;

  // Y-axis grid + labels
  ctx.font      = '10px DM Sans, sans-serif';
  ctx.textAlign = 'right';
  const ticks = [0, 10, 20, 30, 40, 50].filter(t => t <= maxVal + 10);
  ticks.forEach(v => {
    const y = yOf(v);
    if (y < PAD.top || y > PAD.top + iH + 2) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillText(v, W - 2, y + 3.5);
  });

  // x-axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < n; i += 6) {
    const hour = getHourFromHourlyIndex(indices[i]);
    ctx.fillText(String(hour).padStart(2, '0'), xOf(i), H - PAD.bottom + 14);
  }

  // Gusts area fill (lighter)
  const gustGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + iH);
  gustGrad.addColorStop(0, 'rgba(165,214,167,0.25)');
  gustGrad.addColorStop(1, 'rgba(165,214,167,0.02)');
  ctx.beginPath();
  smoothPath(ctx, gusts.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.lineTo(xOf(n - 1), PAD.top + iH);
  ctx.lineTo(xOf(0),     PAD.top + iH);
  ctx.closePath();
  ctx.fillStyle = gustGrad;
  ctx.fill();

  // Wind speed area fill
  const speedGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + iH);
  speedGrad.addColorStop(0, 'rgba(79,195,247,0.35)');
  speedGrad.addColorStop(1, 'rgba(79,195,247,0.04)');
  ctx.beginPath();
  smoothPath(ctx, speeds.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.lineTo(xOf(n - 1), PAD.top + iH);
  ctx.lineTo(xOf(0),     PAD.top + iH);
  ctx.closePath();
  ctx.fillStyle = speedGrad;
  ctx.fill();

  // Gust line
  ctx.beginPath();
  ctx.strokeStyle = '#A5D6A7';
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  smoothPath(ctx, gusts.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.stroke();

  // Speed line
  ctx.beginPath();
  ctx.strokeStyle = '#4FC3F7';
  ctx.lineWidth   = 2.5;
  smoothPath(ctx, speeds.map((v, i) => ({ x: xOf(i), y: yOf(v) })));
  ctx.stroke();

  // Direction arrows (every 2 hours)
  const arrowStep = Math.ceil(n / 12);
  for (let i = 0; i < n; i += arrowStep) {
    drawWindArrow(ctx, xOf(i), ARROW_H / 2 + 2, dirs[i]);
  }
}

function drawWindArrow(ctx, x, y, fromDeg) {
  // Convert "wind FROM" to "wind TO" for arrow direction
  const toDeg = (fromDeg + 180) % 360;
  const rad   = (toDeg - 90) * Math.PI / 180;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(-4, 4);
  ctx.lineTo(0,  1);
  ctx.lineTo(4,  4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fill();
  ctx.restore();
}

/* ─── HUMIDITY CHART ──────────────────────────────────── */
function drawHumidityChart(ctx, W, H, indices) {
  const h    = STATE.weather.hourly;
  const vals = indices.map(i => h.relative_humidity_2m?.[i] ?? 0);
  const n    = vals.length;
  if (!n) return;

  const PAD  = { top: 12, bottom: 28, left: 10, right: 50 };
  const iW   = W - PAD.left - PAD.right;
  const iH   = H - PAD.top  - PAD.bottom;

  const xOf  = i => PAD.left + (i / Math.max(n - 1, 1)) * iW;
  const yOf  = v => PAD.top + (1 - v / 100) * iH;

  // Find current hour split point
  const tz        = STATE.location.timezone;
  const nowIdx    = DETAIL.dayOffset === 0 ? findNowIndex(indices) : -1;
  const splitX    = nowIdx >= 0 ? xOf(nowIdx - indices.indexOf(indices[0])) : W;

  // Y-axis grid + labels
  ctx.font      = '10px DM Sans, sans-serif';
  ctx.textAlign = 'right';
  [0, 20, 40, 60, 80, 100].forEach(v => {
    const y = yOf(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillText(`${v}%`, W - 2, y + 3.5);
  });

  // x-axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < n; i += 6) {
    const hour = getHourFromHourlyIndex(indices[i]);
    const label = hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? `${hour}AM` : `${hour-12}PM`;
    ctx.fillText(label, xOf(i), H - PAD.bottom + 14);
  }

  const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

  // Past fill (teal) — clip to left of splitX
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, splitX, H);
  ctx.clip();
  const pastGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + iH);
  pastGrad.addColorStop(0,   'rgba(38,198,218,0.55)');
  pastGrad.addColorStop(0.7, 'rgba(38,198,218,0.2)');
  pastGrad.addColorStop(1,   'rgba(38,198,218,0.02)');
  ctx.beginPath();
  smoothPath(ctx, pts);
  ctx.lineTo(pts[n - 1].x, PAD.top + iH);
  ctx.lineTo(pts[0].x, PAD.top + iH);
  ctx.closePath();
  ctx.fillStyle = pastGrad;
  ctx.fill();
  ctx.restore();

  // Future fill (green) — clip to right of splitX
  ctx.save();
  ctx.beginPath();
  ctx.rect(splitX, 0, W - splitX, H);
  ctx.clip();
  const futureGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + iH);
  futureGrad.addColorStop(0,   'rgba(102,187,106,0.55)');
  futureGrad.addColorStop(0.7, 'rgba(102,187,106,0.2)');
  futureGrad.addColorStop(1,   'rgba(102,187,106,0.02)');
  ctx.beginPath();
  smoothPath(ctx, pts);
  ctx.lineTo(pts[n - 1].x, PAD.top + iH);
  ctx.lineTo(pts[0].x, PAD.top + iH);
  ctx.closePath();
  ctx.fillStyle = futureGrad;
  ctx.fill();
  ctx.restore();

  // Past line (teal)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, splitX, H); ctx.clip();
  ctx.beginPath();
  ctx.strokeStyle = '#26C6DA';
  ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  smoothPath(ctx, pts); ctx.stroke();
  ctx.restore();

  // Future line (green)
  ctx.save();
  ctx.beginPath(); ctx.rect(splitX, 0, W - splitX, H); ctx.clip();
  ctx.beginPath();
  ctx.strokeStyle = '#66BB6A';
  ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  smoothPath(ctx, pts); ctx.stroke();
  ctx.restore();

  // Current time dot
  if (nowIdx >= 0) {
    const relIdx = nowIdx - indices[0];
    const dotX   = xOf(Math.max(0, relIdx));
    const dotY   = yOf(vals[Math.max(0, relIdx)]);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#26C6DA';
    ctx.fill();
  }
}

/* ─── Summary text ────────────────────────────────────── */
function renderDetailSummary(indices) {
  const h    = STATE.weather.hourly;
  const type = DETAIL.type;
  const tz   = STATE.location.timezone;
  const day  = getDayLabel(DETAIL.dayOffset, tz);
  const el   = document.getElementById('detail-summary-text');

  let text = '';
  if (type === 'precip') {
    const maxProb = Math.max(...indices.map(i => h.precipitation_probability?.[i] ?? 0));
    const sum = STATE.weather.daily.precipitation_sum?.[DETAIL.dayOffset] ?? 0;
    text = maxProb >= 70
      ? `${day}, there is a high chance of rain. Expected precipitation totals ${sum.toFixed(1)} mm.`
      : maxProb >= 40
      ? `${day} there is a moderate chance of rain. Carry an umbrella just in case.`
      : `${day} looks mostly dry. Precipitation probability stays below 40%.`;

  } else if (type === 'uv') {
    const maxUV = Math.max(...indices.map(i => h.uv_index?.[i] ?? 0));
    const cat   = uvDescription(maxUV);
    text = `${day} UV index peaks at ${Math.round(maxUV)} (${cat.label}). `;
    if (maxUV >= 3) text += 'Sun protection recommended between 8 AM and 4 PM.';
    else text += 'UV exposure is low — no special precautions needed.';

  } else if (type === 'wind') {
    const maxSpd  = kmhToMph(Math.max(...indices.map(i => h.wind_speed_10m?.[i] ?? 0)));
    const minSpd  = kmhToMph(Math.min(...indices.map(i => h.wind_speed_10m?.[i] ?? 0)));
    const maxGust = kmhToMph(Math.max(...indices.map(i => h.wind_gusts_10m?.[i] ?? 0)));
    text = `${day} wind speeds will be ${minSpd} to ${maxSpd} mph, with gusts up to ${maxGust} mph.`;

  } else if (type === 'humidity') {
    const vals  = indices.map(i => h.relative_humidity_2m?.[i] ?? 0);
    const avg   = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const desc  = humidityDescription(avg);
    const tempC = h.temperature_2m?.[indices[12] ?? indices[0]] ?? 20;
    const dewPt = Math.round(tempC - ((100 - avg) / 5));
    const dewF  = STATE.unit === 'F' ? cToF(dewPt) : dewPt;
    text = `${day}, the average humidity is ${avg}% (${desc.toLowerCase()}). The dew point ranges around ${dewF}°${STATE.unit}.`;
  }

  el.textContent = text;
}

/* ─── Utilities ───────────────────────────────────────── */
function getHoursForDay(dayOffset, timezone) {
  const w  = STATE.weather;
  if (!w) return [];
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const dayStr = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: timezone,
  }).format(date); // "YYYY-MM-DD"
  return w.hourly.time.reduce((acc, t, i) => {
    if (t.startsWith(dayStr)) acc.push(i);
    return acc;
  }, []);
}

function findNowIndex(indices) {
  const tz     = STATE.location.timezone;
  const parts  = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  const hr  = parts.hour === '24' ? '00' : parts.hour;
  const key = `${parts.year}-${parts.month}-${parts.day}T${hr}:00`;
  const abs = STATE.weather.hourly.time.indexOf(key);
  if (abs < 0) return indices[0];
  const rel = indices.indexOf(abs);
  return rel >= 0 ? abs : indices[0];
}

function getHourFromHourlyIndex(idx) {
  const t = STATE.weather.hourly.time[idx] ?? 'T00:00';
  return parseInt(t.split('T')[1].split(':')[0]);
}

function getDayLabel(offset, tz) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(date);
}

function smoothPath(ctx, pts) {
  if (!pts.length) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  if (pts.length > 1) ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}
