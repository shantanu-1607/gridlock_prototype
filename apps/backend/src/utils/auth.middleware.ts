import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

// Extend Express Request type to include user payload
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user?: any
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' })
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token format' })
  }

  try {
    const secret = process.env.JWT_SECRET || 'gridlock_prototype_jwt_secret_99485'
    const decoded = jwt.verify(token, secret)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Unauthorized: Token expired or invalid' })
  }
}
