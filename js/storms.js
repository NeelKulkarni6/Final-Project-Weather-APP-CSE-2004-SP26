'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — Current Storms
   Scans ~75 major cities globally, scores each by storm
   severity, then picks top 4 at least 250 miles apart.
   ════════════════════════════════════════════════════════ */

const WORLD_CITIES = [
  // North America
  { name:'New York',       country:'USA',           lat:40.71,  lon:-74.01  },
  { name:'Miami',          country:'USA',           lat:25.77,  lon:-80.19  },
  { name:'Houston',        country:'USA',           lat:29.76,  lon:-95.37  },
  { name:'Los Angeles',    country:'USA',           lat:34.05,  lon:-118.24 },
  { name:'Chicago',        country:'USA',           lat:41.88,  lon:-87.63  },
  { name:'Seattle',        country:'USA',           lat:47.61,  lon:-122.33 },
  { name:'New Orleans',    country:'USA',           lat:29.95,  lon:-90.07  },
  { name:'Anchorage',      country:'USA',           lat:61.22,  lon:-149.90 },
  { name:'Toronto',        country:'Canada',        lat:43.65,  lon:-79.38  },
  { name:'Vancouver',      country:'Canada',        lat:49.28,  lon:-123.12 },
  { name:'Montreal',       country:'Canada',        lat:45.50,  lon:-73.57  },
  { name:'Mexico City',    country:'Mexico',        lat:19.43,  lon:-99.13  },
  { name:'Havana',         country:'Cuba',          lat:23.11,  lon:-82.37  },
  { name:'Guatemala City', country:'Guatemala',     lat:14.64,  lon:-90.51  },
  // South America
  { name:'Bogota',         country:'Colombia',      lat:4.71,   lon:-74.07  },
  { name:'Lima',           country:'Peru',          lat:-12.05, lon:-77.04  },
  { name:'Belem',          country:'Brazil',        lat:-1.46,  lon:-48.50  },
  { name:'São Paulo',      country:'Brazil',        lat:-23.55, lon:-46.63  },
  { name:'Rio de Janeiro', country:'Brazil',        lat:-22.91, lon:-43.17  },
  { name:'Buenos Aires',   country:'Argentina',     lat:-34.61, lon:-58.38  },
  { name:'Santiago',       country:'Chile',         lat:-33.45, lon:-70.67  },
  { name:'Caracas',        country:'Venezuela',     lat:10.48,  lon:-66.88  },
  // Europe
  { name:'London',         country:'UK',            lat:51.51,  lon:-0.13   },
  { name:'Paris',          country:'France',        lat:48.86,  lon:2.35    },
  { name:'Madrid',         country:'Spain',         lat:40.42,  lon:-3.70   },
  { name:'Rome',           country:'Italy',         lat:41.90,  lon:12.50   },
  { name:'Berlin',         country:'Germany',       lat:52.52,  lon:13.41   },
  { name:'Warsaw',         country:'Poland',        lat:52.23,  lon:21.01   },
  { name:'Stockholm',      country:'Sweden',        lat:59.33,  lon:18.07   },
  { name:'Oslo',           country:'Norway',        lat:59.91,  lon:10.75   },
  { name:'Athens',         country:'Greece',        lat:37.98,  lon:23.73   },
  { name:'Istanbul',       country:'Turkey',        lat:41.01,  lon:28.95   },
  { name:'Dublin',         country:'Ireland',       lat:53.33,  lon:-6.25   },
  { name:'Reykjavik',      country:'Iceland',       lat:64.14,  lon:-21.89  },
  { name:'Lisbon',         country:'Portugal',      lat:38.72,  lon:-9.14   },
  // Africa
  { name:'Cairo',          country:'Egypt',         lat:30.04,  lon:31.24   },
  { name:'Lagos',          country:'Nigeria',       lat:6.45,   lon:3.40    },
  { name:'Nairobi',        country:'Kenya',         lat:-1.29,  lon:36.82   },
  { name:'Cape Town',      country:'South Africa',  lat:-33.93, lon:18.42   },
  { name:'Johannesburg',   country:'South Africa',  lat:-26.20, lon:28.04   },
  { name:'Casablanca',     country:'Morocco',       lat:33.59,  lon:-7.62   },
  { name:'Accra',          country:'Ghana',         lat:5.56,   lon:-0.20   },
  { name:'Dakar',          country:'Senegal',       lat:14.69,  lon:-17.44  },
  { name:'Addis Ababa',    country:'Ethiopia',      lat:9.03,   lon:38.74   },
  { name:'Kinshasa',       country:'DR Congo',      lat:-4.32,  lon:15.32   },
  { name:'Dar es Salaam',  country:'Tanzania',      lat:-6.80,  lon:39.27   },
  // Middle East & Central Asia
  { name:'Riyadh',         country:'Saudi Arabia',  lat:24.69,  lon:46.72   },
  { name:'Baghdad',        country:'Iraq',          lat:33.34,  lon:44.40   },
  { name:'Tehran',         country:'Iran',          lat:35.69,  lon:51.39   },
  { name:'Karachi',        country:'Pakistan',      lat:24.86,  lon:67.01   },
  { name:'Muscat',         country:'Oman',          lat:23.59,  lon:58.59   },
  { name:'Moscow',         country:'Russia',        lat:55.75,  lon:37.62   },
  { name:'Novosibirsk',    country:'Russia',        lat:54.98,  lon:82.90   },
  { name:'Ulaanbaatar',    country:'Mongolia',      lat:47.89,  lon:106.91  },
  // South Asia
  { name:'New Delhi',      country:'India',         lat:28.61,  lon:77.21   },
  { name:'Mumbai',         country:'India',         lat:19.08,  lon:72.88   },
  { name:'Kolkata',        country:'India',         lat:22.57,  lon:88.36   },
  { name:'Chennai',        country:'India',         lat:13.08,  lon:80.27   },
  { name:'Dhaka',          country:'Bangladesh',    lat:23.81,  lon:90.41   },
  { name:'Colombo',        country:'Sri Lanka',     lat:6.93,   lon:79.86   },
  // Southeast Asia
  { name:'Bangkok',        country:'Thailand',      lat:13.75,  lon:100.52  },
  { name:'Ho Chi Minh',    country:'Vietnam',       lat:10.82,  lon:106.63  },
  { name:'Jakarta',        country:'Indonesia',     lat:-6.21,  lon:106.85  },
  { name:'Manila',         country:'Philippines',   lat:14.60,  lon:120.98  },
  { name:'Kuala Lumpur',   country:'Malaysia',      lat:3.14,   lon:101.69  },
  { name:'Singapore',      country:'Singapore',     lat:1.35,   lon:103.82  },
  { name:'Yangon',         country:'Myanmar',       lat:16.87,  lon:96.19   },
  { name:'Hanoi',          country:'Vietnam',       lat:21.03,  lon:105.83  },
  // East Asia
  { name:'Tokyo',          country:'Japan',         lat:35.68,  lon:139.69  },
  { name:'Beijing',        country:'China',         lat:39.91,  lon:116.39  },
  { name:'Shanghai',       country:'China',         lat:31.23,  lon:121.47  },
  { name:'Seoul',          country:'South Korea',   lat:37.57,  lon:126.98  },
  { name:'Hong Kong',      country:'China',         lat:22.28,  lon:114.16  },
  { name:'Taipei',         country:'Taiwan',        lat:25.04,  lon:121.56  },
  { name:'Vladivostok',    country:'Russia',        lat:43.12,  lon:131.90  },
  // Pacific & Oceania
  { name:'Sydney',         country:'Australia',     lat:-33.87, lon:151.21  },
  { name:'Darwin',         country:'Australia',     lat:-12.46, lon:130.84  },
  { name:'Melbourne',      country:'Australia',     lat:-37.81, lon:144.97  },
  { name:'Brisbane',       country:'Australia',     lat:-27.47, lon:153.02  },
  { name:'Auckland',       country:'New Zealand',   lat:-36.87, lon:174.77  },
  { name:'Port Moresby',   country:'Papua NG',      lat:-9.44,  lon:147.18  },
  { name:'Guam',           country:'USA',           lat:13.44,  lon:144.79  },
];

