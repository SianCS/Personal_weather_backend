import express from "express";
import { searchAndEnsureCity } from "../services/city.service.js";

const cityRoute = express.Router();

/**
 * @route   GET /api/cities/search
 * @desc    ค้นหาเมืองจากฐานข้อมูล ถ้าไม่เจอจะดึงจาก API มาสร้างใหม่
 * @access  Public
 */
cityRoute.get("/search", async (req, res, next) => { 
  const query = req.query.q?.trim();

  if (!query) {
    return res.json({ cities: [] });
  }

  try {
    // เรียกใช้ service เพื่อค้นหาและสร้างเมือง
    const cities = await searchAndEnsureCity(query);
    return res.json({ cities });
  } catch (err) {
    next(err);
  }
});

export default cityRoute;
