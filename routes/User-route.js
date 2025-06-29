const express = require("express");
const User = require("../Models/User");
const UserController = require("../controllers/user-controller");
const router = express.Router();
const jwt = require("jsonwebtoken");

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

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/profile", authenticateToken , UserController.getProfile);
router.post("/logout", UserController.logout);




module.exports = router;
