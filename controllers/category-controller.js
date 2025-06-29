const {
  getFilteredCategories,
  generateCategoryExcel,
  createCategory,
  updateCategory,
  deleteCategoryById,
} = require("../services/category/categoryService");

//all data
exports.getCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perpage = parseInt(req.query.perpage) || 10;
    const search = req.query.search;
    const time = req.query.time;
    const sort = req.query.sort || "desc";

    const { data, total } = await getFilteredCategories({
      page,
      perpage,
      search,
      time,
      sort,
    });

    res.status(200).json({
      total,
      page,
      perpage,
      data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//data by id
exports.getCategoryByID = async (req, res) => {
  res.status(200).json({ message: "Sucessfull", category: req.category });
};

//upload
exports.createCategory = async (req, res) => {
  try {
    const newCategory = await createCategory(req);

    res.status(201).json({
      message: "Category item added successfully",
      data: newCategory,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//update
exports.updateCategory = async (req, res, next) => {
  try {
    const updatedCategory = await updateCategory({
      category: req.category,
      file: req.file,
      body: req.body,
      protocol: req.protocol,
      getHost: req.get.bind(req),
    });

    res.status(201).json({
      message: "category item Updated successfully",
      data: updatedCategory,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//delete
exports.deleteCategory = async (req, res) => {
  const category = await deleteCategoryById(req.params.id);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.status(200).json({ message: "Category item deleted successfully" });
};

//export
exports.exportExcel = async (req, res) => {
  try {
    const workbook = await generateCategoryExcel();

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
    console.error("Export failed:", error);
    res.status(500).json({ message: "Failed to export data" });
  }
};

//import
exports.importExcel = async (req, res) => {
  try {
    const categoryData = await importCategoryExcel(req);
    
    res
      .status(200)
      .json({ message: "Category imported successfully", categoryData });
  } catch (error) {
    res.status(500).json({ message: "Error importing data", error });
  }
};
