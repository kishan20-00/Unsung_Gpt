const express = require("express");
const Plan = require("../models/Plan");
const User = require("../models/User");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); // Middleware for authentication
const enforceTokenLimits = require("../middleware/enforceTokenLimits");

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

router.post("/users/:userId/check-tokens", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { inputTokens, outputTokens } = req.body;

    // Find the user and populate their subscription (plan)
    const user = await User.findById(userId).populate("subscription");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Retrieve token limits from the user's plan
    const inputTokenLimit = user.subscription.inputTokenLimit;
    const outputTokenLimit = user.subscription.outputTokenLimit;

    // Retrieve current token usage from the user
    const currentInputTokens = user.inputTokens;
    const currentOutputTokens = user.outputTokens;

    // Check if current token usage exceeds limits (without adding new tokens)
    if (currentInputTokens > inputTokenLimit) {
      return res.status(400).json({ message: "Existing input tokens exceed limit" });
    }
    if (currentOutputTokens > outputTokenLimit) {
      return res.status(400).json({ message: "Existing output tokens exceed limit" });
    }

    // Update token usage in the User model
    user.inputTokens += inputTokens;
    user.outputTokens += outputTokens;
    await user.save();

    // Respond with success message and updated user data
    res.status(200).json({
      message: "Token usage updated successfully",
      user: {
        id: user._id,
        inputTokens: user.inputTokens,
        outputTokens: user.outputTokens,
        subscription: user.subscription,
      },
    });
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

router.post("/chat", enforceTokenLimits, async (req, res) => {
  try {
    const { message } = req.body;

    // Simulate chat processing (replace with actual LLM logic)
    const response = `You said: ${message}`;

    // Respond with the chat result
    res.status(200).json({ message: "Chat processed successfully", response });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



module.exports = router;