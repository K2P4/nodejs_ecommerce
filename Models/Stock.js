const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: null },
    brand: { type: String, required: false, default: null },
    size: { type: Number, required: false },
    gender: {
      type: String,
      enum: ["Men", "Women", "Unisex"],
      default: "Unisex",
    },
    images: [{ type: String, required: false }],
    description: { type: String, default: null },
    price: { type: Number, required: true, default: null },
    discountPercentage: { type: Number, default: 0, default: null },
    inStock: { type: Number, required: true, default: null },
    branch: { type: String, required: false, default: null },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      default: null,
    },
    status: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 3 },
    reorderLevel: { type: Number, required: false },
    time: { type: Date, default: Date.now },
    createdBy: { type: String, default: null },
    cartQuantity: { type: Number, default: 0 },
    isInCart: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Stock = mongoose.model("Stock", StockSchema);

StockSchema.index({ "$**": "text" });
module.exports = Stock;
