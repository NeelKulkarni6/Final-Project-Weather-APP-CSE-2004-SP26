'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Main Dashboard Controller
   ════════════════════════════════════════════════════════ */

/* ── App State ───────────────────────────────────────── */
const STATE = {
  location: {
    name:     'St. Louis',
    state:    'Missouri',
    country:  'US',
    lat:      38.6270,
    lon:      -90.1994,
    timezone: 'America/Chicago',
  },
  weather:    null,
  unit:       'F',
  saved:      [],
  clockTimer: null,
};

/* ── Startup ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const storedUnit  = lsGet(LS.UNIT,     'F');
  const storedLoc   = lsGet(LS.LOCATION, null);
  const storedSaved = lsGet(LS.SAVED,    []);

  STATE.unit  = storedUnit;
  STATE.saved = storedSaved;

  // Only use stored location if it was deliberately saved (not the default)
  if (storedLoc) STATE.location = storedLoc;

  syncUnitToggle();
  initSearch();
  initUnitToggle();
  initGeoBtn();
  initDetailModal();       // from details.js
  initModuleCardClicks();  // attach click → detail modal

  await loadWeather();
}

/* ── Load weather ────────────────────────────────────── */
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
    startClock();
    renderSaved();
  } catch (err) {
    console.error(err);
    showToast('Could not load weather data', true);
  } finally {
    hideLoading();
  }
}

/* ── Render all ──────────────────────────────────────── */
function renderAll() {
  renderHero();
  renderHourly();
  renderModules();
  renderDaily();
  checkSaveButton();
}

/* ── Hero ────────────────────────────────────────────── */
function renderHero() {
  const w = STATE.weather;
  const c = w.current;
  const d = w.daily;
  const u = STATE.unit;

  const temp = convertTemp(c.temperature_2m, u);
  const hi   = convertTemp(d.temperature_2m_max[0], u);
  const lo   = convertTemp(d.temperature_2m_min[0], u);
  const info = getWeatherInfo(c.weather_code);

  const loc = STATE.location;
  setText('hero-city',      `${loc.name}${loc.state ? ', ' + loc.state : ''}`);
  setText('hero-temp',      `${temp}°`);
  setText('hero-condition', info.label);
  setText('hero-high',      `${hi}°`);
  setText('hero-low',       `${lo}°`);
}

/* ── City image ──────────────────────────────────────── */
function renderHeroImage(url) {
  const img = document.getElementById('hero-img');
  if (!img) return;
  if (!url) { img.classList.remove('show'); return; }
  img.onload  = () => img.classList.add('show');
  img.onerror = () => img.classList.remove('show');
  img.src = url;
}

/* ── Fun fact ────────────────────────────────────────── */
function renderFunFact() {
  const bar    = document.getElementById('fun-fact-bar');
  const textEl = document.getElementById('fun-fact-text');
  if (!bar || !textEl) return;

  const fact = getCityFact(STATE.location.name);   // from facts.js
  if (fact) {
    textEl.textContent = fact;
    bar.style.display  = '';
    // Animate in
    bar.style.opacity = '0';
    bar.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
      bar.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      bar.style.opacity    = '1';
      bar.style.transform  = 'translateY(0)';
    });
  } else {
    bar.style.display = 'none';
  }
}

/* ── Clock ───────────────────────────────────────────── */
function startClock() {
  clearInterval(STATE.clockTimer);
  const tz = STATE.location.timezone;
  const update = () => {
    const t = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
    }).format(new Date());
    setText('hero-time', t);
  };
  update();
  STATE.clockTimer = setInterval(update, 5000);
}

