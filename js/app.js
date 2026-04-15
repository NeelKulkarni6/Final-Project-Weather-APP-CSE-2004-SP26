'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Main Dashboard Controller
   ════════════════════════════════════════════════════════ */

const STATE = {
  location: {
    name: 'St. Louis', state: 'Missouri', country: 'US',
    lat: 38.6270, lon: -90.1994, timezone: 'America/Chicago',
  },
  weather:    null,
  unit:       'F',
  saved:      [],
  clockTimer: null,
};

const DEFAULT_SAVED = [
  { name:'San Francisco', state:'California', country:'US', lat:37.7749, lon:-122.4194, timezone:'America/Los_Angeles', temp:'—', condition:'—', emoji:'🌤' },
  { name:'Chicago',       state:'Illinois',   country:'US', lat:41.8781, lon:-87.6298,  timezone:'America/Chicago',     temp:'—', condition:'—', emoji:'🌤' },
  { name:'St. Louis',     state:'Missouri',   country:'US', lat:38.6270, lon:-90.1994,  timezone:'America/Chicago',     temp:'—', condition:'—', emoji:'🌤' },
  { name:'London',        state:'England',    country:'GB', lat:51.5074, lon:-0.1278,   timezone:'Europe/London',       temp:'—', condition:'—', emoji:'🌤' },
  { name:'Shanghai',      state:'Shanghai',   country:'CN', lat:31.2304, lon:121.4737,  timezone:'Asia/Shanghai',       temp:'—', condition:'—', emoji:'🌤' },
  { name:'New Delhi',     state:'Delhi',      country:'IN', lat:28.6139, lon:77.2090,   timezone:'Asia/Kolkata',        temp:'—', condition:'—', emoji:'🌤' },
  { name:'Dubai',         state:'Dubai',      country:'AE', lat:25.2048, lon:55.2708,   timezone:'Asia/Dubai',          temp:'—', condition:'—', emoji:'🌤' },
  { name:'New York',      state:'New York',   country:'US', lat:40.7128, lon:-74.0060,  timezone:'America/New_York',    temp:'—', condition:'—', emoji:'🌤' },
];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  STATE.unit  = lsGet(LS.UNIT, 'F');
  STATE.saved = lsGet(LS.SAVED, null);
  // First ever visit: seed defaults
  if (!STATE.saved) { STATE.saved = DEFAULT_SAVED.map(s => ({...s})); lsSet(LS.SAVED, STATE.saved); }
  const stored = lsGet(LS.LOCATION, null);
  if (stored) STATE.location = stored;

  syncUnitToggle();
  initSearch();
  initUnitToggle();
  initGeoBtn();
  initDetailModal();
  initModuleCardClicks();
  initPDFBtn();

  await loadWeather();
  refreshSavedTiles();
}

/* ── Load ─────────────────────────────────────────── */
async function loadWeather() {
  showLoading();
  const { lat, lon, name } = STATE.location;
  try {
    const [weather, imageUrl] = await Promise.all([
      API.fetchWeather(lat, lon),
      API.fetchLocationImage(name),
    ]);
    STATE.weather = weather;
    if (weather.timezone) {
      STATE.location.timezone = weather.timezone;
      lsSet(LS.LOCATION, STATE.location);
    }
    renderAll();
    applyBackground(weather.current.weather_code, weather.current.is_day);
    renderHeroImage(imageUrl);
    renderFunFact();
    renderWeatherSummary(weather);
    startClock();
    startTicker(weather, STATE.location, STATE.unit);
    renderSaved();
  } catch (err) {
    console.error(err);
    showToast('Could not load weather data', true);
  } finally {
    hideLoading();
  }
}

/* ── Render all ───────────────────────────────────── */
function renderAll() {
  renderHero();
  renderHourly();
  renderModules();
  renderDaily();
  checkSaveButton();
}

/* ── Hero ─────────────────────────────────────────── */
function renderHero() {
  const c = STATE.weather.current;
  const d = STATE.weather.daily;
  const u = STATE.unit;
  const info = getWeatherInfo(c.weather_code);
  setText('hero-city',      `${STATE.location.name}${STATE.location.state ? ', ' + STATE.location.state : ''}`);
  setText('hero-temp',      `${convertTemp(c.temperature_2m, u)}°`);
  setText('hero-condition', info.label);
  setText('hero-high',      `${convertTemp(d.temperature_2m_max[0], u)}°`);
  setText('hero-low',       `${convertTemp(d.temperature_2m_min[0], u)}°`);
}

