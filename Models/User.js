const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true },
    password: String,
    isAdmin: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1, isAdmin: 1 }, { unique: true });

const User = mongoose.model("User", UserSchema);
module.exports = User;