/* ── Hourly strip ────────────────────────────────────── */
function renderHourly() {
  const w        = STATE.weather;
  const tz       = STATE.location.timezone;
  const h        = w.hourly;
  const u        = STATE.unit;
  const startIdx = getCurrentHourIndex(h.time, tz);
  const container = document.getElementById('hourly-scroll');
  container.innerHTML = '';

  for (let i = startIdx; i < Math.min(startIdx + 25, h.time.length); i++) {
    const isNow = i === startIdx;
    const info  = getWeatherInfo(h.weather_code[i]);
    const temp  = convertTemp(h.temperature_2m[i], u);
    const rain  = h.precipitation_probability[i];
    const time  = isNow ? 'Now' : formatHour(h.time[i] + ':00', tz);

    const item = document.createElement('div');
    item.className = 'hourly-item' + (isNow ? ' now' : '');
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <div class="hourly-time">${time}</div>
      <div class="hourly-icon">${info.emoji}</div>
      <div class="hourly-temp">${temp}°</div>
      <div class="hourly-rain">${rain >= 20 ? rain + '%' : ''}</div>
    `;
    container.appendChild(item);
  }
}

/* ── Modules ─────────────────────────────────────────── */
function renderModules() {
  const c  = STATE.weather.current;
  const d  = STATE.weather.daily;
  const tz = STATE.location.timezone;

  renderUVCard(c.uv_index ?? d.uv_index_max?.[0] ?? 0);
  renderWindCard(c.wind_speed_10m, c.wind_direction_10m, c.wind_gusts_10m);
  renderHumidityCard(c.relative_humidity_2m);
  renderFeelsLikeCard(c.apparent_temperature, c.temperature_2m);
  renderVisibilityCard(c.visibility);
  renderPressureCard(c.surface_pressure);
  renderSunriseCard(d.sunrise[0], d.sunset[0]);
  renderPrecipCard(c.precipitation);
  renderCloudCard(c.cloud_cover);
}

/* UV ── */
function renderUVCard(uv) {
  const { label, color } = uvDescription(uv);
  const { x, y }        = getUVPosition(uv);
  setText('uv-num', Math.round(uv));
  setText('uv-cat', label);
  const catEl = document.getElementById('uv-cat');
  if (catEl) catEl.style.color = color;
  animateSVGPoint('uv-dot', x, y, 10, 60);
}

function animateSVGPoint(id, tx, ty, sx, sy) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = null;
  const dur  = 1100;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const tick = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    const e = ease(p);
    el.setAttribute('cx', (sx + (tx - sx) * e).toFixed(1));
    el.setAttribute('cy', (sy + (ty - sy) * e).toFixed(1));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Wind ── */
function renderWindCard(speedKmh, dirDeg, gustsKmh) {
  const speed = kmhToMph(speedKmh);
  const gusts = kmhToMph(gustsKmh);
  const card  = degreesToCardinal(dirDeg);
  setText('wind-speed', speed);
  setText('wind-unit',  'mph');
  setText('wind-dir',   `${card} · Gusts ${gusts} mph`);
  animateCompassNeedle(dirDeg);
}

function animateCompassNeedle(deg) {
  const needle = document.getElementById('compass-needle');
  if (!needle) return;
  let start = null;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const tick = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / 1000, 1);
    needle.setAttribute('transform', `rotate(${(ease(p) * deg).toFixed(1)}, 50, 50)`);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Humidity ── */
function renderHumidityCard(h) {
  setText('humidity-val', h);
  const bar = document.getElementById('humidity-bar');
  if (bar) bar.style.width = h + '%';
  setText('humidity-desc', humidityDescription(h));
}

/* Feels Like ── */
function renderFeelsLikeCard(apparent, actual) {
  setText('feelslike-val',  `${convertTemp(apparent, STATE.unit)}°`);
  setText('feelslike-desc', feelsLikeDescription(apparent, actual));
}

/* Visibility ── */
function renderVisibilityCard(meters) {
  setText('visibility-val',  metersToMiles(meters));
  setText('vis-unit',        ' mi');
  setText('visibility-desc', visibilityDescription(meters));
}

/* Pressure ── */
function renderPressureCard(hpa) {
  setText('pressure-val',  Math.round(hpa));
  setText('pressure-desc', pressureDescription(hpa));
  const pct = Math.min(100, Math.max(0, ((hpa - 950) / 100) * 100));
  const bar = document.getElementById('pressure-bar');
  if (bar) bar.style.width = pct + '%';
}

/* Sunrise/Sunset ── */
function renderSunriseCard(sunriseIso, sunsetIso) {
  const tz = STATE.location.timezone;
  setText('sunrise-val', formatSunTime(sunriseIso, tz));
  setText('sunset-val',  formatSunTime(sunsetIso,  tz));
  updateSunArc(sunriseIso, sunsetIso);
}

function updateSunArc(sunriseIso, sunsetIso) {
  const { x, y, progress } = getSunPosition(sunriseIso, sunsetIso);
  const dot  = document.getElementById('sun-dot');
  const glow = document.getElementById('sun-glow');
  const arc  = document.getElementById('sun-arc');
  if (dot)  { dot.setAttribute('cx',  x.toFixed(1)); dot.setAttribute('cy',  y.toFixed(1)); }
  if (glow) { glow.setAttribute('cx', x.toFixed(1)); glow.setAttribute('cy', y.toFixed(1)); }
  if (arc)  { arc.setAttribute('d', buildSunArcPath(progress)); }
}

/* Precipitation ── */
function renderPrecipCard(precip) {
  const u   = STATE.unit;
  const val = u === 'F' ? (precip * 0.03937).toFixed(2) : precip.toFixed(1);
  const unit = u === 'F' ? 'in' : 'mm';
  setText('precip-val',  val === '0.00' || val === '0.0' ? '0' : val);
  setText('precip-unit', unit);
  setText('precip-desc', precip > 0 ? `${precip.toFixed(1)} mm today` : 'None expected');
}

/* Cloud Cover ── */
function renderCloudCard(pct) {
  setText('cloud-val', pct);
  const bar = document.getElementById('cloud-bar');
  if (bar) bar.style.width = pct + '%';
  let desc = 'Clear skies';
  if (pct > 80)      desc = 'Overcast';
  else if (pct > 50) desc = 'Mostly cloudy';
  else if (pct > 20) desc = 'Partly cloudy';
  setText('cloud-desc', desc);
}

/* ── Daily forecast ──────────────────────────────────── */
function renderDaily() {
  const d   = STATE.weather.daily;
  const tz  = STATE.location.timezone;
  const u   = STATE.unit;
  const list = document.getElementById('daily-list');
  list.innerHTML = '';

  const rangeMin = Math.min(...d.temperature_2m_min);
  const rangeMax = Math.max(...d.temperature_2m_max);
  const count    = Math.min(10, d.weather_code.length);

  for (let i = 0; i < count; i++) {
    const info  = getWeatherInfo(d.weather_code[i]);
    const hi    = convertTemp(d.temperature_2m_max[i], u);
    const lo    = convertTemp(d.temperature_2m_min[i], u);
    const rain  = d.precipitation_probability_max[i];
    const day   = formatDayShort(d.time[i], tz);
    const barL  = (d.temperature_2m_min[i] - rangeMin) / (rangeMax - rangeMin);
    const barW  = (d.temperature_2m_max[i] - d.temperature_2m_min[i]) / (rangeMax - rangeMin);

    const row = document.createElement('div');
    row.className = 'daily-row' + (i === 0 ? ' today' : '');
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <div class="daily-day">${day}</div>
      <div class="daily-icon">${info.emoji}</div>
      <div class="daily-rain-prob${rain < 20 ? ' hidden' : ''}">${rain}%</div>
      <div class="daily-bar-wrap">
        <div class="daily-low">${lo}°</div>
        <div class="temp-range-bar">
          <div class="temp-range-fill" style="
            left:${(barL*100).toFixed(1)}%;width:${(barW*100).toFixed(1)}%"></div>
        </div>
        <div class="daily-high">${hi}°</div>
      </div>
    `;
    list.appendChild(row);
  }
}