/* ── City image ───────────────────────────────────── */
function renderHeroImage(url) {
  const img = document.getElementById('hero-img');
  if (!img) return;
  if (!url) { img.classList.remove('show'); return; }
  img.onload  = () => img.classList.add('show');
  img.onerror = () => img.classList.remove('show');
  img.src = url;
}

/* ── Fun fact ─────────────────────────────────────── */
function renderFunFact() {
  const bar  = document.getElementById('fun-fact-bar');
  const text = document.getElementById('fun-fact-text');
  if (!bar || !text) return;
  const fact = typeof getCityFact === 'function' ? getCityFact(STATE.location.name) : null;
  if (!fact) { bar.style.display = 'none'; return; }
  text.textContent  = fact;
  bar.style.display = 'flex';          // explicitly show
  bar.style.opacity = '0';
  bar.style.transform = 'translateY(8px)';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    bar.style.opacity    = '1';
    bar.style.transform  = 'translateY(0)';
  }));
}

/* ── Weather summary ──────────────────────────────── */
function renderWeatherSummary(weather) {
  const card = document.getElementById('weather-summary');
  const text = document.getElementById('summary-text');
  if (!card || !text) return;

  const summary = generateWeatherSummary(weather, STATE.location, STATE.unit);
  text.textContent = summary;
  card.style.display = '';
}

function generateWeatherSummary(weather, location, unit) {
  const c  = weather.current;
  const d  = weather.daily;
  const tz = location.timezone;

  const temp = convertTemp(c.temperature_2m, unit);
  const info = getWeatherInfo(c.weather_code);
  const hum  = c.relative_humidity_2m;

  // Temperature word
  const tempWord = unit === 'F'
    ? (temp >= 95 ? 'scorching' : temp >= 85 ? 'hot' : temp >= 75 ? 'warm'
    :  temp >= 65 ? 'mild'      : temp >= 50 ? 'cool': temp >= 32 ? 'cold' : 'frigid')
    : (temp >= 35 ? 'scorching' : temp >= 29 ? 'hot' : temp >= 24 ? 'warm'
    :  temp >= 18 ? 'mild'      : temp >= 10 ? 'cool': temp >= 0  ? 'cold' : 'frigid');

  const humWord = hum > 78 ? ' and humid' : hum < 28 ? ' and dry' : '';

  // Today's range
  const hi0 = convertTemp(d.temperature_2m_max[0], unit);
  const lo0 = convertTemp(d.temperature_2m_min[0], unit);

  // Rain outlook
  const rainDays = d.precipitation_probability_max
    .slice(0, 7)
    .map((p, i) => ({ p, label: formatDayShort(d.time[i], tz), i }))
    .filter(x => x.p >= 40);

  let rainSentence = '';
  if (!rainDays.length) {
    rainSentence = 'Dry weather expected all week.';
  } else if (rainDays[0].i === 0) {
    rainSentence = `Rain likely today with a ${rainDays[0].p}% chance.`;
  } else if (rainDays[0].i <= 2) {
    rainSentence = `Rain possible ${rainDays[0].label.toLowerCase()} with ${rainDays[0].p}% probability.`;
  } else {
    const dryUntil = formatDayShort(d.time[rainDays[0].i - 1], tz);
    rainSentence = `Dry through ${dryUntil.toLowerCase()}, then rain chances increase ${rainDays[0].label.toLowerCase()}.`;
  }

  // Temp trend
  const n  = d.temperature_2m_max.length;
  const hi5 = convertTemp(d.temperature_2m_max[Math.min(5, n-1)], unit);
  const delta = hi5 - hi0;
  let trendSentence = '';
  if (delta >= 10) {
    trendSentence = ` Temperatures warm significantly by ${formatDayShort(d.time[Math.min(5,n-1)], tz)}, reaching ${hi5}°${unit}.`;
  } else if (delta <= -10) {
    trendSentence = ` A notable cool-down arrives by ${formatDayShort(d.time[Math.min(5,n-1)], tz)}, dropping to ${hi5}°${unit}.`;
  }

  const condWord = info.label.toLowerCase().replace(' sky','').replace('depositing rime ','');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const s1 = `${cap(tempWord)}${humWord} ${condWord} in ${location.name} today, with a high of ${hi0}° and low of ${lo0}°${unit}.`;

  return `${s1} ${rainSentence}${trendSentence}`;
}

