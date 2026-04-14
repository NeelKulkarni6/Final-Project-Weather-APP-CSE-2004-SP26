'use strict';

/**
 * WMO Weather Interpretation Codes
 * Maps numeric codes from Open-Meteo API to labels, emojis, and bg themes
 */
const WMO = {
  0:  { label: 'Clear Sky',                    emoji: '☀️',  bg: 'clear'   },
  1:  { label: 'Mainly Clear',                 emoji: '🌤️', bg: 'clear'   },
  2:  { label: 'Partly Cloudy',                emoji: '⛅',  bg: 'partly'  },
  3:  { label: 'Overcast',                     emoji: '☁️',  bg: 'cloudy'  },
  45: { label: 'Foggy',                        emoji: '🌫️', bg: 'fog'     },
  48: { label: 'Depositing Rime Fog',          emoji: '🌫️', bg: 'fog'     },
  51: { label: 'Light Drizzle',                emoji: '🌦️', bg: 'drizzle' },
  53: { label: 'Drizzle',                      emoji: '🌦️', bg: 'drizzle' },
  55: { label: 'Dense Drizzle',                emoji: '🌧️', bg: 'rain'    },
  56: { label: 'Light Freezing Drizzle',       emoji: '🌨️', bg: 'sleet'   },
  57: { label: 'Freezing Drizzle',             emoji: '🌨️', bg: 'sleet'   },
  61: { label: 'Light Rain',                   emoji: '🌧️', bg: 'rain'    },
  63: { label: 'Rain',                         emoji: '🌧️', bg: 'rain'    },
  65: { label: 'Heavy Rain',                   emoji: '🌧️', bg: 'rain'    },
  66: { label: 'Light Freezing Rain',          emoji: '🌨️', bg: 'sleet'   },
  67: { label: 'Freezing Rain',                emoji: '🌨️', bg: 'sleet'   },
  71: { label: 'Light Snowfall',               emoji: '🌨️', bg: 'snow'    },
  73: { label: 'Snowfall',                     emoji: '❄️',  bg: 'snow'    },
  75: { label: 'Heavy Snowfall',               emoji: '❄️',  bg: 'snow'    },
  77: { label: 'Snow Grains',                  emoji: '🌨️', bg: 'snow'    },
  80: { label: 'Light Rain Showers',           emoji: '🌦️', bg: 'rain'    },
  81: { label: 'Rain Showers',                 emoji: '🌧️', bg: 'rain'    },
  82: { label: 'Violent Rain Showers',         emoji: '⛈️', bg: 'storm'   },
  85: { label: 'Slight Snow Showers',          emoji: '🌨️', bg: 'snow'    },
  86: { label: 'Heavy Snow Showers',           emoji: '❄️',  bg: 'snow'    },
  95: { label: 'Thunderstorm',                 emoji: '⛈️', bg: 'storm'   },
  96: { label: 'Thunderstorm with Hail',       emoji: '⛈️', bg: 'storm'   },
  99: { label: 'Thunderstorm & Heavy Hail',    emoji: '⛈️', bg: 'storm'   },
};

/**
 * Background CSS class map — day / night variants per weather condition
 */
const BG_MAP = {
  clear:   { day: 'bg-clear-day',    night: 'bg-clear-night'   },
  partly:  { day: 'bg-partly-day',   night: 'bg-partly-night'  },
  cloudy:  { day: 'bg-cloudy',       night: 'bg-cloudy-night'  },
  drizzle: { day: 'bg-rain',         night: 'bg-rain-night'    },
  rain:    { day: 'bg-rain',         night: 'bg-rain-night'    },
  sleet:   { day: 'bg-sleet',        night: 'bg-rain-night'    },
  snow:    { day: 'bg-snow',         night: 'bg-snow-night'    },
  storm:   { day: 'bg-storm',        night: 'bg-storm'         },
  fog:     { day: 'bg-fog',          night: 'bg-fog-night'     },
};

function getWeatherInfo(code) {
  return WMO[code] ?? { label: 'Unknown', emoji: '🌡️', bg: 'clear' };
}

function getBgClass(code, isDay) {
  const { bg } = getWeatherInfo(code);
  const map = BG_MAP[bg] ?? BG_MAP.clear;
  return isDay ? map.day : map.night;
}

/**
 * Returns the particle effect type needed for this condition
 * 'rain' | 'snow' | 'storm' | 'stars' | 'none'
 */
function getParticleType(code, isDay) {
  const { bg } = getWeatherInfo(code);
  if (bg === 'snow') return 'snow';
  if (['rain', 'drizzle', 'sleet'].includes(bg)) return 'rain';
  if (bg === 'storm') return 'storm';
  if (!isDay && (bg === 'clear' || bg === 'partly')) return 'stars';
  return 'none';
}
