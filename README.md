# Aura Weather
This website was created by Neel Kulkarni, a junior studying finance and cs at WashU. he made this for the class CSE2004 "Web Dev"

This is A   weather web app with an Apple Liquid Glass aesthetic,
built for CSE 2004 final project.

About half of the code was made in Claude and half was written by hand (mostly the HTML and CSS)

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

