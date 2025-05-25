const fs = require("fs");
const multer = require("multer");
const express = require("express");
const Stock = require("../Models/Stock");
const path = require("path");
const xlsx = require("xlsx");
const mongoose = require("mongoose");
const ExcelJs = require("exceljs");
const User = require("../Models/User");
const jwt = require("jsonwebtoken");
const router = express.Router();

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      let stockCode = req.body.code;

      if (!stockCode) {
        const lastStock = await Stock.findOne().sort({ createdAt: -1 });
        if (lastStock && lastStock.code) {
          const lastNumber = parseInt(lastStock.code.slice(1));
          const nextNumber = lastNumber + 1;
          stockCode = "P" + nextNumber.toString().padStart(3, "0");
        } else {
          stockCode = "P001";
        }
        req.body.code = stockCode;
      }

      const uploadPath = path.join(
        __dirname,
        "..",
        "public/uploads",
        stockCode
      );
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadMemory = multer({ storage: multer.memoryStorage() });
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

router.get("/export", async (req, res) => {
  try {
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

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=StockData.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting stock data:", error);
    res.status(500).json({ message: "Failed to export data" });
  }
});

// router.get("/", authenticateUser, async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const perpage = parseInt(req.query.perpage) || 10;
//     const search = req.query.search;
//     const selectedDate = req.query.time;
//     const sortOrder = req.query.sort || "desc";
//     const priceRange = req.query.priceRange;
//     const onlyInStock = req.query.onlyInStock;
//     const rating = req.query.rating;
//     const discount = req.query.discount;

//     const filter = {};
//     const offset = (page - 1) * perpage;

//     if (search) {
//       filter["$text"] = { $search: search };
//     }

//     if (selectedDate) {
//       const startOfDay = new Date(selectedDate);
//       const endOfDay = new Date(startOfDay);
//       endOfDay.setHours(23, 59, 59, 999);

//       filter.time = { $gte: startOfDay, $lte: endOfDay };
//     }

//     const sortValue = sortOrder == "asc" ? 1 : -1;
//     const sortField = "time";

//     const stocks = await Stock.find(filter)
//       .populate("categoryId")
//       .sort({ [sortField]: sortValue })
//       .limit(perpage)
//       .skip(offset);
//     const totalCount = await Stock.countDocuments(filter);
//     const totalPage = Math.ceil(totalCount / perpage);

