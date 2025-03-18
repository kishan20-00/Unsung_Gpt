const express = require("express");
const { registerUser, loginUser, getUserProfile, updateUser, updateUserTokensAndSubscription } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getUserProfile);
router.put("/update", authMiddleware, updateUser);
router.put("/updateTokens", authMiddleware, updateUserTokensAndSubscription);

module.exports = router;
