const express = require('express');
const svgCaptcha = require('svg-captcha');
const router = express.Router();

// Store the captcha token temporarily (in-memory for this example)
let captchaToken = null;

// Route to generate captcha
router.get('/', (req, res) => {
  const captcha = svgCaptcha.create();
  captchaToken = captcha.text; // Store the captcha text for verification later
  res.json({
    token: captchaToken,
    captcha: captcha.data,  // Return the SVG captcha image
  });
});

// Route to verify captcha
router.post('/verify', (req, res) => {
  const { userInput, token } = req.body;

  if (!userInput || !token) {
    return res.status(400).json({ message: 'Captcha input or token is missing' });
  }

  // Compare the user input with the generated token
  if (userInput === captchaToken) {
    return res.json({ message: 'Captcha verified successfully' });
  } else {
    return res.status(400).json({ message: 'Captcha verification failed' });
  }
});

module.exports = router;
