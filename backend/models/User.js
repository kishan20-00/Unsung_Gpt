const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  inputTokens: { type: String },
  outputTokens: { type: String },
  subscription: { type: String},
  password: { type: String, required: true },
});

module.exports = mongoose.model("GPTUsers", userSchema);