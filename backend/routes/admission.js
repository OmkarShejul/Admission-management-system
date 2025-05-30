// routes/admission.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const ExcelJS = require('exceljs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer configuration
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const fileFilter = (req, file, cb) => {
  const allowed = /\.(jpeg|jpg|png|pdf)$/i;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error('Only .jpg, .png, and .pdf files are allowed.'));
};

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter });

// Helper for null-safe values
const safe = v => v === undefined || v === '' ? null : v;

// Helper to generate unique admission ID
// Assuming you have an auto-increment ID column `id` in your admissions table
const generateAdmissionId = async () => {
  const [rows] = await db.execute('SELECT MAX(id) AS maxId FROM admissions');
  const nextId = (rows[0].maxId || 0) + 1;
  return `ADM${String(nextId).padStart(3, '0')}`;
};

// POST /admission → Submit new form
router.post(
  '/',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
    { name: 'marksheet', maxCount: 1 },
    { name: 'caste_certificate', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const f = req.body;
      const files = req.files;

      // Required files validation
      if (!files?.photo || !files?.signature || !files?.marksheet) {
        return res.status(400).json({ message: 'Photo, Signature, and Marksheet are required.' });
      }

      const admission_id = await generateAdmissionId();

      const query = `
        INSERT INTO admissions (
          admission_id, title, first_name, middle_name, last_name, full_name,
          mother_name, gender, address, taluka, district, pin_code, state,
          mobile, email, aadhaar, dob, age, religion, caste_category, caste,
          caste_certificate, marksheet, photo, signature, physically_handicapped
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        admission_id,
        safe(f.title),
        safe(f.first_name),
        safe(f.middle_name),
        safe(f.last_name),
        safe(f.full_name),
        safe(f.mother_name),
        safe(f.gender),
        safe(f.address),
        safe(f.taluka),
        safe(f.district),
        safe(f.pin_code),  // Ensure frontend uses "pin_code"
        safe(f.state),
        safe(f.mobile),
        safe(f.email),
        safe(f.aadhaar),
        safe(f.dob),
        safe(f.age),
        safe(f.religion),
        safe(f.caste_category),
        safe(f.caste),
        files.caste_certificate?.[0]?.filename || null,
        files.marksheet[0].filename,
        files.photo[0].filename,
        files.signature[0].filename,
        safe(f.physically_handicapped)
      ];

      await db.execute(query, values);

      res.status(201).json({ message: 'Admission form submitted successfully.' });
    } catch (err) {
      console.error('[POST /admission]', err);
      res.status(500).json({ message: 'Internal Server Error. ' + err.message });
    }
  }
);

// GET /admission/export → Export all records to Excel
router.get('/export', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM admissions');

    if (!rows.length) return res.status(404).json({ message: 'No data available to export.' });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Admissions');

    sheet.columns = Object.keys(rows[0]).map(key => ({
      header: key.replace(/_/g, ' ').toUpperCase(),
      key
    }));

    sheet.addRows(rows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=admissions.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[GET /admission/export]', err);
    res.status(500).json({ message: 'Export failed. ' + err.message });
  }
});

// GET /admission/:id → Get one record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM admissions WHERE admission_id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /admission/:id]', err);
    res.status(500).json({ message: 'Error fetching record. ' + err.message });
  }
});

// GET /admission → All records (for report)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM admissions ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('[GET /admission]', err);
    res.status(500).json({ message: 'Error fetching records. ' + err.message });
  }
});

// PUT /admission/:id → Update a record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const f = req.body;

    const query = `
      UPDATE admissions SET
        title = ?, first_name = ?, middle_name = ?, last_name = ?, full_name = ?,
        mother_name = ?, gender = ?, address = ?, taluka = ?, district = ?,
        pin_code = ?, state = ?, mobile = ?, email = ?, aadhaar = ?, dob = ?,
        age = ?, religion = ?, caste_category = ?, caste = ?,
        physically_handicapped = ?
      WHERE admission_id = ?
    `;

    const values = [
      safe(f.title),
      safe(f.first_name),
      safe(f.middle_name),
      safe(f.last_name),
      safe(f.full_name),
      safe(f.mother_name),
      safe(f.gender),
      safe(f.address),
      safe(f.taluka),
      safe(f.district),
      safe(f.pin_code),
      safe(f.state),
      safe(f.mobile),
      safe(f.email),
      safe(f.aadhaar),
      safe(f.dob),
      safe(f.age),
      safe(f.religion),
      safe(f.caste_category),
      safe(f.caste),
      safe(f.physically_handicapped),
      id
    ];

    await db.execute(query, values);
    res.json({ message: 'Record updated successfully' });
  } catch (err) {
    console.error('[PUT /admission/:id]', err);
    res.status(500).json({ message: 'Update failed. ' + err.message });
  }
});

// DELETE /admission/:id → Delete record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM admissions WHERE admission_id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('[DELETE /admission/:id]', err);
    res.status(500).json({ message: 'Delete failed. ' + err.message });
  }
});

module.exports = router;
