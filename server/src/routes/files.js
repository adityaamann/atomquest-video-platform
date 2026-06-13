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

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'])

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    // Sanitize: only use the uuid as filename, ignore original name
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    // Validate both MIME type AND extension
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
      return cb(null, true)
    }
    cb(new Error('File type not supported. Accepted: jpg, png, gif, pdf, doc, docx'))
  },
})

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds 10MB limit.' })
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
  // Path traversal protection: only allow safe filenames (uuid + extension)
  const filename = path.basename(req.params.filename)
  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const filePath = path.join(uploadsDir, filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
  res.sendFile(filePath)
})

module.exports = router