/* ── Seconds clock ────────────────────────────────── */
function startClock() {
  clearInterval(STATE.clockTimer);
  const tz = STATE.location.timezone;
  const update = () => {
    const t = new Intl.DateTimeFormat('en-US', {
      hour:'numeric', minute:'2-digit', second:'2-digit',
      hour12:true, timeZone:tz,
    }).format(new Date());
    setText('hero-time', t);
  };
  update();
  STATE.clockTimer = setInterval(update, 1000); // every second
}

/* ── Hourly strip ─────────────────────────────────── */
function renderHourly() {
  const w = STATE.weather; const tz = STATE.location.timezone;
  const h = w.hourly; const u = STATE.unit;
  const startIdx = getCurrentHourIndex(h.time, tz);
  const container = document.getElementById('hourly-scroll');
  container.innerHTML = '';
  for (let i = startIdx; i < Math.min(startIdx + 25, h.time.length); i++) {
    const isNow = i === startIdx;
    const info  = getWeatherInfo(h.weather_code[i]);
    const temp  = convertTemp(h.temperature_2m[i], u);
    const rain  = h.precipitation_probability[i];
    const time  = isNow ? 'Now' : formatHour(h.time[i] + ':00', tz);
    const item  = document.createElement('div');
    item.className = 'hourly-item' + (isNow ? ' now' : '');
    item.setAttribute('role','listitem');
    item.innerHTML = `
      <div class="hourly-time">${time}</div>
      <div class="hourly-icon">${info.emoji}</div>
      <div class="hourly-temp">${temp}°</div>
      <div class="hourly-rain">${rain >= 20 ? rain + '%' : ''}</div>
    `;
    container.appendChild(item);
  }
}

/* ── Module cards ─────────────────────────────────── */
function renderModules() {
  const c  = STATE.weather.current;
  const d  = STATE.weather.daily;
  renderUVCard(c.uv_index ?? d.uv_index_max?.[0] ?? 0);
  renderWindCard(c.wind_speed_10m, c.wind_direction_10m, c.wind_gusts_10m);
  renderHumidityCard(c.relative_humidity_2m);
  renderFeelsLikeCard(c.apparent_temperature, c.temperature_2m);
  renderVisibilityCard(c.visibility);
  renderPressureCard(c.surface_pressure);
  renderSunriseCard(d.sunrise[0], d.sunset[0], c.is_day);
  renderPrecipCard(c.precipitation);
  renderCloudCard(c.cloud_cover);
}

function renderUVCard(uv) {
  const { label, color } = uvDescription(uv);
  const { x, y } = getUVPosition(uv);
  setText('uv-num', Math.round(uv));
  setText('uv-cat', label);
  const el = document.getElementById('uv-cat');
  if (el) el.style.color = color;
  animateSVGPoint('uv-dot', x, y, 10, 60);
}

function animateSVGPoint(id, tx, ty, sx, sy) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = null;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const tick = ts => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / 1100, 1);
    el.setAttribute('cx', (sx + (tx-sx)*ease(p)).toFixed(1));
    el.setAttribute('cy', (sy + (ty-sy)*ease(p)).toFixed(1));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderWindCard(speedKmh, dirDeg, gustsKmh) {
  const speed = kmhToMph(speedKmh), gusts = kmhToMph(gustsKmh);
  setText('wind-speed', speed); setText('wind-unit','mph');
  setText('wind-dir', `${degreesToCardinal(dirDeg)} · Gusts ${gusts} mph`);
  animateCompassNeedle(dirDeg);
}

function animateCompassNeedle(deg) {
  const needle = document.getElementById('compass-needle');
  if (!needle) return;
  let start = null;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const tick = ts => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / 1000, 1);
    needle.setAttribute('transform', `rotate(${(ease(p)*deg).toFixed(1)},50,50)`);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderHumidityCard(h) {
  setText('humidity-val', h);
  const bar = document.getElementById('humidity-bar');
  if (bar) bar.style.width = h + '%';
  setText('humidity-desc', humidityDescription(h));
}

function renderFeelsLikeCard(apparent, actual) {
  setText('feelslike-val',  `${convertTemp(apparent, STATE.unit)}°`);
  setText('feelslike-desc', feelsLikeDescription(apparent, actual));
}

