# WeatherVista — Backend

REST API for WeatherVista, a weather dashboard with city search, map-based lookups, favorites and a 5-day forecast. It wraps the OpenWeatherMap API and caches responses in MySQL to keep the app fast and reduce external API calls.

> Frontend (React + Vite): [SianCS/Personal_weather_fornted](https://github.com/SianCS/Personal_weather_fornted)

![Dashboard](https://raw.githubusercontent.com/SianCS/Personal_weather_fornted/main/docs/dashboard.png)

## Tech Stack

Node.js · Express 5 · Prisma ORM · MySQL · JWT · bcrypt · Yup · Helmet · express-rate-limit · Axios

## Highlights

### Caching strategy
Each kind of data is cached for as long as it stays useful:

| Data | TTL | How |
|---|---|---|
| Current weather | 15 min | One row per city (`cityId` is unique), refreshed with `upsert` |
| 5-day forecast | 3 h | Matches OpenWeatherMap's 3-hour update cycle; old and new rows are swapped in a single `$transaction` |
| Cities | permanent | Name and coordinates never change |

Every response includes `source: "from_cache" | "from_api"`, so cache hits are easy to verify.

### Avoiding duplicate cities
- Coordinates are rounded to 4 decimals and protected by a unique `(latitude, longitude)` constraint.
- Before creating a city, nearby rows (≈5 km) with the same name are reused.
- If two requests create the same city at the same time, the Prisma `P2002` unique-violation is caught and the existing row is returned.

### Time zones
Forecast entries include `localTime` (UTC + the city's offset), so the frontend can group days by the city's real calendar date instead of UTC.

### Security & error handling
- Passwords hashed with bcrypt; JWT auth via `Authorization: Bearer <token>`
- Users can only rename/delete their own favorites
- Helmet headers, a general rate limit, and a stricter limit on `/api/auth` against password guessing
- A central error handler maps Prisma and Axios errors to proper HTTP status codes (409, 404, 502…)
- Graceful shutdown disconnects Prisma on `SIGINT`/`SIGTERM`

## API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create an account |
| POST | `/api/auth/login` | – | Get a JWT (valid 7 days) |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/weather?city=Bangkok` | – | Current weather by city name (cached) |
| GET | `/api/weather/by-coords?lat=..&lon=..` | – | Current weather at a map point |
| GET | `/api/weather/:cityId/forecast` | ✓ | 5-day / 3-hour forecast (cached) |
| GET | `/api/cities/search?q=Chiang Mai` | – | Search cities (DB first, then OpenWeatherMap) |
| GET | `/api/favorites` | ✓ | List favorites |
| POST | `/api/favorites` | ✓ | Add by `cityId` or `cityName`, optional `favoriteName` |
| PATCH | `/api/favorites/:id` | ✓ | Rename a favorite |
| DELETE | `/api/favorites/:id` | ✓ | Remove a favorite |

## Data Model

```
User 1 ── N FavoriteLocation N ── 1 City
                                    ├── 1 WeatherData   (current-weather cache)
                                    └── N Forecast      (forecast cache, JSON)
```

## Getting Started

Requires Node.js 18+, MySQL and a free [OpenWeatherMap API key](https://home.openweathermap.org/api_keys).

```bash
npm install
cp .env.example .env    # fill in DATABASE_URL, JWT_SECRET, OWM_KEY
npx prisma db push      # create tables from prisma/schema.prisma
npm run dev             # http://localhost:8555
```

| Variable | Description |
|---|---|
| `PORT` | Server port (frontend expects `8555` by default) |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Secret used to sign tokens |
| `OWM_KEY` | OpenWeatherMap API key |
| `CORS_ORIGIN` | Allowed frontend origin (default `http://localhost:5173`) |
| `TRUST_PROXY` | Number of proxies in front of the app (set `1` on Render/Railway so rate limiting sees real client IPs) |

## Project Structure

```
src/
├── routes/        # Express routers (input checks only)
├── services/      # Business logic, caching, OpenWeatherMap calls
├── middlewares/   # JWT auth
├── validations/   # Yup schemas
├── utils/         # Error handling, rate limiters, graceful shutdown
└── config/        # Prisma client
```
