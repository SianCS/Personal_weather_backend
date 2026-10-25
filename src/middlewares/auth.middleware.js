import jwt from 'jsonwebtoken'

export function authMiddleware(req,res,next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message : "Missing token" })

    const token = auth.slice(7)
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET)
      req.user = decode
      next()
    } catch (error) {
      res.status(401).json({ message : "Invalid token" })
    }
}
