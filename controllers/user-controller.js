const { register, login, getProfile } = require("../services/user/userService");

//register
exports.register = async (req, res) => {
  try {
    const { name, email, password, password_confirmation, isAdmin } = req.body;
    const newUser = await register(
      name,
      email,
      password,
      password_confirmation,
      isAdmin
    );

    res.status(201).json({
      message: "User registered successfully",
      success: true,
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//login
exports.login = async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;
    const { token, user } = await login(email, password, isAdmin);

    res.json({ message: "Login successful", token, success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//profile
exports.getProfile = async (req, res) => {
  try {
    const user = await getProfile(req.user.id);
    res.json({ message: "Profile data", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//logout
exports.logout = async (res) => {
  res.json({ message: "Logout successful" });
};
