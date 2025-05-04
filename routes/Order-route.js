const express = require("express");
const Order = require("../Models/Order");
const path = require("path");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Stock = require("../Models/Stock");

const TELEGRAM_BOT_TOKEN = "7998706631:AAHBJu9PzCPJ7k5KGMOqZdlEOZXr62p9q9Y";
const TELEGRAM_CHAT_ID = "7998706631";

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

router.get("/", authenticateUser, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perpage = parseInt(req.query.perpage) || 10;
    const search = req.query.search;
    const selectedDate = req.query.time;
    const sortOrder = req.query.sort || "desc";
    const statusFilter = req.query.status;

    const filter = {};
    const offset = (page - 1) * perpage;

    if (search) {
      filter["$text"] = { $search: search };
    }

    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (statusFilter !== 7 && statusFilter !== "7") {
      if (typeof statusFilter === "string" && statusFilter.includes(",")) {
        const statusArray = statusFilter.split(",").map(Number);
        filter.status = { $in: statusArray };
      } else {
        filter.status = parseInt(statusFilter);
      }
    }

    const sortValue = sortOrder == "asc" ? 1 : -1;
    const sortField = "createdAt";
    const pendingCount = await Order.countDocuments({ status: 0 });


    const totalAmountAgg = await Order.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const allTotalAmount = totalAmountAgg[0]?.total || 0;
    const orders = await Order.find(filter)
      .sort({ [sortField]: sortValue })
      .limit(perpage)
      .skip(offset);
    const totalCount = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perpage);
    res.status(200).json({
      total: totalCount,
      totalPages: totalPages,
      page,
      perpage,
      data: orders,
      sort: sortOrder,
      pendingCount: pendingCount,
      allTotalAmount: allTotalAmount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/place-order",
  authenticateUser,
  upload.single("transitionRecord"),
  async (req, res) => {
    try {
      const {
        items,
        paymentType,
        name,
        email,
        phone,
        deliveryType,
        address,
        city,
        township,
      } = req.body;

      const parsedItems = JSON.parse(items);

      // Update stock
      for (const item of parsedItems) {
        const product = await Stock.findById(item.id);
        if (product) {
          product.inStock = Math.max(0, product.inStock - item.quantity);
          await product.save();
        }
      }

      // Handle file
      let transitionRecordUrl = null;
      if (req.file) {
        transitionRecordUrl = `${req.protocol}://${req.get(
          "host"
        )}/public/transition/${req.file.filename}`;
      }

      // Calculate totals
      const deliveryFee = deliveryType == 0 ? 3000 : 5000;
      const subTotal = parsedItems.reduce(
        (total, item) => total + item.price,
        0
      );
      const taxAmount = subTotal > 200000 ? Math.round(subTotal * 0.005) : 0;
      const allTotalAmount = subTotal + deliveryFee + taxAmount;

      // Generate order numbers
      const lastOrder = await Order.findOne().sort({ createdAt: -1 });

      let orderNumber = "XO0001";
      let invoiceNumber = "XI0001";

      if (lastOrder?.orderNumber) {
        const orderNum = parseInt(lastOrder.orderNumber.slice(2)) + 1;
        orderNumber = "XO" + orderNum.toString().padStart(4, "0");
      }

      if (lastOrder?.invoiceNumber) {
        const invoiceNum = parseInt(lastOrder.invoiceNumber.slice(2)) + 1;
        invoiceNumber = "XI" + invoiceNum.toString().padStart(4, "0");
      }

      // Create order
      const order = new Order({
        orderNumber,
        invoiceNumber,
        userId: req.user.id,
        items: parsedItems,
        totalAmount: allTotalAmount,
        status: paymentType == 2 ? 1 : 0,
        paymentType,
        name,
        email,
        phone,
        deliveryType,
        address,
        city,
        township,
        transitionRecord: transitionRecordUrl,
      });

      await order.save();

      // Send Telegram Notification
      const telegramMessage = `
🛒 *New Order Placed!*

🧾 *Order No:* \`${orderNumber}\`
📄 *Invoice No:* \`${invoiceNumber}\`
🙍 *Name:* ${name}
📞 *Phone:* ${phone}
📦 *Items:* ${parsedItems.length}
🚚 *Delivery:* ${deliveryType == 0 ? "Normal (3000 MMK)" : "Express (5000 MMK)"}
💵 *Payment:* ${paymentType == 1 ? "Cash on Delivery" : "Mobile Payment"}
💰 *Total Amount:* ${allTotalAmount.toLocaleString()} MMK
`;

      await axios
        .post(
          `https://api.telegram.org/bot7998706631:AAHBJu9PzCPJ7k5KGMOqZdlEOZXr62p9q9Y/sendMessage`,
          {
            chat_id: "7998706631",
            text: telegramMessage,
            parse_mode: "Markdown",
          }
        )
        .then((response) => {
          console.log("Telegram response:", response.data);
        })
        .catch((error) => {
          console.error(
            "Telegram API error:",
            error.response ? error.response.data : error.message
          );
        });

      res.status(201).json({
        message: "Order placed successfully",
        success: true,
        order,
      });
    } catch (error) {
      console.error("Order placement failed:", error);
      res.status(500).json({
        message: "Error placing order",
        error: error.message,
      });
    }
  }
);

const getByID = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate("userId");

    if (!order) {
      return res.status(404).json({ message: "404 NOT FOUND" });
    }

    req.order = order;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get("/:id", authenticateUser, getByID, async (req, res) => {
  const order = req.order;
  res.status(200).json({ order });
});

router.delete("/:id", authenticateUser, async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.status(200).json({ message: "Order item deleted successfully" });
});

router.put("/:id", authenticateUser, getByID, async (req, res, next) => {
  try {
    const order = req.order;

    Object.assign(order, req.body);

    await order.save();
    res.status(201).json({
      message: "Order item Updated successfully",
      data: order,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
