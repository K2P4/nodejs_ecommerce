const express = require("express");
const Category = require("../Models/Category");
const ExcelJs = require("exceljs");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const xlsx = require("xlsx");
const path = require("path");
const uploadMemory = multer({ storage: multer.memoryStorage() });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "public/categories");
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get("/export", async (req, res) => {
  try {
    const categories = await Category.find();

    const workbook = new ExcelJs.Workbook();
    const worksheet = workbook.addWorksheet("Category Data");

    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Description", key: "descrption", width: 30 },
      { header: "Created By", key: "createdBy", width: 20 },
      { header: "Date Time", key: "time", width: 20 },
    ];

    categories.forEach((category) => {
      worksheet.addRow({
        name: category.name,
        description: category.descrption ? category.descrption : "N/A",
        time: category.time,
        createdBy: category.createdBy ? category.createdBy : "N/A",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=categoryData.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting category data:", error);
    res.status(500).json({ message: "Failed to export data" });
  }
});

router.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perpage = parseInt(req.query.perpage) || 1;
    const search = req.query.search;
    const selectedDate = req.query.time;
    const sortOrder = req.query.sort || "desc";

    const filter = {};
    const offset = (page - 1) * perpage;

    if (search) {
      filter["$text"] = { $search: search };
    }

    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      filter.time = { $gte: startOfDay, $lte: endOfDay };
    }

    const sortValue = sortOrder == "asc" ? 1 : -1;
    const sortField = "time";

    const category = await Category.find(filter)
      .sort({ [sortField]: sortValue })
      .limit(perpage)
      .skip(offset);
    const total = await Category.countDocuments(filter);

    res.status(200).json({
      total: total,
      page,
      perpage,
      data: category,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getByID = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "404 NOT FOUND" });
    }

    req.category = category;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get("/:id", getByID, async (req, res) => {
  res.status(200).json({ message: "Sucessfull", category: req.category });
});

router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    const categoryData = req.body;

    if (req.file) {
      categoryData.image = `${req.protocol}://${req.get(
        "host"
      )}/public/categories/${path.basename(req.file.path)}`;
    }
    const newCategory = await new Category(categoryData);

    await newCategory.save();
    res.status(201).json({
      message: "Category item added successfully",
      data: newCategory,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", upload.single("image"), getByID, async (req, res, next) => {
  try {
    const category = req.category;
    if (req.file) {
      if (category.image) {
        const oldImageName = category.image.split("/").pop(); 

        const oldImagePath = path.join(
          __dirname,
          "..",
          "public",
          "categories",
          oldImageName
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); 
        }
      }

      category.image = `${req.protocol}://${req.get("host")}/public/categories/${path.basename(req.file.path)}`;
    }

    Object.assign(category, req.body);
    await category.save();
    res.status(201).json({
      message: "category item Updated successfully",
      data: category,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", getByID, async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.params.id);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.status(200).json({ message: "Category item deleted successfully" });
});

router.post("/import", uploadMemory.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const CategoryData = jsonData.map((row) => ({
      name: row["name"] || "Unnamed Product",
      description: row["description"] || "No description",
      time: row["time"] || Date.now(),
      createdBy: row["createdBy"] || "Admin",
    }));

    console.log("Parsed Excel Data:", jsonData);

    await Category.insertMany(CategoryData);

    res
      .status(200)
      .json({ message: "Category imported successfully", CategoryData });
  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({ message: "Error importing data", error });
  }
});

module.exports = router;
