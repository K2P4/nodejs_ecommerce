const Order = require("../../Models/Order");
const Invoice = require("../../Models/Invoice");
const Stock = require("../../Models/Stock");
const pdf = require("pdf-creator-node");
const ejs = require("ejs");
const path = require("path");

exports.downloadInvoice = async (orderId) => {
  const orderData = await Order.findById(orderId).lean();
  if (!orderData) {
    return res.status(404).json({ message: "Order not found." });
  }

  const customerNameSafe = orderData.name.split(" ").join("_");
  const invoiceNumberSafe = orderData.invoiceNumber.toString();

  const fileName = `${customerNameSafe}_${invoiceNumberSafe}.pdf`;
  const filePath = `./invoices/${fileName}`;

  // Render EJS template to HTML string
  const html = await ejs.renderFile(
    path.join(__dirname, "../views/layout.ejs"),
    { order: orderData },
    { async: true }
  );

  // PDF document options
  const options = {
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

  await pdf.create(document, options);
  return { filePath, fileName };
};

exports.placeOrder = async (req) => {
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
  const subTotal = parsedItems.reduce((total, item) => total + item.price, 0);
  const taxAmount = subTotal > 200000 ? Math.round(subTotal * 0.005) : 0;
  const allTotalAmount = subTotal + deliveryFee + taxAmount;

  // Generate order numbers
  const lastOrder = await Order.findOne()
    .sort({ createdAt: -1 })
    .populate("invoiceId");

  let orderNumber = "XO0001";
  let invoiceNumber = "XI0001";

  if (lastOrder?.orderNumber) {
    const orderNum = parseInt(lastOrder.orderNumber.slice(2)) + 1;
    orderNumber = "XO" + orderNum.toString().padStart(4, "0");
  }

  if (lastOrder?.invoiceId?.invoiceNumber) {
    const invoiceNum = parseInt(lastOrder.invoiceId.invoiceNumber.slice(2)) + 1;
    invoiceNumber = "XI" + invoiceNum.toString().padStart(4, "0");
  }

  // Create invoice
  const invoice = new Invoice({
    invoiceNumber,
  });

  await invoice.save();

  const order = new Order({
    orderNumber,
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
    invoiceId: invoice._id,
  });

  await order.save();
  return order;
};

exports.getOrders = async (query) => {
  const page = parseInt(query.page) || 1;
  const perpage = parseInt(query.perpage) || 10;
  const search = query.search;
  const selectedDate = query.time;
  const sortOrder = query.sort || "desc";
  const statusFilter = query.status;

  const filter = {};
  const offset = (page - 1) * perpage;

  // Text search
  if (search) {
    filter["$text"] = { $search: search };
  }

  // Date filter
  if (selectedDate) {
    const startOfDay = new Date(selectedDate);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }

  // Status filter
  if (statusFilter !== "7" && statusFilter !== 7) {
    if (typeof statusFilter === "string" && statusFilter.includes(",")) {
      const statusArray = statusFilter.split(",").map(Number);
      filter.status = { $in: statusArray };
    } else {
      filter.status = parseInt(statusFilter);
    }
  }

  const sortValue = sortOrder === "asc" ? 1 : -1;
  const sortField = "createdAt";

  const pendingCount = await Order.countDocuments({ status: 0 });

  const totalAmountAgg = await Order.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  const totalTransactions = await Invoice.countDocuments({
    payDate: { $ne: null },
  });

  const allTotalAmount = totalAmountAgg[0]?.total || 0;

  const orders = await Order.find(filter)
    .sort({ [sortField]: sortValue })
    .limit(perpage)
    .skip(offset)
    .populate("invoiceId");

  const totalCount = await Order.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / perpage);

  return {
    total: totalCount,
    totalPages,
    page,
    perpage,
    data: orders,
    sort: sortOrder,
    pendingCount,
    allTotalAmount,
    totalTransactions,
  };
};

exports.updateOrder = async (order, body) => {
  Object.assign(order, body);
  await order.save();
};

exports.deleteOrder = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({ message: "404 NOT FOUND" });
  }

  if (order.invoiceId) {
    await Invoice.findByIdAndDelete(order.invoiceId);
  }

  await Order.findByIdAndDelete(orderId);

  return { message: "Order and its invoice deleted successfully" };
};
