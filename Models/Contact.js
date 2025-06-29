const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true },
    message: String,
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", ContactSchema);

ContactSchema.index({ "$**": "text" });

module.exports = Contact;
