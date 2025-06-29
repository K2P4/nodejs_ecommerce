const User = require("../../Models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (
  name,
  email,
  password,
  password_confirmation,
  isAdmin
) => {
  if (password !== password_confirmation) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const existingUser = await User.findOne({ email, isAdmin });
  if (existingUser) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    isAdmin,
  });
  await newUser.save();
  return newUser;
};

exports.login = async (email, password, isAdmin) => {
  const user = await User.findOne({ email, isAdmin });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, name: user.name, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
  return { token, user };
};

exports.getProfile = async (id) => {
  const user = await User.findById(id).select("-password");
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }
  return user;
};
