const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Plan name (e.g., "Free", "Pro")
  inputTokenLimit: { type: Number, required: true }, // Monthly input token limit
  outputTokenLimit: { type: Number, required: true }, // Monthly output token limit
  price: { type: Number, required: true }, // Price of the plan (optional)
  description: { type: String }, // Description of the plan
});

module.exports = mongoose.model("plangpts", planSchema);