/* ── Storm severity scoring ─────────────────────────── */
const CODE_SCORE = {
  99:10, 96:9, 95:8, 86:7, 67:7, 82:7,
  82:7,  65:6, 75:6, 66:5, 81:5, 85:5,
  63:4,  73:4, 71:3, 77:3, 80:3, 61:2,
  55:2,  53:1, 51:1,
};

function stormScore(current) {
  let score = CODE_SCORE[current.weather_code] || 0;
  const wind = current.wind_speed_10m || 0;
  if (wind > 80) score += 4;
  else if (wind > 55) score += 3;
  else if (wind > 35) score += 2;
  else if (wind > 20) score += 1;
  const precip = current.precipitation || 0;
  if (precip > 15) score += 3;
  else if (precip > 5) score += 2;
  else if (precip > 1) score += 1;
  return score;
}

function stormLabel(code, wind) {
  if ([95,96,99].includes(code)) return 'Thunderstorm';
  if ([82].includes(code)) return 'Violent Rain';
  if ([65,63,80,81].includes(code)) return 'Heavy Rain';
  if ([75,85,86].includes(code)) return 'Heavy Snow';
  if ([66,67].includes(code)) return 'Freezing Rain';
  if (wind > 60) return 'High Winds';
  if ([61,51,53,55].includes(code)) return 'Rain';
  if ([71,73,77].includes(code)) return 'Snow';
  return 'Active Weather';
}