function renderVisibilityCard(meters) {
  setText('visibility-val',  metersToMiles(meters));
  setText('visibility-desc', visibilityDescription(meters));
}

function renderPressureCard(hpa) {
  setText('pressure-val',  Math.round(hpa));
  setText('pressure-desc', pressureDescription(hpa));
  const pct = Math.min(100, Math.max(0, ((hpa - 950) / 100) * 100));
  const bar = document.getElementById('pressure-bar');
  if (bar) bar.style.width = pct + '%';
}

/* ── Sunrise + Moon phase ─────────────────────────── */
function renderSunriseCard(sunriseIso, sunsetIso, isDay) {
  const tz = STATE.location.timezone;
  setText('sunrise-val', formatSunTime(sunriseIso, tz));
  setText('sunset-val',  formatSunTime(sunsetIso,  tz));
  updateSunArc(sunriseIso, sunsetIso);
  renderMoonPhase();
}

function updateSunArc(sunriseIso, sunsetIso) {
  const { x, y, progress } = getSunPosition(sunriseIso, sunsetIso);
  const dot  = document.getElementById('sun-dot');
  const glow = document.getElementById('sun-glow');
  const arc  = document.getElementById('sun-arc');
  if (dot)  { dot.setAttribute('cx', x.toFixed(1));  dot.setAttribute('cy', y.toFixed(1));  }
  if (glow) { glow.setAttribute('cx', x.toFixed(1)); glow.setAttribute('cy', y.toFixed(1)); }
  if (arc)  { arc.setAttribute('d', buildSunArcPath(progress)); }
}

function getMoonPhaseData() {
  const knownNew = new Date('2000-01-06T18:14:00Z');
  const synodic  = 29.53059;
  const daysSince = (Date.now() - knownNew.getTime()) / 86400000;
  const phase     = ((daysSince % synodic) + synodic) % synodic;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phase / synodic)) / 2 * 100);
  let name, emoji;
  if      (phase < 1.85)  { name = 'New Moon';        emoji = '🌑'; }
  else if (phase < 7.38)  { name = 'Waxing Crescent'; emoji = '🌒'; }
  else if (phase < 9.22)  { name = 'First Quarter';   emoji = '🌓'; }
  else if (phase < 14.77) { name = 'Waxing Gibbous';  emoji = '🌔'; }
  else if (phase < 16.61) { name = 'Full Moon';       emoji = '🌕'; }
  else if (phase < 22.15) { name = 'Waning Gibbous';  emoji = '🌖'; }
  else if (phase < 23.99) { name = 'Last Quarter';    emoji = '🌗'; }
  else                    { name = 'Waning Crescent';  emoji = '🌘'; }
  return { phase, name, emoji, illumination };
}

function renderMoonPhase() {
  const { name, emoji, illumination } = getMoonPhaseData();
  setText('moon-emoji',  emoji);
  setText('moon-name',   name);
  setText('moon-illum',  illumination + '% illuminated');
}

function renderPrecipCard(precip) {
  const u   = STATE.unit;
  const val = u === 'F' ? (precip * 0.03937).toFixed(2) : precip.toFixed(1);
  setText('precip-val',  val === '0.00' || val === '0.0' ? '0' : val);
  setText('precip-unit', u === 'F' ? 'in' : 'mm');
  setText('precip-desc', precip > 0 ? `${precip.toFixed(1)} mm today` : 'None expected');
}

function renderCloudCard(pct) {
  setText('cloud-val', pct);
  const bar = document.getElementById('cloud-bar');
  if (bar) bar.style.width = pct + '%';
  let desc = pct > 80 ? 'Overcast' : pct > 50 ? 'Mostly cloudy' : pct > 20 ? 'Partly cloudy' : 'Clear skies';
  setText('cloud-desc', desc);
}

