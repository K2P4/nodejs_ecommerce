const express = require("express");
const Category = require("../Models/Category");
const CategoryController = require("../controllers/category-controller");
const router = express.Router();
const multer = require("multer");
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

router.get("/", CategoryController.getCategories);
router.get("/:id", getByID, CategoryController.getCategoryByID);
router.post("/", upload.single("image"), CategoryController.createCategory);
router.put("/:id", upload.single("image"), getByID, CategoryController.updateCategory);
router.delete("/:id",getByID, CategoryController.deleteCategory);
router.get("/export", CategoryController.exportExcel);
router.get("/import", uploadMemory.single("file"), CategoryController.importExcel);



module.exports = router;
