const express = require('express');
const svgCaptcha = require('svg-captcha');
const router = express.Router();

// Temporary store (better: Redis / session use karo)
const captchaStore = {};

router.get('/', (req, res) => {
  const captcha = svgCaptcha.create();
  const token = Date.now().toString();

  captchaStore[token] = captcha.text;

  res.json({
    token,
    captcha: captcha.data
  });
});

router.post('/verify', (req, res) => {
  const { userInput, token } = req.body;

  if (!captchaStore[token]) {
    return res.status(400).json({ message: 'Invalid or expired captcha' });
  }

  if (userInput === captchaStore[token]) {
    delete captchaStore[token]; // cleanup
    return res.json({ message: 'Captcha verified successfully' });
  } else {
    return res.status(400).json({ message: 'Captcha incorrect' });
  }
});

module.exports = router;