/* ── Daily forecast with expandable rows ─────────── */
function renderDaily() {
  const d    = STATE.weather.daily;
  const h    = STATE.weather.hourly;
  const tz   = STATE.location.timezone;
  const u    = STATE.unit;
  const list = document.getElementById('daily-list');
  list.innerHTML = '';

  const rangeMin = Math.min(...d.temperature_2m_min);
  const rangeMax = Math.max(...d.temperature_2m_max);
  const count    = Math.min(10, d.weather_code.length);

  for (let i = 0; i < count; i++) {
    const info   = getWeatherInfo(d.weather_code[i]);
    const hi     = convertTemp(d.temperature_2m_max[i], u);
    const lo     = convertTemp(d.temperature_2m_min[i], u);
    const rain   = d.precipitation_probability_max[i];
    const day    = formatDayShort(d.time[i], tz);
    const barL   = (d.temperature_2m_min[i] - rangeMin) / (rangeMax - rangeMin);
    const barW   = (d.temperature_2m_max[i] - d.temperature_2m_min[i]) / (rangeMax - rangeMin);

    // Build detail stats for expanded view
    const windMax  = kmhToMph(d.wind_speed_10m_max[i]);
    const gustMax  = kmhToMph(d.wind_gusts_10m_max?.[i] ?? 0);
    const uvMax    = d.uv_index_max[i]?.toFixed(1) ?? '—';
    const precipSum = (d.precipitation_sum[i] ?? 0).toFixed(1);
    const sunrise  = formatSunTime(d.sunrise[i], tz);
    const sunset   = formatSunTime(d.sunset[i],  tz);

    // Period temps from hourly
    const dayHourIdx = h.time.reduce((acc, t, idx) => {
      if (t.startsWith(d.time[i])) acc.push(idx);
      return acc;
    }, []);
    const periodTemp = (start, end) => {
      const idxs = dayHourIdx.filter(idx => {
        const hr = parseInt(h.time[idx].split('T')[1]);
        return hr >= start && hr < end;
      });
      if (!idxs.length) return '—';
      const avg = idxs.reduce((s, idx) => s + h.temperature_2m[idx], 0) / idxs.length;
      return convertTemp(avg, u) + '°';
    };

    const row = document.createElement('div');
    row.className = 'daily-expandable-row' + (i === 0 ? ' today' : '');

    row.innerHTML = `
      <div class="daily-row-trigger">
        <div class="daily-day">${day}</div>
        <div class="daily-icon">${info.emoji}</div>
        <div class="daily-rain-prob${rain < 20 ? ' hidden' : ''}">${rain}%</div>
        <div class="daily-bar-wrap">
          <div class="daily-low">${lo}°</div>
          <div class="temp-range-bar">
            <div class="temp-range-fill" style="left:${(barL*100).toFixed(1)}%;width:${(barW*100).toFixed(1)}%"></div>
          </div>
          <div class="daily-high">${hi}°</div>
        </div>
        <div class="daily-chevron">›</div>
      </div>
      <div class="daily-expand-panel">
        <div class="dep-grid">
          <div class="dep-item">
            <div class="dep-label">Condition</div>
            <div class="dep-val">${info.label}</div>
          </div>
          <div class="dep-item">
            <div class="dep-label">Precipitation</div>
            <div class="dep-val">${precipSum}mm · ${rain}%</div>
          </div>
          <div class="dep-item">
            <div class="dep-label">Wind</div>
            <div class="dep-val">${windMax} mph · gusts ${gustMax}</div>
          </div>
          <div class="dep-item">
            <div class="dep-label">UV Index</div>
            <div class="dep-val">${uvMax}</div>
          </div>
          <div class="dep-item">
            <div class="dep-label">Sunrise</div>
            <div class="dep-val">${sunrise}</div>
          </div>
          <div class="dep-item">
            <div class="dep-label">Sunset</div>
            <div class="dep-val">${sunset}</div>
          </div>
        </div>
        <div class="dep-periods">
          <div class="dep-period"><span>🌅 Morning</span><strong>${periodTemp(6,12)}</strong></div>
          <div class="dep-period"><span>☀️ Afternoon</span><strong>${periodTemp(12,18)}</strong></div>
          <div class="dep-period"><span>🌆 Evening</span><strong>${periodTemp(18,22)}</strong></div>
          <div class="dep-period"><span>🌙 Overnight</span><strong>${periodTemp(22,24)}</strong></div>
        </div>
      </div>
    `;

    row.querySelector('.daily-row-trigger').addEventListener('click', () => {
      row.classList.toggle('expanded');
    });

    list.appendChild(row);
  }
}

/* ── Background & particles ───────────────────────── */
function applyBackground(code, isDay) {
  document.getElementById('weather-bg').className = getBgClass(code, isDay);
  updateParticles(getParticleType(code, isDay));
}

