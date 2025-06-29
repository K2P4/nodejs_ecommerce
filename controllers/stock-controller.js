const {
  getStocks,
  getStocksByID,
  createStock,
  updateStock,
  deleteStockById,
  exportExcel,
  importExcel,
} = require("../services/stock/stockService");

exports.getStocks = async (req, res) => {
  try {
    const result = await getStocks(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStocksByID = async (req, res) => {
  try {
    const stockDataByCategory = await getStocksByID(req.stock);

    res.status(200).json({
      message: "Successful",
      stock: req.stock,
      stockDataByCategory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStock = async (req, res) => {
  try {

    const newStock = await createStock(req);

    res.status(201).json({
      message: "Stock item added successfully",
      data: newStock,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const updatedStock = await updateStock(req);
    res.status(201).json({
      message: "Stock item Updated successfully",
      data: updatedStock,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStock = async (req, res) => {
  const stock = await deleteStockById(req.params.id);

  if (!stock) {
    return res.status(404).json({ message: "Stock not found" });
  }

  res.status(200).json({ message: "Stock item deleted successfully" });
};

exports.exportExcel = async (res) => {
  try {
    const workbook = await exportExcel();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=StockData.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Failed to export data" });
  }
};

exports.importExcel = async () => {
  try {
    const stockData = await importExcel();

    res.status(200).json({ message: "Stock imported successfully", stockData });
  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({ message: "Error importing data", error });
  }
};
