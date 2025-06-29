const User = require("../../Models/User");
const Stock = require("../../Models/Stock");
const Order = require("../../Models/Order");

const getTotalCustomers = async () => {
  return await User.countDocuments({
    isAdmin : {$in : 0 }
  });
};

const getTotalProducts = async () => {
  return await Stock.countDocuments();
};

const getTotalTransactions = async () => {
  return await Order.countDocuments({ status: { $in: ["1", 1] } });
};

const getTotalSales = async () => {
  const result = await Order.aggregate([
    { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } },
  ]);
  return result[0]?.totalAmount || 0;
};

const getCurrentMonthSales = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lt: endOfMonth },
        status: { $in: ["1", 1] },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  return result[0]?.totalAmount || 0;
};

const getStockCounts = async () => {
  const inStock = await Stock.countDocuments({ status: { $in: ["0", 0] } });
  const outStock = await Stock.countDocuments({ status: { $in: ["1", 1] } });
  return { inStock, outStock };
};

module.exports = {
  getTotalCustomers,
  getTotalProducts,
  getTotalTransactions,
  getTotalSales,
  getCurrentMonthSales,
  getStockCounts,
};
