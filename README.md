# Aura Weather

A fully handcoded weather web app with an Apple Liquid Glass aesthetic,
built for CSE 2004 final project.

## Features

- **Live weather** for any city worldwide via search with autocomplete
- **Location photo** pulled from Wikipedia for each searched city
- **Dynamic animated backgrounds** — rain, snow, stars, storm lightning — keyed to actual weather + time of day
- **Animated SVG modules** — UV index arc gauge, wind compass with animating needle, sunrise/sunset arc with live sun position
- **Extended 14-day forecast** with a smooth Bezier temperature chart drawn on Canvas
- **Air Quality Index** page with an animated ring gauge, 6 pollutant cards, and hourly AQI chart
- **Fahrenheit/Celsius toggle** across all pages
- **Geolocation** with reverse geocoding to auto-detect your city
- **Save locations** to localStorage — switch between saved cities instantly

## APIs Used (6 total)

| API | Purpose |
|-----|---------|
| [Open-Meteo Forecast](https://open-meteo.com) | Current weather, hourly + daily forecasts |
| [Open-Meteo Geocoding](https://geocoding-api.open-meteo.com) | City name → coordinates (search autocomplete) |
| [Open-Meteo Air Quality](https://air-quality-api.open-meteo.com) | PM2.5, PM10, ozone, NO2, SO2, CO, US AQI |
| [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) | Coordinates → city name (reverse geocoding) |
| [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1) | Location hero images |
| Browser Geolocation API | User's current GPS coordinates |

All APIs are free with no API key required.

## File Structure

```
aura-weather/
├── index.html           Main weather dashboard
├── forecast.html        14-day forecast + temperature chart
├── air-quality.html     AQI ring, pollutant cards, hourly chart
├── css/
│   ├── main.css         Design system, glass cards, all components
│   └── animations.css   Weather backgrounds, rain, snow, stars, particles
└── js/
    ├── codes.js         WMO weather code → label/emoji/bg-theme mapping
    ├── utils.js         Unit conversions, time formatting, SVG geometry helpers
    ├── api.js           All external API fetch functions
    ├── app.js           index.html controller
    ├── forecast.js      forecast.html controller
    └── aqi.js           air-quality.html controller
```

## Deploying to GitHub Pages

1. Create a new GitHub repository
2. Push all files (keeping the folder structure above)
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch, root folder `/`
5. Click Save — your site will be live at `https://<username>.github.io/<repo-name>/`

> **Note:** All APIs use HTTPS and have CORS enabled, so they work from
> GitHub Pages without a backend.

## Design Language

The visual style is inspired by Apple's **Liquid Glass** design introduced at
WWDC 2025 — achieved via:
- `backdrop-filter: blur(24px) saturate(180%)` on all glass surfaces
- Multi-layer `box-shadow` with inner highlight + outer depth
- `rgba(255,255,255,0.10)` base background with `0.18` border opacity
- Specular highlight via `::before` gradient overlay on every glass card
- CSS animated gradient backgrounds with dynamic particle overlays (JS)

## Local Development

No build step needed. Open `index.html` directly in a browser or serve
with any static server:

```bash
npx serve .
# or
python3 -m http.server
```
