const captchaStore = require('./captchaStore'); // agar separate file banaye

router.post('/', async (req, res) => {
  const { email, password, captchaInput, captchaToken } = req.body;

  // ✅ CAPTCHA CHECK
  if (!captchaStore[captchaToken]) {
    return res.status(400).json({ message: 'Captcha expired' });
  }

  if (captchaInput !== captchaStore[captchaToken]) {
    return res.status(400).json({ message: 'Captcha incorrect' });
  }

  delete captchaStore[captchaToken];

  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );

    if (rows.length === 0)
      return res.status(400).json({ message: 'User not found' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).json({ message: 'Incorrect password' });

    res.status(200).json({ message: 'Login successful' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
