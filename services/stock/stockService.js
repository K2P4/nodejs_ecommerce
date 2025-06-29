const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const ExcelJs = require("exceljs");
const Stock = require("../../Models/Stock");

//upload
const streamUpload = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    stream.end(buffer);
  });
};

exports.getStocks = async (query) => {
  const {
    page = 1,
    perpage = 10,
    search,
    time: selectedDate,
    sort = "desc",
    priceRange,
    branch,
    onlyInStock,
    rating,
    discount,
    categories,
  } = query;

  const filter = {};
  const offset = (page - 1) * perpage;

  // Text
  if (search) {
    filter["$text"] = { $search: search };
  }

  // Categories
  if (categories && categories !== "null" && categories !== "undefined") {
    const categoryArray = categories.split(",");
    if (categoryArray.length > 0) {
      filter.categoryId = { $in: categoryArray };
    }
  }

  // Date filter
  if (selectedDate) {
    const startOfDay = new Date(selectedDate);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    filter.time = { $gte: startOfDay, $lte: endOfDay };
  }

  // Price range
  if (priceRange && priceRange !== "null" && priceRange !== "undefined") {
    let min, max;
    if (typeof priceRange === "string" && priceRange.includes("-")) {
      [min, max] = priceRange.split("-").map(Number);
    } else if (Array.isArray(priceRange)) {
      [min, max] = priceRange.map(Number);
    }
    if (!isNaN(min) && !isNaN(max)) {
      filter.price = { $gte: min, $lte: max };
    }
  }

  // In stock
  if (
    onlyInStock !== null &&
    onlyInStock !== undefined &&
    onlyInStock !== "null" &&
    onlyInStock !== "undefined"
  ) {
    filter.status = { $eq: onlyInStock };
  }

  // Rating
  if (
    rating !== null &&
    rating !== undefined &&
    rating !== "null" &&
    rating !== "undefined"
  ) {
    const minRating = Number(rating);
    if (!isNaN(minRating)) {
      filter.rating = { $gte: minRating };
    }
  }

  // Branch
  if (
    branch !== null &&
    branch !== undefined &&
    branch !== "null" &&
    branch !== "undefined"
  ) {
    filter.branch = { $eq: branch };
  }

  // Discount
  if (
    discount !== null &&
    discount !== undefined &&
    discount !== "null" &&
    discount !== "undefined"
  ) {
    const minDiscount = Number(discount);
    if (!isNaN(minDiscount)) {
      filter.discountPercentage = { $gte: minDiscount };
    }
  }

  const sortValue = sort === "asc" ? 1 : -1;
  const sortField = "time";

  const stocks = await Stock.find(filter)
    .populate("categoryId")
    .sort({ [sortField]: sortValue })
    .limit(perpage)
    .skip(offset);

  const totalCount = await Stock.countDocuments(filter);
  const totalPage = Math.ceil(totalCount / perpage);

  return {
    total: totalCount,
    totalPage,
    page: parseInt(page),
    perpage: parseInt(perpage),
    data: stocks,
    sort,
  };
};

exports.getStocksByID = async (stock) => {
  let stockDataByCategory = [];

  if (stock.categoryId) {
    stockDataByCategory = await Stock.find({
      categoryId: stock.categoryId._id,
      _id: { $ne: stock._id },
    }).populate("categoryId");
  }
  return stockDataByCategory;
};

exports.createStock = async (req) => {
  const stockData = req.body;

  stockData.price = Number(stockData.price);
  stockData.discountPercentage = Number(stockData.discountPercentage);
  stockData.inStock = Number(stockData.inStock);
  stockData.reorderLevel = Number(stockData.reorderLevel);
  stockData.size = Number(stockData.size);

  if (stockData.categoryId == "") {
    stockData.categoryId = null;
  }

  if (req.files && req.files.length > 0 && stockData.code) {
    const imageUrls = [];

    for (const file of req.files) {
      try {
        const result = await streamUpload(
          file.buffer,
          `stocks/${stockData.code}`
        );
        imageUrls.push(result.secure_url);
      } catch (err) {
        console.error("Cloudinary upload failed:", err);
      }
    }

    stockData.images = imageUrls;
  }

  stockData.createdBy = req.user.name;
  const newStock = new Stock(stockData);
  await newStock.save();
};

exports.updateStock = async (req) => {
  const stock = req.stock;
  const body = req.body;

  if (
    body.categoryId == "" ||
    body.categoryId == null ||
    body.categoryId == "null"
  ) {
    body.categoryId = null;
  }

  body.createdBy = req.user.name;

  if (req.files && req.files.length > 0 && body.code) {
    const imageUrls = [];

    for (const file of req.files) {
      try {
        const result = await streamUpload(file.buffer, `stocks/${body.code}`);
        imageUrls.push(result.secure_url);
      } catch (err) {
        console.error("Cloudinary upload failed:", err);
      }
    }

    stock.images = imageUrls;
  }

  Object.assign(stock, body);

  await stock.save();
};

exports.deleteStockById = async (id) => {
  const stock = await Stock.findByIdAndDelete(id);

  if (Array.isArray(stock.images) && stock.images.length > 0) {
    const imageUrl = new URL(stock.images[0]);
    const imagePath = path.join(__dirname, "..", imageUrl.pathname);
    const stockFolder = path.dirname(imagePath);

    if (fs.existsSync(stockFolder)) {
      fs.rmSync(stockFolder, { recursive: true, force: true });
    }
  }

  return stock;
};

exports.exportExcel = async () => {
  const stocks = await Stock.find().populate("categoryId", "name");

  const workbook = new ExcelJs.Workbook();
  const worksheet = workbook.addWorksheet("Stock Data");

  worksheet.columns = [
    { header: "Code", key: "code", width: 20 },
    { header: "Name", key: "name", width: 25 },
    { header: "Description", key: "description", width: 30 },
    { header: "Price", key: "price", width: 15 },
    { header: "Discount (%)", key: "discountPercentage", width: 15 },
    { header: "In Stock", key: "inStock", width: 15 },
    { header: "Category Name", key: "categoryId", width: 30 },
    { header: "Status", key: "status", width: 10 },
    { header: "Rating", key: "rating", width: 10 },
    { header: "Created By", key: "createdBy", width: 20 },
  ];

  stocks.forEach((stock) => {
    worksheet.addRow({
      code: stock.code,
      name: stock.name,
      description: stock.description ? stock.description : "N/A",
      price: stock.price,
      discountPercentage: stock.discountPercentage,
      inStock: stock.inStock,
      categoryId: stock.categoryId ? stock.categoryId.name : "N/A",
      status: stock.status,
      rating: stock.rating,
      createdBy: stock.createdBy ? stock.createdBy : "N/A",
    });
  });

  return workbook;
};

exports.importExcel = async (req) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Read Excel file
  const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // Validate & Map Data
  const stockData = jsonData.map((row) => ({
    code: row["code"] || "Unknown",
    name: row["name"] || "Unnamed Product",
    description: row["description"] || "No description",
    price: Number(row["price"] || 0),
    discountPercentage: Number(row["discountPercentage"] || 0),
    inStock: Number(row["inStock"] || 0),
    categoryId: row["categoryId"] || null,
    status: Number(row["status"] || 0),
    rating: Number(row["rating"] || 3),
    reorderLevel: Number(row["reorderLevel"] || 0),
    createdBy: row["createdBy"] || "Admin",
  }));

  await Stock.insertMany(stockData);
};
