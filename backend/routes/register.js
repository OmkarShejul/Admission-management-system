const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const db = require('../db'); // MySQL connection
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 } // ✅ 1MB limit
});

// ✅ POST /register route
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { first_name, middle_name, last_name, mobile, email, password } = req.body;
    const full_name = `${first_name} ${middle_name} ${last_name}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const photo = req.file?.filename || null;

    const query = `
      INSERT INTO users (first_name, middle_name, last_name, full_name, mobile, email, password, photo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [first_name, middle_name, last_name, full_name, mobile, email, hashedPassword, photo]);

    res.status(200).json({ message: 'Registration successful!' });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error. Try again later.' });
  }
});

module.exports = router;
