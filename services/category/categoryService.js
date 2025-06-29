const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const path = require("path");
const ExcelJs = require("exceljs");
const xlsx = require("xlsx");
const Category = require("../../Models/Category");

// Upload
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

exports.getFilteredCategories = async ({
  page,
  perpage,
  search,
  time,
  sort,
}) => {
  const filter = {};
  const offset = (page - 1) * perpage;

  if (search) {
    filter["$text"] = { $search: search };
  }

  if (time) {
    const startOfDay = new Date(time);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    filter.time = { $gte: startOfDay, $lte: endOfDay };
  }

  const sortOrder = sort === "asc" ? 1 : -1;
  const sortField = "time";

  const data = await Category.find(filter)
    .sort({ [sortField]: sortOrder })
    .limit(perpage)
    .skip(offset);

  const total = await Category.countDocuments(filter);

  return { data, total };
};

exports.createCategory = async (req) => {
  const categoryData = req.body;

  if (req.file) {
    try {
      const result = await streamUpload(req.file.buffer, "categories");
      categoryData.image = result.secure_url;
    } catch (err) {
      console.error("Cloudinary category upload failed:", err);
    }
  }

  const newCategory = new Category(categoryData);
  await newCategory.save();

  return newCategory;
};

exports.updateCategory = async ({
  category,
  file,
  body,
  protocol,
  getHost,
}) => {
  if (file) {
    try {
      const result = await streamUpload(file.buffer, "categories");
      category.image = result.secure_url;
    } catch (err) {
      console.error("Cloudinary category update upload failed:", err);
    }
  }

  Object.assign(category, body);
  await category.save();

  return category;
};

exports.deleteCategoryById = async (id) => {
  const category = await Category.findByIdAndDelete(id);

  if (category && category.image) {
    const imageName = category.image.split("/").pop();
    const imagePath = path.join(
      __dirname,
      "..",
      "..",
      "public",
      "categories",
      imageName
    );

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  return category;
};

exports.generateCategoryExcel = async () => {
  const categories = await Category.find();

  const workbook = new ExcelJs.Workbook();
  const worksheet = workbook.addWorksheet("Category Data");

  worksheet.columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Description", key: "description", width: 30 },
    { header: "Created By", key: "createdBy", width: 20 },
    { header: "Date Time", key: "time", width: 20 },
  ];

  categories.forEach((category) => {
    worksheet.addRow({
      name: category.name,
      description: category.descrption || "N/A",
      createdBy: category.createdBy || "N/A",
      time: category.time,
    });
  });

  return workbook;
};

exports.importCategoryExcel = async (req) => {
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

  await Category.insertMany(CategoryData);
};
