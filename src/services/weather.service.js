import axios from "axios";
import prisma from "../config/prisma.config.js";
import { createError } from "../utils/createError.js";

// --- Helper Functions ---

const roundCoord = (num) => parseFloat(num.toFixed(4));

const WEATHER_CACHE_MINUTES = 15;
// ระยะ (องศา) ที่ถือว่าเป็นเมืองเดียวกัน ถ้าชื่อตรงกัน (~5 กม.)
const SAME_CITY_RADIUS = 0.05;

async function findCityByCoords(lat, lon) {
    return prisma.city.findFirst({
        where: { latitude: roundCoord(lat), longitude: roundCoord(lon) },
    });
}

async function findCityByName(cityName) {
    const searchName = cityName.trim();
    // ให้ DB เป็นคนค้น (collation ของ MySQL ไม่สนตัวพิมพ์เล็ก/ใหญ่)
    return prisma.city.findFirst({
        where: { OR: [{ cityName: searchName }, { locationName: searchName }] },
    });
}

/**
 * หาหรือสร้างเมืองจากผล geocoding ของ OpenWeatherMap
 * ใช้พิกัดของเมืองจาก geo (ไม่ใช่จุดที่ผู้ใช้คลิก) เพื่อไม่ให้เมืองเดียวกันถูกสร้างซ้ำ
 */
export async function findOrCreateCityFromGeo(geo) {
    const latitude = roundCoord(geo.lat);
    const longitude = roundCoord(geo.lon);

    const exact = await findCityByCoords(latitude, longitude);
    if (exact) return exact;

    const nearby = await prisma.city.findFirst({
        where: {
            cityName: geo.name,
            latitude: { gte: latitude - SAME_CITY_RADIUS, lte: latitude + SAME_CITY_RADIUS },
            longitude: { gte: longitude - SAME_CITY_RADIUS, lte: longitude + SAME_CITY_RADIUS },
        },
    });
    if (nearby) return nearby;

    try {
        return await prisma.city.create({
            data: {
                cityName: geo.name,
                locationName: geo.local_names?.th || geo.name,
                latitude,
                longitude,
            },
        });
    } catch (error) {
        // มี request อื่นสร้างเมืองนี้ไปพร้อมกัน
        if (error.code === 'P2002') {
            return await findCityByCoords(latitude, longitude);
        }
        throw error;
    }
}

/**
 * หาหรือสร้างเมืองจากชื่อ (ใช้ได้กับระบบค้นหา)
 */
export async function getOrCreateCity(cityName) {
    const city = await findCityByName(cityName);
    if (city) return city;

    const geoRes = await axios.get("https://api.openweathermap.org/geo/1.0/direct", {
        params: { q: cityName, limit: 1, appid: process.env.OWM_KEY },
    });

    const geo = geoRes.data?.[0];
    if (!geo) createError(404, `City '${cityName}' not found from external API`);

    return findOrCreateCityFromGeo(geo);
}

/**
 * หาหรือสร้างเมืองจากพิกัด (ใช้กับ map click)
 */
export async function getOrCreateCityByCoords(lat, lon) {
    const city = await findCityByCoords(lat, lon);
    if (city) return city;

    const geoRes = await axios.get("https://api.openweathermap.org/geo/1.0/reverse", {
        params: { lat, lon, limit: 1, appid: process.env.OWM_KEY }
    });

    const geo = geoRes.data?.[0];
    if (!geo) createError(404, "Cannot resolve city name from coordinates");

    return findOrCreateCityFromGeo(geo);
}

/**
 * ดึงข้อมูลอากาศปัจจุบัน ณ พิกัดที่ระบุจาก OpenWeatherMap
 */
async function fetchWeatherFromApi(lat, lon) {
    const [weatherRes, forecastRes] = await Promise.all([
        axios.get("https://api.openweathermap.org/data/2.5/weather", {
            params: { lat, lon, units: "metric", lang: "th", appid: process.env.OWM_KEY },
        }),
        axios.get("https://api.openweathermap.org/data/2.5/forecast", {
            params: { lat, lon, cnt: 1, appid: process.env.OWM_KEY }
        }),
    ]);
    const w = weatherRes.data;
    const chanceOfRain = Math.round((forecastRes.data?.list?.[0]?.pop || 0) * 100);

    return {
        dt: w.dt, timezone: w.timezone, icon: w.weather[0].icon, chanceOfRain,
        timestamp: new Date(w.dt * 1000), temperature: w.main.temp,
        humidity: w.main.humidity, windSpeed: w.wind.speed, description: w.weather[0].description,
    };
}

