const express = require("express");
const Invoice = require("../Models/Invoice");
const InvoiceController = require("../controllers/invoice-controller");
const router = express.Router();

const jwt = require("jsonwebtoken");




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


router.get("/:id", authenticateUser, InvoiceController.getInvoiceByID);
router.delete("/:id", authenticateUser, InvoiceController.deleteInvoice);
router.post("/:id", authenticateUser, getByID,  InvoiceController.updateInvoice);
router.post("/send-invoice", authenticateUser, InvoiceController.sendInvoice);

module.exports = router;
