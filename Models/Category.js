const mongoose = require("mongoose");
const { create } = require("./Stock");

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  descrption: { type: String, required: false },
  createdBy: { type: String, required: false },
  time: { type: Date, default: Date.now },
},
{ timestamps: true });

const Category = mongoose.model("Category", CategorySchema);

CategorySchema.index({ "$**": "text" });

module.exports= Category;