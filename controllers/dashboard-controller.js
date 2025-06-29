const {
  getTotalCustomers,
  getTotalProducts,
  getTotalTransactions,
  getTotalSales,
  getCurrentMonthSales,
  getStockCounts,
} = require("../services/dashboard/overviewService");

exports.getOverview = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalProducts,
      totalTransactions,
      totalAmount,
      currentMonthAmount,
      stockCounts,
    ] = await Promise.all([
      getTotalCustomers(),
      getTotalProducts(),
      getTotalTransactions(),
      getTotalSales(),
      getCurrentMonthSales(),
      getStockCounts(),
    ]);

    res.json({
      totalCustomers,
      totalProducts,
      totalTransactions,
      totalAmount,
      currentMonthAmount,
      inStockCounts: stockCounts.inStock,
      outStockCounts: stockCounts.outStock,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
};
