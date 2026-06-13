const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const router = express.Router()

router.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), password: hashed, role: 'AGENT' },
    })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

module.exports = router