function updateParticles(type) {
  const c = document.getElementById('particles');
  c.innerHTML = '';
  if (type === 'rain')  spawnRain(c, 100);
  if (type === 'storm') { spawnRain(c, 160); spawnLightning(c); }
  if (type === 'snow')  spawnSnow(c, 75);
  if (type === 'stars') { spawnStars(c, 130); spawnShootingStar(c); }
}

function spawnRain(c, n) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'rain-drop';
    el.style.cssText = `left:${Math.random()*110-5}%;height:${10+Math.random()*14}px;
      animation-duration:${0.45+Math.random()*0.55}s;animation-delay:-${Math.random()*2}s;
      opacity:${0.35+Math.random()*0.45}`;
    c.appendChild(el);
  }
}

function spawnLightning(c) {
  [0,1].forEach(() => { const el = document.createElement('div'); el.className='lightning-bolt'; c.appendChild(el); });
}

function spawnSnow(c, n) {
  const f = ['❄','❅','❆','·','•'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'snow-flake';
    el.textContent = f[Math.floor(Math.random()*f.length)];
    el.style.cssText = `left:${Math.random()*100}%;font-size:${7+Math.random()*14}px;
      animation-duration:${3.5+Math.random()*5}s;animation-delay:-${Math.random()*6}s;
      opacity:${0.4+Math.random()*0.5}`;
    c.appendChild(el);
  }
}

