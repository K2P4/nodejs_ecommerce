const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  image: { type: String, required: false },
  category: { type: String, required: false },
  description: { type: String, required: false },
  price: { type: Number, required: true },
  discountPercentage: { type: Number, default: 0 },
  inStock: { type: Number, required: true },
  reorderLevel: { type: Number, required: false },
  
  time: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },

});

const Stock = mongoose.model("Stock", StockSchema);

StockSchema.index({ "$**": "text" });
module.exports = Stock;
