const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Update User Tokens and Subscription
exports.updateUserTokensAndSubscription = async (req, res) => {
  try {
    const { inputTokens, outputTokens, subscription } = req.body;

    // Find the user by ID (from the authenticated token)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert inputTokens and outputTokens to numbers, ensuring they are valid
    const newInputTokens = Number(inputTokens) || 0;
    const newOutputTokens = Number(outputTokens) || 0;

    // Update values by adding to existing ones
    user.inputTokens = (Number(user.inputTokens) || 0) + newInputTokens;
    user.outputTokens = (Number(user.outputTokens) || 0) + newOutputTokens;

    // Update subscription if provided
    if (subscription) {
      user.subscription = subscription;
    }

    // Save the updated user
    await user.save();

    // Respond with the updated user (excluding the password)
    const updatedUser = await User.findById(req.user.id).select("-password");
    res.status(200).json({ message: "User tokens and subscription updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating tokens and subscription:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};