# 🌤️ พญากรอากาศ (WeatherVista)

เว็บแอปแสดงข้อมูลพยากรณ์อากาศแบบ Interactive คล้าย windy.com  
รองรับการใช้งานทั้ง Guest และผู้ใช้ที่ลงทะเบียน  
แสดงข้อมูลจาก [OpenWeatherMap](https://openweathermap.org) พร้อมระบบ Favorite เมือง

---

## 🗂️ Features

- ✅ ค้นหาเมืองและดูอากาศได้ทันที (Guest Mode)
- ✅ แสดงพยากรณ์อากาศรายชั่วโมง 5 วันล่วงหน้า
- ✅ ลงทะเบียน/เข้าสู่ระบบด้วย JWT
- ✅ เพิ่ม/ลบ เมืองโปรดได้
- ✅ ข้อมูลอากาศแยกตามเวลา (timestamp-based)
- ✅ Prisma + mysql + REST API

---

## 🧱 Tech Stack

| Layer     | Stack                         |
|-----------|-------------------------------|
| Frontend  | React / Node.js / Tailwind    |
| Backend   | Node.js + Express /  API |
| DB        | Mysql (Prisma ORM)       |
| Auth      | JWT                           |
| Weather   | OpenWeatherMap API            |
| Map (optional) | Leaflet.js               |

---



**ความสัมพันธ์หลัก:**
- `City` 1:N `Weather_Data` → แยกตาม timestamp
- `User` M:N `City` ผ่าน `Favorite_Location`

---



### Guest API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/weather?city=Bangkok` | ข้อมูลอากาศล่าสุด |
| GET    | `/api/weather/:cityId/forecast` | Time-series forecast |
| GET    | `/api/cities/search?q=เชียงใหม่` | ค้นหาเมือง |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/auth/register` | สมัครสมาชิก |
| POST   | `/api/auth/login`    | เข้าสู่ระบบ |
| GET    | `/api/users/me`      | ดึงข้อมูลผู้ใช้ |

### Favorite

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/favorites` | ดึงรายการโปรด |
| POST   | `/api/favorites` | เพิ่มเมืองโปรด |
| DELETE | `/api/favorites/:id` | ลบเมืองโปรด |

---

