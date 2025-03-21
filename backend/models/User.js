const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  inputTokens: { type: Number, default: 0 }, 
  outputTokens: { type: Number, default: 0 }, 
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "PlanGPT" },
  password: { type: String, required: true },
});

module.exports = mongoose.model("GPTUsers", userSchema);