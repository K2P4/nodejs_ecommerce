const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: { type: Array, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: Number,
      required: true,
      default: 0,
    },
    deliveryDate:{ type: Date, required: false },
    paymentType: { type: Number, required: true, default: 0 },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: Number, required: true },
    transitionRecord: { type: String, required: false },
    deliveryType: { type: Number, required: true, default: 0 },
    address: { type: String, required: true },
    city: { type: String, required: true },
    township: { type: String, required: true },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

OrderSchema.index({ "$**": "text" });
module.exports = Order;
