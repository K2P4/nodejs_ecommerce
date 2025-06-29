const Invoice = require("../../Models/Invoice");
const Order = require("../../Models/Order");
const fs = require("fs");
const pdf = require("pdf-creator-node");
const ejs = require("ejs");
const path = require("path");
const nodemailer = require("nodemailer");

exports.sendInvoice = async (orderId) => {
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

  // 3. Safe filename
  const customerNameSafe = orderData.name.replace(/\s+/g, "_");
  const invoiceNumberSafe = invoice.invoiceNumber;
  const fileName = `${customerNameSafe}_${invoiceNumberSafe}.pdf`;
  const filePath = `./invoices/${fileName}`;

  // 4. Generate PDF from EJS template
  const html = await ejs.renderFile(
    path.join(__dirname, "../../views/layout.ejs"),
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
    type: "",
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
  invoice.logs.push({
    message: `Invoice was sent to ${orderData.email}`,
    icon: "📧",
    date: new Date(),
  });
  await invoice.save();
  return orderData;
};

exports.deleteInvoice = async (id) => {
  const invoice = await Invoice.findByIdAndDelete(id);
  return invoice;
};

exports.updateInvoice = async (req) => {
  const invoice = Object.assign(req.invoice, req.body);
  await invoice.save();
  return invoice;
};
