const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();

// 🔐 Middleware
app.use(cors({ origin: 'http://127.0.0.1:3001' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🌐 Serve frontend static files from 'frontend/pages' folder
const frontendPagesPath = path.join(__dirname, '../frontend/pages');
app.use(express.static(frontendPagesPath));

// 📄 Default route to load home page (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPagesPath, 'index.html'));
});

// 📂 Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🗂️ Multer file upload config
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// 📦 Route imports
const registerRoute = require('./routes/register');
const loginRoute = require('./routes/login');
const captchaRoute = require('./routes/captcha');
const admissionRoute = require('./routes/admission');

// 🔗 Mount API routes
app.use('/register', registerRoute);
app.use('/login', loginRoute);
app.use('/captcha', captchaRoute);
app.use('/admission', admissionRoute);

// ✍️ Admission form submission with files
app.post('/admission', upload.fields([
  { name: 'photo' },
  { name: 'signature' },
  { name: 'marksheet' },
  { name: 'caste_certificate' }
]), async (req, res) => {
  try {
    const f = req.body;
    const files = req.files;

    const [rows] = await db.execute("SELECT COUNT(*) as count FROM admissions");
    const count = rows[0].count + 1;
    const admission_id = `ADM${String(count).padStart(3, '0')}`;

    const query = `
      INSERT INTO admissions (
        admission_id, title, first_name, middle_name, last_name, full_name,
        mother_name, gender, address, taluka, district, pin_code, state,
        mobile, email, aadhaar, dob, age, religion, caste_category, caste,
        caste_certificate, marksheet, photo, signature, physically_handicapped
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      admission_id,
      f.title,
      f.first_name,
      f.middle_name,
      f.last_name,
      f.full_name,
      f.mother_name,
      f.gender,
      f.address,
      f.taluka,
      f.district,
      f.pincode,
      f.state,
      f.mobile,
      f.email,
      f.aadhaar,
      f.dob,
      f.age,
      f.religion,
      f.caste_category,
      f.caste,
      files.caste_certificate?.[0]?.filename || null,
      files.marksheet?.[0]?.filename || null,
      files.photo?.[0]?.filename || null,
      files.signature?.[0]?.filename || null,
      f.physically_handicapped
    ];

    await db.execute(query, values);
    res.status(200).json({ message: 'Admission form submitted successfully.' });
  } catch (err) {
    console.error('❌ Error submitting admission form:', err);
    res.status(500).json({ message: 'Failed to submit form.' });
  }
});

// 🚀 Start server
app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
  console.log('🏠 Home: http://localhost:3000/');             // serves index.html in frontend/pages
  console.log('🔐 Login: http://localhost:3000/login.html');  // direct access
  console.log('📝 Register: http://localhost:3000/register.html'); // direct access
});
