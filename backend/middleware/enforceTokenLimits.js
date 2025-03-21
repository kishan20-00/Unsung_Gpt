const User = require("../models/User");

const enforceTokenLimits = async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming you have user authentication middleware
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

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error enforcing token limits:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = enforceTokenLimits;