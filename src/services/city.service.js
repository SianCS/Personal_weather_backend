import axios from "axios";
import prisma from "../config/prisma.config.js";
import { createError } from "../utils/createError.js";
import { findOrCreateCityFromGeo } from "./weather.service.js";

/**
 * ค้นหาเมืองในฐานข้อมูล ถ้าไม่เจอจะดึงจาก API มาสร้างใหม่
 * @param {string} query - คำค้นหาจากผู้ใช้
 * @returns {Promise<Array<object>>} รายการเมืองที่ค้นเจอ
 */
export async function searchAndEnsureCity(query) {
  // 1. ค้นหาใน DB ก่อน
  const dbCities = await prisma.city.findMany({
    where: {
      OR: [
        { cityName: { contains: query } },
        { locationName: { contains: query } },
      ],
    },
    take: 10,
  });

  if (dbCities.length > 0) {
    return dbCities;
  }

  // 2. ถ้าไม่เจอใน DB ให้ดึงจาก OpenWeatherMap API
  const apiRes = await axios.get("https://api.openweathermap.org/geo/1.0/direct", {
    params: { q: query, limit: 1, appid: process.env.OWM_KEY },
  });

  const geo = apiRes.data?.[0];
  if (!geo) {
    createError(404, "City not found from API");
  }

  // 3. หาหรือสร้าง City ด้วย logic เดียวกับ weather service (ปัดพิกัด + กันซ้ำ)
  const city = await findOrCreateCityFromGeo(geo);
  return [city];
}
