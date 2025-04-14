const mongoose = require("mongoose");

const DeliverySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentType: { type: Number, required: true, default: 0 },
    name: { type: String, required: true, default: null },
    email: { type: String, required: true, default: null },
    phone: { type: Number, required: true, default: null },
    transitionRecord: { type: String, required: true, default: null },
    deliveryType: { type: Number, required: true, default: 0 },
    address: { type: String, required: true, default: null },
    city: { type: String, required: true, default: null },
    township: { type: String, required: true, default: null },
  },
  { timestamps: true }
);

const Delivery = mongoose.model("Delivery", DeliverySchema);
module.exports = Delivery;
