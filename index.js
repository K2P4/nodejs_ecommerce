require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import Routes
const stockRoutes = require("./routes/Stock-route");
const categoryRoutes = require("./routes/Category-route");
const userRoutes = require("./routes/User-route");
const orderRoutes = require("./routes/Order-route");
const invoiceRoutes = require("./routes/Invoice-route");
const contactRoutes = require("./routes/Contact-route");
const dashboardRoute = require("./routes/Dashboard-route");

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use("/public", express.static("public"));
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Test 
app.get("/", (req, res) => {
  res.send("🎉 API is Live!");
});

// API Routes
app.use("/api/order", orderRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/", userRoutes);
app.use("/api/dashboard", dashboardRoute);

//  Connection
mongoose
  .connect(process.env.DB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

//  Server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server is running on port ${port}`));
