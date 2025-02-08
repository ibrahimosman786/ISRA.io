const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SecurityQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answerHash: { type: String, required: true }
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  // The secret phrase is stored in encrypted form.
  secretPhrase: { type: String, required: true },
  // Array of security questions with hashed answers.
  securityQuestions: [SecurityQuestionSchema]
});

// Pre-save hook to hash the password if it’s modified
UserSchema.pre('save', async function(next) {
  if (this.isModified('hashedPassword')) {
    const salt = await bcrypt.genSalt(10);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
