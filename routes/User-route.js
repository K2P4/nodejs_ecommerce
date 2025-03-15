const express = require("express");
const User = require("../Models/User");
const router = express.Router();
const ExcelJs = require("exceljs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Register
router.post("/register", async (req, res) => {
  const { name, email, password, password_confirmation, isAdmin } = req.body;

  if (password !== password_confirmation) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ name, email, password: hashedPassword, isAdmin });
  await newUser.save();

  res.status(201).json({
    message: "User registered successfully",
    success: true,
    user: newUser,
  });
});

// Login API
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({ message: "Login successful", token, success: true, user: user });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

router.get("/profile", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json({ message: "Profile data", user });
});

// Logout API
router.post("/logout", async (req, res) => {
  // const user = await User.
  res.json({ message: "Logout successful" });
});

module.exports = router;
