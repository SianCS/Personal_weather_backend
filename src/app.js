import express from 'express'
import cors from 'cors'
import weatherRouter from './routes/weather.route.js'
import authRouter from './routes/auth.route.js'
import favoriteRoute from './routes/favorite.route.js'
import cityRoute from './routes/city.route.js'
import error from './utils/error.js'
import { notFound } from './utils/notfound.js'
import { apiLimiter, authLimiter } from './utils/limiter.js'
import helmet from 'helmet'

const app = express()
// จำนวน proxy ข้างหน้า (เช่น Render = 1) เพื่อให้ rate limit เห็น IP จริงของผู้ใช้
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 0))
app.use(helmet())

app.use(express.json())
app.use(cors({
	origin : process.env.CORS_ORIGIN || 'http://localhost:5173'
}))

app.use("/api/auth", authLimiter, authRouter)
app.use("/api/weather", apiLimiter, weatherRouter)
app.use("/api/favorites", apiLimiter, favoriteRoute);
app.use("/api/cities", apiLimiter, cityRoute)

app.use(notFound)
app.use(error)






export default app