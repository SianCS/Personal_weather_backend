import rateLimit from 'express-rate-limit'


export const apiLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max : 200,
  standardHeaders : true,
  legacyHeaders :false,
  message: { message: "Too many requests, please try again after 15 minutes." }
})

// จำกัดเข้มกว่าเพื่อกันการเดารหัสผ่าน
export const authLimiter = rateLimit({
  windowMs : 10 * 60 * 1000,
  max : 20,
  standardHeaders : true,
  legacyHeaders :false,
  message: { message: "Too many requests, please try again after 10 minutes." }
})
