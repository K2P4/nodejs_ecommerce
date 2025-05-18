const express = require("express");
const Invoice = require("../Models/Invoice");
const Order = require("../Models/Order");
const path = require("path");
const router = express.Router();
const multer = require("multer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const pdf = require("pdf-creator-node");
const ejs = require("ejs");
const nodemailer = require("nodemailer");

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

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({ message: "404 NOT FOUND" });
    }

    req.invoice = invoice;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get("/:id", authenticateUser, getByID, async (req, res) => {
  const invoice = req.invoice;
  res.status(200).json({ invoice });
});


router.post("/send-invoice", authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.body;

    // 1. Find Order
    const orderData = await Order.findById(orderId).lean();
    if (!orderData) {
      return res.status(404).json({ message: "Order not found." });
    }

    // 2. Find Invoice
    const invoice = await Invoice.findById(orderData.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    console.log('invoice', invoice);

    // 3. Safe filename
    const customerNameSafe = orderData.name.replace(/\s+/g, "_");
    const invoiceNumberSafe = invoice.invoiceNumber;
    const fileName = `${customerNameSafe}_${invoiceNumberSafe}.pdf`;
    const filePath = `./invoices/${fileName}`;

    // 4. Generate PDF from EJS template
    const html = await ejs.renderFile(
      path.join(__dirname, "../views/layout.ejs"),
      { order: orderData },
      { async: true }
    );

    const pdfOptions = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
    };

    const document = {
      html: html,
      data: {},
      path: filePath,
      type: "", // Save to disk
    };

    await pdf.create(document, pdfOptions);

    // 5. Send email with attachment
    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 587,
      secure: false, 
      auth: {
        user: "489e8b2330d739",
        pass: "3049d67e9a6f7e",
      },
    });

    const mailOptions = {
      from: '"XPOS" <xpos@invoice.email>',
      to: orderData.email,
      subject: `Invoice #${invoiceNumberSafe}`,
      text: `Dear ${orderData.name},\n\nPlease Confirm and find attached your invoice for your recent order.\n\nThanks & Best regards,\nXPOS\n09968213232\nNo.644, Eaindra 5th Street, North Okkalapa Township,Yangon`,
      attachments: [
        {
          filename: fileName,
          path: filePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    // 6. Update invoice: sentDate, status, logs
    invoice.status = "Sent";
    invoice.sentDate = new Date();
    invoice.attachments = fileName;
    invoice.logs.push(`Invoice was sent to ${orderData.email} at ${new Date().toISOString()}`);
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: `Invoice sent via ${orderData.email} email successfully`,
    });
  } catch (error) {
    console.error("Send invoice error:", error);
    res.status(500).json({ message: "Failed to send invoice", error: error.message });
  }
});

router.delete("/:id", authenticateUser, async (req, res, next) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  res.status(200).json({ message: "Invoice item deleted successfully" });
});

router.put("/:id", authenticateUser, getByID, async (req, res, next) => {
  try {
    const invoice = req.invoice;

    Object.assign(invoice, req.body);

    await invoice.save();
    res.status(201).json({
      message: "Invoice item Updated successfully",
      data: invoice,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