/* ── Background ──────────────────────────────────────── */
function applyBackground(code, isDay) {
  document.getElementById('weather-bg').className = getBgClass(code, isDay);
  updateParticles(getParticleType(code, isDay));
}

/* ── Particles ───────────────────────────────────────── */
function updateParticles(type) {
  const container = document.getElementById('particles');
  container.innerHTML = '';
  if (type === 'rain')  spawnRain(container, 100);
  if (type === 'storm') { spawnRain(container, 160); spawnLightning(container); }
  if (type === 'snow')  spawnSnow(container, 75);
  if (type === 'stars') { spawnStars(container, 130); spawnShootingStar(container); }
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
  [0, 1].forEach(() => {
    const el = document.createElement('div');
    el.className = 'lightning-bolt';
    c.appendChild(el);
  });
}

function spawnSnow(c, n) {
  const flakes = ['❄','❅','❆','·','•'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'snow-flake';
    el.textContent = flakes[Math.floor(Math.random()*flakes.length)];
    el.style.cssText = `left:${Math.random()*100}%;font-size:${7+Math.random()*14}px;
      animation-duration:${3.5+Math.random()*5}s;animation-delay:-${Math.random()*6}s;
      opacity:${0.4+Math.random()*0.5}`;
    c.appendChild(el);
  }
}