//     res.status(200).json({
//       total: totalCount,
//       totalPage:totalPage,
//       page,
//       perpage,
//       data: stocks,
//       sort: sortOrder,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.get("/", authenticateUser, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perpage = parseInt(req.query.perpage) || 10;
    const search = req.query.search;
    const selectedDate = req.query.time;
    const sortOrder = req.query.sort || "desc";
    const priceRange = req.query.priceRange;
    const branch = req.query.branch;
    const onlyInStock = req.query.onlyInStock;
    const rating = req.query.rating;
    const discount = req.query.discount;
    const categories = req.query.categories;

    const filter = {};
    const offset = (page - 1) * perpage;

    // Search filter
    if (search) {
      filter["$text"] = { $search: search };
    }

    if (categories && categories !== "null" && categories !== "undefined") {
      if (Array.isArray(categories) && categories.length > 0) {
        console.log('test' , categories);
        filter.categoryId = { $in: categories };
      }
    }

    // Date filter
    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);
      filter.time = { $gte: startOfDay, $lte: endOfDay };
    }

    // Price range filter
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

    // Only in stock filter
    if (
      onlyInStock !== null &&
      onlyInStock !== undefined &&
      onlyInStock !== "null" &&
      onlyInStock !== "undefined"
    ) {
      filter.inStock = onlyInStock == 0;
    }

    // Rating filter
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

    //branch filter
    if (
      branch !== null &&
      branch !== undefined &&
      branch !== "null" &&
      branch !== "undefined"
    ) {
      filter.branch = branch;
    }

    // Discount filter
    if (
      discount !== null &&
      discount !== undefined &&
      discount !== "null" &&
      discount !== "undefined"
    ) {
      const minDiscount = Number(discount);
      if (!isNaN(minDiscount)) {
        filter.discount = { $gte: minDiscount };
      }
    }

    // Sorting
    const sortValue = sortOrder == "asc" ? 1 : -1;
    const sortField = "time";

    // Query
    const stocks = await Stock.find(filter)
      .populate("categoryId")
      .sort({ [sortField]: sortValue })
      .limit(perpage)
      .skip(offset);

    const totalCount = await Stock.countDocuments(filter);
    const totalPage = Math.ceil(totalCount / perpage);

    res.status(200).json({
      total: totalCount,
      totalPage,
      page,
      perpage,
      data: stocks,
      sort: sortOrder,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getByID = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stock = await Stock.findById(id).populate("categoryId");

    if (!stock) {
      return res.status(404).json({ message: "404 NOT FOUND" });
    }

    req.stock = stock;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get("/:id", authenticateUser, getByID, async (req, res) => {
  try {
    const stock = req.stock;

    let stockDataByCategory = [];

    if (stock.categoryId) {
      stockDataByCategory = await Stock.find({
        categoryId: stock.categoryId._id,
        _id: { $ne: stock._id },
      }).populate("categoryId");
    }

    res.status(200).json({
      message: "Successful",
      stock,
      stockDataByCategory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// const generateStockCode = async (req, res, next) => {
//   try {
//     const lastStock = await Stock.findOne().sort({ createdAt: -1 });

//     if (lastStock && lastStock.code) {
//       const lastNumber = parseInt(lastStock.code.slice(1));
//       const nextNumber = lastNumber + 1;
//       req.body.code = "P" + nextNumber.toString().padStart(3, "0");
//     } else {
//       req.body.code = "P001";
//     }

//     next();
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

router.post(
  "/",
  authenticateUser,
  upload.array("images", 4),
  async (req, res) => {
    try {
      const stockData = req.body;

      stockData.price = Number(stockData.price);
      stockData.discountPercentage = Number(stockData.discountPercentage);
      stockData.inStock = Number(stockData.inStock);
      stockData.reorderLevel = Number(stockData.reorderLevel);

      if (stockData.categoryId == "") {
        stockData.categoryId = null;
      }

      if (req.files && req.files.length > 0 && stockData.code) {
        stockData.images = req.files.map(
          (file) =>
            `${req.protocol}://${req.get("host")}/public/uploads/${
              stockData.code
            }/${path.basename(file.path)}`
        );
      }

      stockData.createdBy = req.user.name;
      const newStock = new Stock(stockData);
      await newStock.save();

      res.status(201).json({
        message: "Stock item added successfully",
        data: newStock,
        success: true,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/:id",
  authenticateUser,
  getByID,
  upload.array("images", 4),
  async (req, res, next) => {
    try {
      const stock = req.stock;

      if (
        req.body.categoryId == "" ||
        req.body.categoryId == null ||
        req.body.categoryId == "null"
      ) {
        req.body.categoryId = null;
      }

      req.body.createdBy = req.user.name;

      if (req.files && req.files.length > 0) {
        stock.images.forEach((imgUrl) => {
          const oldImgPath = path.join(
            __dirname,
            "..",
            imgUrl.replace(`${req.protocol}://${req.get("host")}/`, "")
          );
          fs.unlink(oldImgPath, (err) => {
            if (err) {
              console.error("Error deleting old image:", err);
            } else {
              console.log("Old image deleted successfully");
            }
          });
        });

        stock.images = req.files.map(
          (file) =>
            `${req.protocol}://${req.get("host")}/public/uploads/${
              req.body.code
            }/${path.basename(file.path)}`
        );
      }

      Object.assign(stock, req.body);

      await stock.save();
      res.status(201).json({
        message: "Stock item Updated successfully",
        data: stock,
        success: true,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete("/:id", authenticateUser, getByID, async (req, res, next) => {
  const stock = await Stock.findByIdAndDelete(req.params.id);

  if (Array.isArray(stock.images) && stock.images.length > 0) {
    const imageUrl = new URL(stock.images[0]);
    const imagePath = path.join(__dirname, "..", imageUrl.pathname);
    const stockFolder = path.dirname(imagePath);

    if (fs.existsSync(stockFolder)) {
      fs.rmSync(stockFolder, { recursive: true, force: true });
      console.log("Stock image folder deleted:", stockFolder);
    }
  }

  if (!stock) {
    return res.status(404).json({ message: "Stock not found" });
  }

  res.status(200).json({ message: "Stock item deleted successfully" });
});

router.post(
  "/import",
  authenticateUser,
  uploadMemory.single("file"),
  async (req, res) => {
    try {
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

      console.log("Parsed Excel Data:", jsonData);

      await Stock.insertMany(stockData);

      res
        .status(200)
        .json({ message: "Stock imported successfully", stockData });
    } catch (error) {
      console.error("Import Error:", error);
      res.status(500).json({ message: "Error importing data", error });
    }
  }
);

module.exports = router;