function spawnStars(c, n) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'star-dot';
    const s = 0.8+Math.random()*2.2;
    el.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*65}%;
      width:${s}px;height:${s}px;
      animation-duration:${1.5+Math.random()*3}s;animation-delay:-${Math.random()*4}s`;
    c.appendChild(el);
  }
}

function spawnShootingStar(c) {
  const go = () => {
    const el = document.createElement('div');
    el.className = 'shooting-star';
    el.style.cssText = `top:${5+Math.random()*35}%;left:${Math.random()*50}%;
      animation-duration:${4+Math.random()*6}s;animation-delay:${Math.random()*8}s`;
    c.appendChild(el);
    setTimeout(() => el.remove(), 15000);
  };
  go();
  setTimeout(go, 8000+Math.random()*12000);
}

/* ── All module card clicks ───────────────────────── */
function initModuleCardClicks() {
  const map = [
    { id:'uv-card',         type:'uv'         },
    { id:'wind-card',       type:'wind'       },
    { id:'humidity-card',   type:'humidity'   },
    { id:'precip-card',     type:'precip'     },
    { id:'feelslike-card',  type:'feelslike'  },
    { id:'visibility-card', type:'visibility' },
    { id:'pressure-card',   type:'pressure'   },
    { id:'cloud-card',      type:'cloud'      },
  ];
  map.forEach(({ id, type }) => {
    const card = document.getElementById(id);
    if (!card) return;
    card.style.cursor = 'pointer';
    const cue = document.createElement('div');
    cue.className = 'card-expand-cue'; cue.textContent = '›';
    card.appendChild(cue);
    card.addEventListener('click', () => openDetail(type));
  });
}

/* ── PDF download ─────────────────────────────────── */
function initPDFBtn() {
  const btn = document.getElementById('pdf-btn');
  if (btn) btn.addEventListener('click', downloadPDF);
}

function downloadPDF() {
  window.print();
}

/* ── Search ───────────────────────────────────────── */
function initSearch() {
  const input = document.getElementById('search-input');
  const drop  = document.getElementById('search-dropdown');
  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { closeDrop(); return; }
    timer = setTimeout(async () => {
      const results = await API.searchLocations(q);
      renderDrop(results);
    }, 320);
  });

  input.addEventListener('keydown', e => {
    const items = drop.querySelectorAll('.dropdown-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const f = drop.querySelector('.focused'), n = f ? f.nextElementSibling : items[0];
      f?.classList.remove('focused'); n?.classList.add('focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const f = drop.querySelector('.focused');
      f?.classList.remove('focused'); f?.previousElementSibling?.classList.add('focused');
    } else if (e.key === 'Enter') {
      drop.querySelector('.focused')?.click();
    } else if (e.key === 'Escape') {
      closeDrop(); input.blur();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) closeDrop();
  });
}

function renderDrop(results) {
  const drop = document.getElementById('search-dropdown');
  if (!results.length) { closeDrop(); return; }
  drop.innerHTML = results.map(r => {
    const region = [r.admin1, r.country_code].filter(Boolean).join(', ');
    return `
      <div class="dropdown-item" role="option" tabindex="-1"
           data-lat="${r.latitude}" data-lon="${r.longitude}"
           data-name="${r.name}" data-state="${r.admin1??''}"
           data-country="${r.country_code??''}" data-tz="${r.timezone??'auto'}">
        <span class="dropdown-pin">📍</span>
        <div><div class="dropdown-city">${r.name}</div>
             <div class="dropdown-region">${region}</div></div>
      </div>`;
  }).join('');
  drop.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => selectLocation(item.dataset));
  });
  drop.classList.add('open');
}

function closeDrop() { document.getElementById('search-dropdown').classList.remove('open'); }

async function selectLocation(data) {
  STATE.location = { name:data.name, state:data.state, country:data.country,
    lat:parseFloat(data.lat), lon:parseFloat(data.lon), timezone:data.tz };
  lsSet(LS.LOCATION, STATE.location);
  closeDrop(); document.getElementById('search-input').value = '';
  await loadWeather();
}

/* ── Saved locations ──────────────────────────────── */
function checkSaveButton() {
  const btn = document.getElementById('save-btn');
  const isSaved = STATE.saved.some(s => s.name === STATE.location.name);
  btn.textContent = isSaved ? '♥' : '♡';
  btn.classList.toggle('saved', isSaved);
  btn.onclick = toggleSave;
}

function toggleSave() {
  const loc = STATE.location; const w = STATE.weather; const u = STATE.unit;
  const idx = STATE.saved.findIndex(s => s.name === loc.name);
  if (idx > -1) {
    STATE.saved.splice(idx, 1); showToast(`Removed ${loc.name}`);
  } else {
    const info = getWeatherInfo(w.current.weather_code);
    STATE.saved.push({ name:loc.name, state:loc.state, country:loc.country,
      lat:loc.lat, lon:loc.lon, timezone:loc.timezone,
      temp:convertTemp(w.current.temperature_2m, u), condition:info.label, emoji:info.emoji });
    showToast(`Saved ${loc.name}`);
  }
  lsSet(LS.SAVED, STATE.saved); checkSaveButton(); renderSaved();
}

function renderSaved() {
  const sec  = document.getElementById('saved-section');
  const grid = document.getElementById('saved-grid');
  if (!STATE.saved.length) { sec.style.display = 'none'; return; }
  sec.style.display = ''; grid.innerHTML = '';
  STATE.saved.forEach((s, idx) => {
    const tile = document.createElement('div');
    tile.className = 'saved-tile';
    tile.innerHTML = `<div class="saved-tile-name">${s.name}</div>
      <div class="saved-tile-condition">${s.emoji} ${s.condition}</div>
      <div class="saved-tile-temp">${s.temp}°</div>
      <button class="saved-tile-remove" data-idx="${idx}" title="Remove">✕</button>`;
    tile.addEventListener('click', e => {
      if (e.target.classList.contains('saved-tile-remove')) {
        e.stopPropagation();
        STATE.saved.splice(parseInt(e.target.dataset.idx), 1);
        lsSet(LS.SAVED, STATE.saved); renderSaved(); checkSaveButton(); return;
      }
      STATE.location = { name:s.name, state:s.state, country:s.country,
        lat:s.lat, lon:s.lon, timezone:s.timezone };
      lsSet(LS.LOCATION, STATE.location); loadWeather();
    });
    grid.appendChild(tile);
  });
}

/* ── Unit toggle ──────────────────────────────────── */
function initUnitToggle() {
  document.getElementById('unit-toggle').addEventListener('click', e => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === STATE.unit) return;
    STATE.unit = opt.dataset.unit; lsSet(LS.UNIT, STATE.unit);
    syncUnitToggle(); if (STATE.weather) renderAll();
  });
}
function syncUnitToggle() {
  document.querySelectorAll('.unit-opt').forEach(o => o.classList.toggle('active', o.dataset.unit === STATE.unit));
}

/* ── Geolocation ──────────────────────────────────── */
function initGeoBtn() {
  document.getElementById('geo-btn').addEventListener('click', async () => {
    const btn = document.getElementById('geo-btn');
    btn.classList.add('loading');
    try {
      const { lat, lon } = await API.getCurrentPosition();
      const loc = await API.reverseGeocode(lat, lon);
      if (loc) { STATE.location = { ...loc }; lsSet(LS.LOCATION, STATE.location); await loadWeather(); }
    } catch { showToast('Location access denied', true); }
    finally   { btn.classList.remove('loading'); }
  });
}

/* ── Utilities ────────────────────────────────────── */
function showLoading() { document.getElementById('loading-overlay').classList.add('active'); }
function hideLoading() { document.getElementById('loading-overlay').classList.remove('active'); }
let toastTimer = null;
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className=''; }, 3000);
}
function setText(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }

/* ── Async-refresh saved tile weather data ────────── */
async function refreshSavedTiles() {
  if (!STATE.saved.length) return;
  const u = STATE.unit;
  // Fetch in parallel, update tiles as each resolves
  STATE.saved.forEach(async (s, idx) => {
    try {
      const w    = await API.fetchWeather(s.lat, s.lon);
      const info = getWeatherInfo(w.current.weather_code);
      STATE.saved[idx].temp      = convertTemp(w.current.temperature_2m, u);
      STATE.saved[idx].condition = info.label;
      STATE.saved[idx].emoji     = info.emoji;
      lsSet(LS.SAVED, STATE.saved);
      renderSaved(); // re-render after each resolves
    } catch (_) {}
  });
}

/* ── Scrolling weather ticker ─────────────────────── */
function buildTickerText(weather, location, unit) {
  const c   = weather.current;
  const d   = weather.daily;
  const tz  = location.timezone;
  const u   = unit;
  const info  = getWeatherInfo(c.weather_code);
  const temp  = convertTemp(c.temperature_2m, u);
  const feels = convertTemp(c.apparent_temperature, u);
  const hi0   = convertTemp(d.temperature_2m_max[0], u);
  const lo0   = convertTemp(d.temperature_2m_min[0], u);
  const wind  = kmhToMph(c.wind_speed_10m);
  const dir   = degreesToCardinal(c.wind_direction_10m);
  const uv    = c.uv_index ?? d.uv_index_max?.[0] ?? 0;
  const uvCat = uvDescription(uv).label;
  const hum   = c.relative_humidity_2m;

  // Rain outlook
  const rainDays = d.precipitation_probability_max.slice(0,7).map((p,i) => ({p,i})).filter(x => x.p >= 40);
  let rainNote = '';
  if (!rainDays.length) rainNote = 'Dry conditions expected through the week.';
  else if (rainDays[0].i === 0) rainNote = `Rain likely today with a ${rainDays[0].p}% chance.`;
  else rainNote = `Rain possible ${formatDayShort(d.time[rainDays[0].i], tz).toLowerCase()} (${rainDays[0].p}%).`;

  // Week temp trend
  const n   = d.temperature_2m_max.length;
  const hi5 = convertTemp(d.temperature_2m_max[Math.min(5,n-1)], u);
  const delta = hi5 - hi0;
  let trendNote = '';
  if (delta >= 8) trendNote = ` Warming trend ahead, reaching ${hi5}\u00b0${u} by ${formatDayShort(d.time[Math.min(5,n-1)], tz)}.`;
  else if (delta <= -8) trendNote = ` A cool-down arrives later this week, dropping to ${hi5}\u00b0${u}.`;

  const cityName = location.name + (location.state ? ', ' + location.state : '');
  return `${cityName}: Currently ${temp}\u00b0${u} and ${info.label.toLowerCase()} \u2014 feels like ${feels}\u00b0${u}. Today\u2019s high ${hi0}\u00b0, low ${lo0}\u00b0${u}. Humidity ${hum}%. Winds ${dir} at ${wind} mph. UV index ${Math.round(uv)} (${uvCat}). ${rainNote}${trendNote}`;
}

function startTicker(weather, location, unit) {
  const textEl  = document.getElementById('ticker-text');
  const dupeEl  = document.getElementById('ticker-text-dupe');
  const track   = document.getElementById('ticker-track');
  if (!textEl || !track) return;

  const content = buildTickerText(weather, location, unit);
  const spacer  = '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u2605\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0';
  textEl.textContent  = content + spacer;
  dupeEl.textContent  = content + spacer;

  // Calculate duration from text pixel width (target ~50px/s)
  requestAnimationFrame(() => {
    const PPS   = 55; // pixels per second — comfortable reading speed
    const width = textEl.offsetWidth;
    const dur   = Math.max(20, width / PPS);
    track.style.animationDuration = dur + 's';
    track.classList.add('running');
  });
}
