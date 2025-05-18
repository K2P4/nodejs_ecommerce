const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true , sparse: true },
    note: { type: String, required: false, default: null }, 
    payDate: { type: Date, required: false , default: null}, 
    logs: { type: Array, required: false, default: [] }, 
    attachments: {
      type: String,
      required: false,
      default: null
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Paid", "Hold", "Cancelled"],
      default: "Draft",
      required: true,
    },
    sentDate: { type: Date, required: false , default: null },
    holdReason: { type: String, required: false ,default: null },
  },
  { timestamps: true }
);

const Invoice = mongoose.model("Invoice", InvoiceSchema);

InvoiceSchema.index({ "$**": "text" });
module.exports = Invoice;