function severityLevel(score) {
  if (score >= 10) return { label:'Extreme', color:'#F44336', bars:5 };
  if (score >= 7)  return { label:'Severe',  color:'#FF5722', bars:4 };
  if (score >= 4)  return { label:'Heavy',   color:'#FF9800', bars:3 };
  if (score >= 2)  return { label:'Moderate',color:'#FDD835', bars:2 };
  return               { label:'Light',    color:'#81C784', bars:1 };
}

/* ── Haversine distance (miles) ─────────────────────── */
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ── Select top 4, min 250 miles apart ──────────────── */
function selectSpreadStorms(ranked) {
  const selected = [];
  for (const city of ranked) {
    if (selected.length >= 4) break;
    const tooClose = selected.some(s =>
      haversineMiles(s.lat, s.lon, city.lat, city.lon) < 250
    );
    if (!tooClose) selected.push(city);
  }
  return selected;
}

/* ── Main fetch + detect ────────────────────────────── */
async function findActiveStorms() {
  const VARS = 'temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,relative_humidity_2m';

  // Batch fetch in groups of 20 to avoid race conditions
  const BATCH = 20;
  const results = [];
  for (let i = 0; i < WORLD_CITIES.length; i += BATCH) {
    const batch = WORLD_CITIES.slice(i, i + BATCH);
    const fetches = batch.map(city => {
      const params = new URLSearchParams({
        latitude: city.lat, longitude: city.lon,
        current: VARS, timezone: 'auto',
      });
      return fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => data ? { ...city, current: data.current } : null)
        .catch(() => null);
    });
    const batchResults = await Promise.all(fetches);
    results.push(...batchResults.filter(Boolean));
  }

  // Score and rank
  const scored = results
    .map(city => ({ ...city, score: stormScore(city.current) }))
    .sort((a, b) => b.score - a.score);

  // Select top 4 spread 250+ miles apart
  return selectSpreadStorms(scored);
}

/* ── Page init ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('loading-overlay').classList.add('active');
  document.getElementById('storms-grid').innerHTML = '';
  updateTimestamp();

  try {
    const storms = await findActiveStorms();
    renderStorms(storms);
  } catch (err) {
    console.error(err);
    document.getElementById('storms-grid').innerHTML =
      '<p style="color:rgba(255,255,255,0.45);padding:20px">Could not load storm data. Please try again.</p>';
  } finally {
    document.getElementById('loading-overlay').classList.remove('active');
  }

  document.getElementById('storms-refresh').addEventListener('click', async () => {
    document.getElementById('loading-overlay').classList.add('active');
    document.getElementById('storms-grid').innerHTML = '';
    document.getElementById('storms-refresh').disabled = true;
    try {
      const storms = await findActiveStorms();
      renderStorms(storms);
      updateTimestamp();
    } finally {
      document.getElementById('loading-overlay').classList.remove('active');
      document.getElementById('storms-refresh').disabled = false;
    }
  });
});

function updateTimestamp() {
  const el = document.getElementById('storms-updated');
  if (el) el.textContent = 'Updated ' + new Intl.DateTimeFormat('en-US', {
    hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true
  }).format(new Date());
}

/* ── Render ─────────────────────────────────────────── */
function renderStorms(storms) {
  const grid = document.getElementById('storms-grid');
  grid.innerHTML = '';
  if (!storms.length) {
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.45);padding:20px">No significant storm activity detected globally at this time.</p>';
    return;
  }

  storms.forEach((storm, i) => {
    const c       = storm.current;
    const info    = typeof getWeatherInfo === 'function' ? getWeatherInfo(c.weather_code) : { emoji:'🌩', label: stormLabel(c.weather_code, c.wind_speed_10m) };
    const sev     = severityLevel(storm.score);
    const label   = stormLabel(c.weather_code, c.wind_speed_10m);
    const wind    = Math.round(c.wind_speed_10m * 0.621371);
    const gusts   = Math.round((c.wind_gusts_10m||0) * 0.621371);
    const temp    = Math.round(c.temperature_2m * 9/5 + 32);
    const dir     = typeof degreesToCardinal === 'function' ? degreesToCardinal(c.wind_direction_10m||0) : '';
    const precip  = c.precipitation ?? 0;

    const card = document.createElement('div');
    card.className = 'storm-card glass';
    card.style.animationDelay = (i * 0.1) + 's';
    card.innerHTML = `
      <div class="storm-rank">#${i+1}</div>
      <div class="storm-header">
        <div>
          <div class="storm-city">${storm.name}</div>
          <div class="storm-country">${storm.country}</div>
        </div>
        <div class="storm-badge" style="background:${sev.color}22;border-color:${sev.color}55;color:${sev.color}">
          ${sev.label}
        </div>
      </div>
      <div class="storm-type-label">${label}</div>
      <div class="storm-icon-row">
        ${stormVisual(c.weather_code, sev.color)}
        <div class="storm-temp-display">${temp}<span style="font-size:22px;font-weight:300">°F</span></div>
      </div>
      <div class="storm-metrics">
        <div class="storm-metric">
          ${svgWindIcon()}
          <div class="sm-value">${wind} <span class="sm-unit">mph</span></div>
          <div class="sm-label">Wind ${dir}</div>
        </div>
        <div class="storm-metric">
          ${svgGustIcon()}
          <div class="sm-value">${gusts} <span class="sm-unit">mph</span></div>
          <div class="sm-label">Gusts</div>
        </div>
        <div class="storm-metric">
          ${svgRainIcon()}
          <div class="sm-value">${precip.toFixed(1)} <span class="sm-unit">mm</span></div>
          <div class="sm-label">Precip</div>
        </div>
        <div class="storm-metric">
          ${svgHumidIcon()}
          <div class="sm-value">${Math.round(c.relative_humidity_2m||0)} <span class="sm-unit">%</span></div>
          <div class="sm-label">Humidity</div>
        </div>
      </div>
      <div class="storm-severity-bar">
        ${[1,2,3,4,5].map(n => `<div class="severity-seg${n <= sev.bars ? ' active' : ''}" style="${n <= sev.bars ? 'background:'+sev.color : ''}"></div>`).join('')}
      </div>
      <div class="storm-coords">${Math.abs(storm.lat).toFixed(1)}°${storm.lat>=0?'N':'S'} · ${Math.abs(storm.lon).toFixed(1)}°${storm.lon>=0?'E':'W'}</div>
    `;
    grid.appendChild(card);
  });
}

