const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Helper functions to encrypt/decrypt the secret phrase using AES-256-CBC.
// (For demonstration only; consider using a more robust approach in production.)
function encryptSecret(phrase, key) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.alloc(16, 0));
  let encrypted = cipher.update(phrase, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptSecret(encryptedPhrase, key) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.alloc(16, 0));
  let decrypted = decipher.update(encryptedPhrase, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Derive a 32-byte (256-bit) key from a password using SHA-256.
function deriveKey(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * @route   POST /api/users/register
 * @desc    Register a new user by saving email, password, secret phrase, and security questions.
 * @body    { email, password, secretPhrase, securityQuestions: [{question, answer}] }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, secretPhrase, securityQuestions } = req.body;
    if (!email || !password || !secretPhrase || !securityQuestions) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }
    
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'User already exists' });

    // Derive an encryption key from the password
    const encryptionKey = deriveKey(password);
    const encryptedSecret = encryptSecret(secretPhrase, encryptionKey);

    // Hash each security question answer using bcrypt
    const processedQuestions = await Promise.all(securityQuestions.map(async (q) => ({
      question: q.question,
      answerHash: await bcrypt.hash(q.answer, 10)
    })));

    const newUser = new User({
      email,
      hashedPassword: password, // The pre-save hook will hash this.
      secretPhrase: encryptedSecret,
      securityQuestions: processedQuestions
    });

    await newUser.save();
    res.json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   POST /api/users/recover
 * @desc    Recover the user's secret phrase by verifying security questions.
 * @body    { email, answers: [answer1, answer2, ...], password }
 *
 * In this example, we use the provided password to derive the key for decryption.
 * (In production, the flow may differ—ensure additional authentication measures.)
 */
router.post('/recover', async (req, res) => {
  try {
    const { email, answers, password } = req.body;
    if (!email || !answers || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    // Verify that each answer matches the stored hash.
    if (answers.length !== user.securityQuestions.length) {
      return res.status(400).json({ msg: 'Incorrect number of answers provided' });
    }
    for (let i = 0; i < user.securityQuestions.length; i++) {
      const isMatch = await bcrypt.compare(answers[i], user.securityQuestions[i].answerHash);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Security answers do not match' });
      }
    }

    // If security answers are correct, derive the key from the provided password and decrypt.
    const decryptionKey = deriveKey(password);
    let secretPhrase;
    try {
      secretPhrase = decryptSecret(user.secretPhrase, decryptionKey);
    } catch (err) {
      return res.status(400).json({ msg: 'Incorrect password provided' });
    }
    
    // WARNING: Returning the secret phrase in plaintext is highly sensitive.
    // In a production system, consider alternative secure recovery flows.
    res.json({ secretPhrase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
