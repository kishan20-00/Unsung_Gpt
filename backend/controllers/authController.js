const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, inputTokens = 0, outputTokens = 0, subscription = "Free", password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      inputTokens: Number(inputTokens) || 0, 
      outputTokens: Number(outputTokens) || 0, 
      subscription: subscription || 'Free',
    });

    // Save the user to the database
    await newUser.save();

    // Respond with success message
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Profile
exports.updateUser = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields (optional, depending on your requirements)
    if (!name) {
      return res.status(400).json({ message: "At least one field (name, age, or phoneNum) is required to update" });
    }

    // Find the user by ID (from the authenticated token)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's fields if provided
    if (name) user.name = name;

    // Save the updated user
    await user.save();

    // Respond with the updated user (excluding the password)
    const updatedUser = await User.findById(req.user.id).select("-password");
    res.status(200).json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error during user update:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