/**
 * ดึงข้อมูลอากาศปัจจุบันของเมือง (cache 15 นาที)
 */
async function getWeatherForCity(city) {
    const cityInfo = { cityId: city.id, city: city.locationName, latitude: city.latitude, longitude: city.longitude };

    const cacheSince = new Date(Date.now() - WEATHER_CACHE_MINUTES * 60 * 1000);
    const cachedWeather = await prisma.weatherData.findUnique({
        where: { cityId: city.id },
    });

    if (cachedWeather && cachedWeather.updatedAt > cacheSince) {
        return { ...cachedWeather, ...cityInfo, source: "from_cache" };
    }

    const weatherPayload = await fetchWeatherFromApi(city.latitude, city.longitude);

    const updatedWeather = await prisma.weatherData.upsert({
        where: { cityId: city.id },
        update: weatherPayload,
        create: { cityId: city.id, ...weatherPayload },
    });

    return { ...updatedWeather, ...cityInfo, source: "from_api" };
}

/**
 * ดึงข้อมูลอากาศจากชื่อเมือง (พร้อม cache)
 */
export async function getCurrentWeatherByCityName(cityName) {
    const city = await getOrCreateCity(cityName);
    if (!city) createError(500, "Could not find or create city.");

    return getWeatherForCity(city);
}

/**
 * ดึงข้อมูลอากาศจากพิกัด (สำหรับการคลิก map / ตำแหน่งปัจจุบัน)
 * - อากาศและพิกัดที่ส่งกลับ = จุดที่คลิกเป๊ะๆ
 * - cityId/ชื่อ = เมืองที่ใกล้ที่สุด (ใช้กับเมืองโปรดและพยากรณ์ 5 วัน)
 */
export async function getWeatherByCoords(lat, lon) {
    const city = await getOrCreateCityByCoords(lat, lon);
    if (!city) createError(500, "Could not find or create city from coordinates.");

    // พิกัดตรงกับตัวเมือง (เช่น เลือกจากเมืองโปรด) ใช้ cache ของเมืองได้
    if (city.latitude === roundCoord(lat) && city.longitude === roundCoord(lon)) {
        return getWeatherForCity(city);
    }

    // จุดอื่นๆ ดึงอากาศ ณ จุดนั้นโดยตรง และไม่บันทึกทับ cache ของเมือง
    const weatherPayload = await fetchWeatherFromApi(lat, lon);
    return {
        ...weatherPayload,
        cityId: city.id,
        city: city.locationName,
        latitude: lat,
        longitude: lon,
        source: "from_api_by_coords",
    };
}

/**
 * ดึงพยากรณ์อากาศ 5 วัน (พร้อม Cache)
 */
export async function getFiveDayForecastByCityId(cityId) {
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) createError(404, "City not found in database");

    const THREE_HOURS_AGO = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const cachedForecast = await prisma.forecast.findFirst({
        where: { cityId, fetchedAt: { gte: THREE_HOURS_AGO } },
        orderBy: { fetchedAt: 'desc' }
    });

    if (cachedForecast) {
        return { city: { id: city.id, name: city.locationName }, forecasts: cachedForecast.data };
    }

    const forecastRes = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
        params: { lat: city.latitude, lon: city.longitude, units: "metric", lang: "th", appid: process.env.OWM_KEY },
    });

    // dt_txt เป็นเวลา UTC ต้องบวก timezone ของเมืองก่อน ถึงจะแบ่งวันได้ตรงกับวันจริงของเมืองนั้น
    const tzOffset = forecastRes.data.city.timezone;
    const forecasts = forecastRes.data.list.map((item) => ({
        time: item.dt_txt,
        localTime: new Date((item.dt + tzOffset) * 1000).toISOString().slice(0, 16).replace("T", " "),
        temperature: item.main.temp, feels_like: item.main.feels_like,
        humidity: item.main.humidity, description: item.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`,
        chanceOfRain: Math.round((item.pop || 0) * 100),
    }));

    // ลบของเก่าและบันทึกของใหม่พร้อมกัน ป้องกันกรณีลบแล้วบันทึกไม่สำเร็จ
    await prisma.$transaction([
        prisma.forecast.deleteMany({ where: { cityId } }),
        prisma.forecast.create({
            data: {
                cityId,
                forecastTime: new Date(forecastRes.data.list[0].dt * 1000),
                data: forecasts,
            }
        }),
    ]);

    return { city: { id: city.id, name: city.locationName }, forecasts };
}
