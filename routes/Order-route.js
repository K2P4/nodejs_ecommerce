const express = require("express");
const Order = require("../Models/Order");
const router = express.Router();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token." });
  }
};

router.post("/place-order", authenticateUser, async (req, res) => {
  console.log(req.body);
  try {
    const { userId, items, totalAmount, shippingAddress, deliveryFee } =
      req.body;

    if (!userId || !items || items.length === 0 || !shippingAddress) {
      return res.status(400).json({ message: "Invalid order data!" });
    }

    const order = new Order({
      orderNumber: uuidv4().slice(0, 8).toUpperCase(),
      userId: req.user._id,
      items,
      deliveryFee,
      totalAmount,
      shippingAddress,
      status: "Pending",
    });

    console.log(order);

    await order.save();
    res.status(201).json({
      message: "Order placed successfully",
      order: order,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error placing order", error });
  }
});

module.exports = router;