/* ── SVG helpers ──────────────────────────────────────── */
function stormVisual(code, color) {
  if ([95,96,99].includes(code)) return `
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12,36 Q8,28 14,20 Q20,10 32,12 Q36,6 44,8 Q56,10 56,22 Q62,26 60,34 Q58,42 48,42 L18,42 Q10,42 12,36 Z"
            stroke="${color}" stroke-width="2" fill="${color}18" stroke-linejoin="round"/>
      <path d="M34,42 L28,54 L36,52 L30,64" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
  if ([65,63,80,81,82].includes(code)) return `
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12,34 Q8,26 14,18 Q20,8 32,10 Q36,4 44,6 Q56,8 56,20 Q62,24 60,32 Q58,40 48,40 L18,40 Q10,40 12,34 Z"
            stroke="${color}" stroke-width="2" fill="${color}18" stroke-linejoin="round"/>
      <line x1="22" y1="44" x2="18" y2="58" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="44" x2="28" y2="58" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="42" y1="44" x2="38" y2="58" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  if ([71,73,75,77,85,86].includes(code)) return `
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12,34 Q8,26 14,18 Q20,8 32,10 Q36,4 44,6 Q56,8 56,20 Q62,24 60,32 Q58,40 48,40 L18,40 Q10,40 12,34 Z"
            stroke="${color}" stroke-width="2" fill="${color}18" stroke-linejoin="round"/>
      <circle cx="22" cy="50" r="3" fill="${color}" opacity="0.7"/>
      <circle cx="32" cy="54" r="3" fill="${color}" opacity="0.7"/>
      <circle cx="42" cy="50" r="3" fill="${color}" opacity="0.7"/>
      <circle cx="27" cy="60" r="3" fill="${color}" opacity="0.5"/>
      <circle cx="37" cy="60" r="3" fill="${color}" opacity="0.5"/>
    </svg>`;
  return `
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14,36 Q10,28 16,20 Q22,10 34,12 Q38,6 46,8 Q58,10 58,22 Q64,26 62,34 Q60,42 50,42 L20,42 Q12,42 14,36 Z"
            stroke="${color}" stroke-width="2" fill="${color}18" stroke-linejoin="round"/>
    </svg>`;
}

function svgWindIcon() {
  return `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M3,7 Q8,3 12,7 Q16,11 12,14"/><path d="M1,11 L14,11"/>
  </svg>`;
}
function svgGustIcon() {
  return `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M1,9 L14,9"/><path d="M1,13 L10,13"/><path d="M3,5 Q9,1 13,5"/>
  </svg>`;
}
function svgRainIcon() {
  return `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M4,10 Q4,5 10,4 Q16,5 16,10 Q18,14 14,15 L6,15 Q2,14 4,10Z"/>
    <line x1="8" y1="17" x2="7" y2="20"/><line x1="12" y1="17" x2="11" y2="20"/>
  </svg>`;
}
function svgHumidIcon() {
  return `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M10,2 Q15,8 15,13 A5,5 0 0 1 5,13 Q5,8 10,2Z"/>
  </svg>`;
}
