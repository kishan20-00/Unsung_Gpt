const express = require("express");
const Plan = require("../models/Plan");
const User = require("../models/User");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); // Middleware for authentication

// Create a new plan (Admin only)
router.post("/plans", authMiddleware, async (req, res) => {
  try {
    const { name, inputTokenLimit, outputTokenLimit, price, description } = req.body;

    // Check if the plan already exists
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ message: "Plan with this name already exists" });
    }

    // Create the new plan
    const newPlan = new Plan({
      name,
      inputTokenLimit,
      outputTokenLimit,
      price,
      description,
    });

    await newPlan.save();
    res.status(201).json({ message: "Plan created successfully", plan: newPlan });
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update a user's plan
router.put("/users/:userId/plan", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { planId } = req.body;

    // Find the user and the new plan
    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);

    if (!user || !plan) {
      return res.status(404).json({ message: "User or plan not found" });
    }

    // Update the user's plan
    user.plan = planId;
    await user.save();

    res.status(200).json({ message: "User plan updated successfully", user });
  } catch (error) {
    console.error("Error updating user plan:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check token usage and enforce limits
router.post("/users/:userId/check-tokens", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { inputTokens, outputTokens } = req.body;

    // Find the user and their plan
    const user = await User.findById(userId).populate("plan");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the token usage has exceeded the plan limits
    if (user.inputTokensUsed + inputTokens > user.plan.inputTokenLimit) {
      return res.status(400).json({ message: "Input token limit exceeded" });
    }
    if (user.outputTokensUsed + outputTokens > user.plan.outputTokenLimit) {
      return res.status(400).json({ message: "Output token limit exceeded" });
    }

    // Update token usage
    user.inputTokensUsed += inputTokens;
    user.outputTokensUsed += outputTokens;
    await user.save();

    res.status(200).json({ message: "Token usage updated successfully", user });
  } catch (error) {
    console.error("Error checking token usage:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Reset token usage (e.g., monthly reset)
router.post("/users/:userId/reset-tokens", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Reset token usage
    user.inputTokensUsed = 0;
    user.outputTokensUsed = 0;
    user.lastReset = Date.now();
    await user.save();

    res.status(200).json({ message: "Token usage reset successfully", user });
  } catch (error) {
    console.error("Error resetting token usage:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;