const {
  sendInvoice,
  deleteInvoice,
  updateInvoice,
} = require("../services/invoice/invoiceService");

exports.getInvoiceByID = async (req, res) => {
  const invoice = req.invoice;
  res.status(200).json({ invoice });
};

exports.deleteInvoice = async (req, res) => {
  const invoice = await deleteInvoice(req.params.id);

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }
  res.status(200).json({ message: "Invoice item deleted successfully" });
};

exports.updateInvoice = async (req, res) => {
  try {
    const updatedInvoice = await updateInvoice(req);
    
    res.status(201).json({
      message: "Invoice item Updated successfully",
      data: updatedInvoice,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendInvoice = async (req, res) => {
  try {
    const { orderId } = req.body;
    const orderData = await sendInvoice(orderId);
    return res.status(200).json({
      success: true,
      message: `Invoice sent via ${orderData.email} email successfully`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to send invoice", error: error.message });
  }
};
