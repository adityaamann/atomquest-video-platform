const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

const uploadsDir = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true)
    cb(new Error(`File type not allowed. Accepted: jpg, png, gif, pdf, doc, docx`))
  },
})

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' })
    }
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    res.json({
      fileUrl: `/api/files/${req.file.filename}`,
      fileType: req.file.mimetype,
      originalName: req.file.originalname,
    })
  })
})

router.get('/:filename', (req, res) => {
  // Basic path traversal protection
  const filename = path.basename(req.params.filename)
  const filePath = path.join(uploadsDir, filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
  res.sendFile(filePath)
})

module.exports = router
