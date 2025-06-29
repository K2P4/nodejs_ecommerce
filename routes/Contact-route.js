const express = require("express");
const router = express.Router();
const ContactController = require("../controllers/contact-controller");


router.post("/send-message", ContactController.sendMessage);
router.post("/index", ContactController.getContacts);


module.exports = router;
