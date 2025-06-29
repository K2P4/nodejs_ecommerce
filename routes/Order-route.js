const express = require("express");
const Order = require("../Models/Order");
const OrderController = require("../controllers/order-controller");
const path = require("path");
const router = express.Router();
const multer = require("multer");
const jwt = require("jsonwebtoken");


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

    const order = await Order.findById(id).populate("userId").populate("invoiceId");

    if (!order) {
      return res.status(404).json({ message: "404 NOT FOUND" });
    }

    req.order = order;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


router.get("/", authenticateUser, OrderController.getOrders);
router.get("/:id", authenticateUser, getByID, OrderController.getOrdersByID);
router.post("/place-order", authenticateUser, upload.single("transitionRecord"), OrderController.placeOrder);
router.put("/:id", authenticateUser, getByID, OrderController.updateOrder);
router.delete("/:id", authenticateUser,OrderController.deleteOrder);
router.post("/download-invoice", authenticateUser, OrderController.downloadInvoice);




module.exports = router;