function spawnStars(c, n) {
  for (let i = 0; i < n; i++) {
    const el   = document.createElement('div');
    el.className = 'star-dot';
    const size = 0.8 + Math.random() * 2.2;
    el.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*65}%;
      width:${size}px;height:${size}px;
      animation-duration:${1.5+Math.random()*3}s;animation-delay:-${Math.random()*4}s`;
    c.appendChild(el);
  }
}

function spawnShootingStar(c) {
  const spawn = () => {
    const el = document.createElement('div');
    el.className = 'shooting-star';
    el.style.cssText = `top:${5+Math.random()*35}%;left:${Math.random()*50}%;
      animation-duration:${4+Math.random()*6}s;animation-delay:${Math.random()*8}s`;
    c.appendChild(el);
    setTimeout(() => el.remove(), 15000);
  };
  spawn();
  setTimeout(spawn, 8000 + Math.random() * 12000);
}

/* ── Module card → detail modal clicks ───────────────── */
function initModuleCardClicks() {
  const mappings = [
    { id: 'uv-card',       type: 'uv'       },
    { id: 'wind-card',     type: 'wind'     },
    { id: 'humidity-card', type: 'humidity' },
    { id: 'precip-card',   type: 'precip'   },
  ];

  mappings.forEach(({ id, type }) => {
    const card = document.getElementById(id);
    if (!card) return;
    card.style.cursor = 'pointer';
    // "tap" cue arrow
    const cue = document.createElement('div');
    cue.className = 'card-expand-cue';
    cue.textContent = '›';
    cue.setAttribute('aria-hidden', 'true');
    card.appendChild(cue);

    card.addEventListener('click', () => openDetail(type));
  });
}

/* ── Search ──────────────────────────────────────────── */
function initSearch() {
  const input    = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { closeDropdown(); return; }
    timer = setTimeout(async () => {
      const results = await API.searchLocations(q);
      renderDropdown(results);
    }, 320);
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.dropdown-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const f = dropdown.querySelector('.focused');
      const n = f ? f.nextElementSibling : items[0];
      f?.classList.remove('focused'); n?.classList.add('focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const f = dropdown.querySelector('.focused');
      f?.classList.remove('focused'); f?.previousElementSibling?.classList.add('focused');
    } else if (e.key === 'Enter') {
      dropdown.querySelector('.focused')?.click();
    } else if (e.key === 'Escape') {
      closeDropdown(); input.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) closeDropdown();
  });
}

function renderDropdown(results) {
  const dropdown = document.getElementById('search-dropdown');
  if (!results.length) { closeDropdown(); return; }

  dropdown.innerHTML = results.map(r => {
    const region = [r.admin1, r.country_code].filter(Boolean).join(', ');
    return `
      <div class="dropdown-item" role="option" tabindex="-1"
           data-lat="${r.latitude}" data-lon="${r.longitude}"
           data-name="${r.name}" data-state="${r.admin1 ?? ''}"
           data-country="${r.country_code ?? ''}" data-tz="${r.timezone ?? 'auto'}">
        <span class="dropdown-pin">📍</span>
        <div>
          <div class="dropdown-city">${r.name}</div>
          <div class="dropdown-region">${region}</div>
        </div>
      </div>
    `;
  }).join('');

  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => selectLocation(item.dataset));
  });

  dropdown.classList.add('open');
}

function closeDropdown() {
  document.getElementById('search-dropdown').classList.remove('open');
}

async function selectLocation(data) {
  STATE.location = {
    name:     data.name,
    state:    data.state,
    country:  data.country,
    lat:      parseFloat(data.lat),
    lon:      parseFloat(data.lon),
    timezone: data.tz,
  };
  lsSet(LS.LOCATION, STATE.location);
  closeDropdown();
  document.getElementById('search-input').value = '';
  await loadWeather();
}

/* ── Saved locations ─────────────────────────────────── */
function checkSaveButton() {
  const btn     = document.getElementById('save-btn');
  const isSaved = STATE.saved.some(s => s.name === STATE.location.name);
  btn.textContent = isSaved ? '♥' : '♡';
  btn.classList.toggle('saved', isSaved);
  btn.onclick = toggleSave;
}

function toggleSave() {
  const loc = STATE.location;
  const w   = STATE.weather;
  const u   = STATE.unit;
  const idx = STATE.saved.findIndex(s => s.name === loc.name);

  if (idx > -1) {
    STATE.saved.splice(idx, 1);
    showToast(`Removed ${loc.name}`);
  } else {
    const c    = w.current;
    const info = getWeatherInfo(c.weather_code);
    STATE.saved.push({
      name:      loc.name, state: loc.state, country: loc.country,
      lat:       loc.lat,  lon:   loc.lon,   timezone: loc.timezone,
      temp:      convertTemp(c.temperature_2m, u),
      condition: info.label, emoji: info.emoji,
    });
    showToast(`Saved ${loc.name}`);
  }

  lsSet(LS.SAVED, STATE.saved);
  checkSaveButton();
  renderSaved();
}

function renderSaved() {
  const section = document.getElementById('saved-section');
  const grid    = document.getElementById('saved-grid');
  if (!STATE.saved.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  grid.innerHTML = '';

  STATE.saved.forEach((s, idx) => {
    const tile = document.createElement('div');
    tile.className = 'saved-tile';
    tile.innerHTML = `
      <div class="saved-tile-name">${s.name}</div>
      <div class="saved-tile-condition">${s.emoji} ${s.condition}</div>
      <div class="saved-tile-temp">${s.temp}°</div>
      <button class="saved-tile-remove" title="Remove" data-idx="${idx}">✕</button>
    `;
    tile.addEventListener('click', (e) => {
      if (e.target.classList.contains('saved-tile-remove')) {
        e.stopPropagation();
        STATE.saved.splice(parseInt(e.target.dataset.idx), 1);
        lsSet(LS.SAVED, STATE.saved);
        renderSaved(); checkSaveButton();
        return;
      }
      STATE.location = {
        name: s.name, state: s.state, country: s.country,
        lat: s.lat, lon: s.lon, timezone: s.timezone,
      };
      lsSet(LS.LOCATION, STATE.location);
      loadWeather();
    });
    grid.appendChild(tile);
  });
}

/* ── Unit toggle ─────────────────────────────────────── */
function initUnitToggle() {
  document.getElementById('unit-toggle').addEventListener('click', (e) => {
    const opt = e.target.closest('.unit-opt');
    if (!opt || opt.dataset.unit === STATE.unit) return;
    STATE.unit = opt.dataset.unit;
    lsSet(LS.UNIT, STATE.unit);
    syncUnitToggle();
    if (STATE.weather) renderAll();
  });
}

function syncUnitToggle() {
  document.querySelectorAll('.unit-opt').forEach(o => {
    o.classList.toggle('active', o.dataset.unit === STATE.unit);
  });
}

/* ── Geolocation ─────────────────────────────────────── */
function initGeoBtn() {
  document.getElementById('geo-btn').addEventListener('click', async () => {
    const btn = document.getElementById('geo-btn');
    btn.classList.add('loading');
    try {
      const { lat, lon } = await API.getCurrentPosition();
      const loc = await API.reverseGeocode(lat, lon);
      if (loc) {
        STATE.location = { ...loc };
        lsSet(LS.LOCATION, STATE.location);
        await loadWeather();
      }
    } catch (err) {
      showToast('Location access denied', true);
    } finally {
      btn.classList.remove('loading');
    }
  });
}

/* ── UI helpers ──────────────────────────────────────── */
function showLoading() { document.getElementById('loading-overlay').classList.add('active'); }
function hideLoading() { document.getElementById('loading-overlay').classList.remove('active'); }

let toastTimer = null;
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
