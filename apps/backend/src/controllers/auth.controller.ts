import bcrypt from 'bcrypt'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import { query } from '../utils/db'

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    // 1. Check if user exists
    const userResult = await query(
      'SELECT id, email, role, name, password FROM users WHERE email = $1',
      [email],
    )
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const user = userResult.rows[0]

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // 3. Generate JWT token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }

    const secret = process.env.JWT_SECRET || 'gridlock_prototype_jwt_secret_99485'
    // Access token expires in 15 minutes
    const token = jwt.sign(payload, secret, { expiresIn: '15m' })
    // Refresh token expires in 7 days
    const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' })

    // 4. Return user info and token
    return res.status(200).json({
      message: 'Login successful',
      user: {
        email: user.email,
        role: user.role,
        name: user.name,
      },
      token,
      refreshToken,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Internal server error during login' })
  }
}

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    if (!token) {
      return res.status(400).json({ message: 'Refresh token is required' })
    }

    const secret = process.env.JWT_SECRET || 'gridlock_prototype_jwt_secret_99485'

    let decoded: any
    try {
      decoded = jwt.verify(token, secret)
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' })
    }

    // Get user to issue new payload
    const userResult = await query('SELECT id, email, role, name FROM users WHERE id = $1', [
      decoded.id,
    ])
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User no longer exists' })
    }

    const user = userResult.rows[0]
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }

    const newAccessToken = jwt.sign(payload, secret, { expiresIn: '15m' })
    const newRefreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' })

    return res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return res.status(500).json({ message: 'Internal server error during token refresh' })
  }
}
