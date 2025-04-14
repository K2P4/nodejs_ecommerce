const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const Delivery = require("../Models/Delivery");
const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "public/transition");
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access Denied !" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid token" });
  }
};

const getByID = async (req, res, next) => {
  try {
    const { id } = req.params;
    const delivery = await Delivery.where({ userId: id }).findOne();

    if (!delivery) {
      console.log("404");

      return res.status(404).json({ message: "404 NOT FOUND" });
    }

    console.log(delivery);

    req.delivery = delivery;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get("/check-out", authenticateUser, async (req, res, next) => {
  try {
    const delivery = await Delivery.find().populate("userId");
    res.status(200).json({
      data: delivery,
      message: "Succesfull",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", getByID, async (req, res) => {
  res.status(200).json({ message: "Sucessfull", delivery: req.delivery });
});

router.post(
  "/check-out",
  authenticateUser,
  upload.single("transitionRecord"),
  async (req, res) => {
    try {
      console.log(req.body, req.user);

      const informationData = req.body;

      console.log(req.file);

      if (req.file) {
        informationData.transitionRecord = `${req.protocol}://${req.get(
          "host"
        )}/public/transition/${path.basename(req.file.path)}`;
      }

      req.body.userId = req.user.id;

      const storeInformation = new Delivery(informationData);
      await storeInformation.save();

      res.status(201).json({
        message: "Succesfull",
        success: true,
        information: storeInformation,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
