'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Radar / Cloud Timelapse Controller
   APIs: RainViewer (radar frames) + CartoDB (dark basemap)
   ════════════════════════════════════════════════════════ */

let map         = null;
let radarLayers = [];   // one Leaflet tile layer per radar frame
let frameData   = [];   // { time, path } objects from RainViewer
let currentIdx  = 0;
let playing     = false;
let playTimer   = null;
let playSpeed   = 4000; // ms between frames
let host        = 'https://tilecache.rainviewer.com';
let weatherData = null;

document.addEventListener('DOMContentLoaded', radarInit);

/* ── Initialize ──────────────────────────────────────── */
async function radarInit() {
  const loc = lsGet(LS.LOCATION, {
    name:    'St. Louis',
    state:   'Missouri',
    country: 'US',
    lat:     38.627,
    lon:     -90.197,
  });

  // Update city name in nav
  const navCity = document.getElementById('nav-city-name');
  if (navCity) navCity.textContent = loc.name + (loc.state ? ', ' + loc.state : '');

  // Init Leaflet map
  map = L.map('radar-map', {
    center:       [loc.lat, loc.lon],
    zoom:         6,
    zoomControl:  true,
    attributionControl: true,
  });

  // Dark basemap (CartoDB Dark Matter — free, no key)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains:  'abcd',
    maxZoom:     18,
  }).addTo(map);

  // Location dot marker
  addLocationMarker(loc);

  // Weather bubble marker (fetch current weather for the pin)
  try {
    weatherData = await API.fetchWeather(loc.lat, loc.lon);
    addWeatherBubble(loc, weatherData);
  } catch (_) {}

  // Load RainViewer radar frames
  await loadRadar();

  // Set up controls
  setupControls();
}

/* ── Location markers ────────────────────────────────── */
function addLocationMarker(loc) {
  const el = document.createElement('div');
  el.className = 'loc-marker-wrap';
  el.innerHTML = '<div class="loc-pulse"></div><div class="loc-dot"></div>';

  const icon = L.divIcon({
    html:      el.outerHTML,
    className: '',
    iconSize:  [44, 44],
    iconAnchor:[22, 22],
  });

  L.marker([loc.lat, loc.lon], { icon, zIndexOffset: 1000 }).addTo(map);
}

function addWeatherBubble(loc, w) {
  if (!w?.current) return;
  const unit     = lsGet(LS.UNIT, 'F');
  const temp     = convertTemp(w.current.temperature_2m, unit);
  const info     = getWeatherInfo(w.current.weather_code);

  const el = document.createElement('div');
  el.className = 'weather-bubble';
  el.innerHTML = `<span>${info.emoji}</span><span>${temp}°</span>`;

  const icon = L.divIcon({
    html:       el.outerHTML,
    className:  '',
    iconSize:   [null, null],
    iconAnchor: [20, 54],
  });

  L.marker([loc.lat, loc.lon], { icon, zIndexOffset: 2000 }).addTo(map);
}

/* ── Load RainViewer radar ───────────────────────────── */
async function loadRadar() {
  try {
    const res  = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    host       = data.host;

    // Combine past frames + a couple nowcast frames
    const past     = data.radar?.past     ?? [];
    const nowcast  = data.radar?.nowcast  ?? [];
    frameData = [...past, ...nowcast.slice(0, 3)];

    if (!frameData.length) throw new Error('No frames');

    // Create a Leaflet tile layer for each frame (all invisible initially)
    radarLayers = frameData.map(frame =>
      L.tileLayer(buildTileUrl(frame.path), {
        opacity:      0,
        tileSize:     512,
        zoomOffset:   -1,
        attribution:  'RainViewer',
        maxZoom:      18,
      }).addTo(map)
    );

    // Show most recent (last) frame
    currentIdx = radarLayers.length - 1;
    showFrame(currentIdx);

    // Update scrubber range
    const scrubber = document.getElementById('radar-scrubber');
    scrubber.max   = radarLayers.length - 1;
    scrubber.value = currentIdx;

    updateTimeDisplay(currentIdx);
    hideLoading();
  } catch (err) {
    console.error('RainViewer load error:', err);
    document.getElementById('radar-time-display').textContent = 'Radar unavailable';
    hideLoading();
  }
}

function buildTileUrl(path) {
  // color=6 = standard radar colorscheme (matches iOS Weather app closely)
  // options = 1_0 = smooth=1, snow=0
  return `${host}${path}/512/{z}/{x}/{y}/6/1_0.png`;
}

/* ── Frame navigation ────────────────────────────────── */
function showFrame(idx) {
  radarLayers.forEach((layer, i) => {
    layer.setOpacity(i === idx ? 0.75 : 0);
  });
  currentIdx = idx;
  document.getElementById('radar-scrubber').value = idx;
  updateTimeDisplay(idx);
}

function updateTimeDisplay(idx) {
  const el   = document.getElementById('radar-time-display');
  const frame = frameData[idx];
  if (!frame) { el.textContent = '—'; return; }

  const ts   = frame.time * 1000;
  const now  = Date.now();
  const diff = ts - now;
  const absDiff = Math.abs(diff);

  // Is this a nowcast (future) frame?
  const isNowcast = diff > 60000;

  const timeStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    hour12:  true,
  }).format(new Date(ts));

  const suffix = isNowcast ? '  ·  Forecast' :
    absDiff < 600000 ? '  ·  Now' : '';

  el.textContent = timeStr + suffix;
}

/* ── Playback controls ───────────────────────────────── */
function setupControls() {
  const playBtn  = document.getElementById('play-btn');
  const scrubber = document.getElementById('radar-scrubber');

  // Play / Pause
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸' : '▶';
    if (playing) startPlayback();
    else         stopPlayback();
  });

  // Scrubber
  scrubber.addEventListener('input', () => {
    stopPlayback();
    playing = false;
    document.getElementById('play-btn').textContent = '▶';
    showFrame(parseInt(scrubber.value));
  });

  // Speed buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playSpeed = parseInt(btn.dataset.speed);
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (playing) { stopPlayback(); startPlayback(); }
    });
  });
}

function startPlayback() {
  stopPlayback();
  // If at last frame, restart from beginning
  if (currentIdx >= radarLayers.length - 1) currentIdx = 0;
  playTimer = setInterval(() => {
    const next = (currentIdx + 1) % radarLayers.length;
    showFrame(next);
    // Pause at last frame briefly
    if (next === radarLayers.length - 1) {
      stopPlayback();
      setTimeout(() => {
        if (playing) startPlayback();
      }, playSpeed * 2);
    }
  }, playSpeed);
}

function stopPlayback() {
  clearInterval(playTimer);
  playTimer = null;
}

/* ── Utilities ───────────────────────────────────────── */
function hideLoading() {
  document.getElementById('radar-loading').classList.add('hidden');
}

// Expose convertTemp / getWeatherInfo since shared utils.js may not re-declare
// (they come from utils.js / codes.js already loaded above this script)
