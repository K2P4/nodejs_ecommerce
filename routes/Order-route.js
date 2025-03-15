const express = require("express");
const Order = require("../Models/Order");
const router = express.Router();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

router.post("/place-order", async (req, res) => {
  try {
    const {
      userId,
      items,
      totalAmount,
      discount,
      finalAmount,
      paymentMethod,
      shippingAddress,
    } = req.body;

    if (
      !userId ||
      !items ||
      items.length === 0 ||
      !paymentMethod ||
      !shippingAddress
    ) {
      return res.status(400).json({ message: "Invalid order data!" });
    }

    const order = new Order({
      orderNumber: uuidv4().slice(0, 8).toUpperCase(),
      userId: req.user.name,
      items,
      totalAmount,
      discount,
      finalAmount,
      paymentMethod,
      shippingAddress,
      status: "Pending",
    });

    await order.save();
    res
      .status(201)
      .json({ message: "Order placed successfully", order, success: true });
  } catch (error) {
    res.status(500).json({ message: "Error placing order", error });
  }
});

module.exports = router;