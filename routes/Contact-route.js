const express = require("express");
const Contact = require("../Models/Contact");
const router = express.Router();

//Register
router.post("/send-message", async (req, res) => {
  const contactData = req.body;
  const newContact = await new Contact(contactData);
  await newContact.save();

  res.status(201).json({
    message: "User have sent message successfully",
    success: true,
    user: newContact,
  });
});

//get
router.get("/index", async (req, res, next) => {
  try {
    const contacts = await Contact.find();
    res.status(200).json({
      data: contacts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
