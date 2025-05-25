const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, sparse: true },
    note: { type: String, required: false, default: null },
    payDate: { type: Date, required: false, default: null },
    logs: [
      {
        message: { type: String, required: true },
        icon: { type: String, required: false },
        date: { type: Date, required: true, default: Date.now },
      }
    ],
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
    sentDate: { type: Date, required: false, default: null },
    holdReason: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

const Invoice = mongoose.model("Invoice", InvoiceSchema);

InvoiceSchema.index({ "$**": "text" });
module.exports = Invoice;
