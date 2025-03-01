
require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const stockRoutes = require("./routes/Stock-route");

const app = express();


app.use(express.json());
app.use(express.static("public"));
app.use(cors());

app.use("/api/stocks", stockRoutes); 

mongoose.connect(process.env.DB_CONNECTION)
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log(err));

app.listen(3000, () => console.log("Server is running on port 3000"));
