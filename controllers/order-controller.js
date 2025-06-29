const {
  downloadInvoice,
  placeOrder,
  getOrders,
  updateOrder,
  deleteOrder,
} = require("../services/order/orderService");

exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.body;
    const { filePath, fileName } = await downloadInvoice(orderId);

    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).send("Error generating PDF");
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const order = await placeOrder(req);
    res.status(201).json({
      message: "Order placed successfully",
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const result = await getOrders(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrdersByID = async (req, res) => {
  const order = req.order;
  res.status(200).json({ order });
};

exports.updateOrder = async (req, res) => {
  try {
    const newOrder = await updateOrder(req.order, req.body);
    res.status(201).json({
      message: "Order item Updated successfully",
      data: newOrder,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteOrder = async (req, res, next) => {
  try {
    const result = await deleteOrder(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
