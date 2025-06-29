const fs = require("fs");
const multer = require("multer");
const express = require("express");
const Stock = require("../Models/Stock");
const StockController = require("../controllers/stock-controller");
const path = require("path");
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

router.get("/", StockController.getStocks);
router.get("/:id", getByID , StockController.getStocksByID);
router.post("/",authenticateUser, upload.array("images", 4), StockController.createStock);
router.put("/:id",authenticateUser,  upload.array("images", 4), getByID , StockController.updateStock);
router.delete("/:id",authenticateUser, getByID , StockController.deleteStock);
router.get("/export", StockController.exportExcel);
router.post("/import", authenticateUser,uploadMemory.single("file"), StockController.importExcel);


module.exports = router;