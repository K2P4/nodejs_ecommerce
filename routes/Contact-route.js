const express = require("express");
const router = express.Router();


router.post("/send-message", UserController.sendMessage);
router.post("/index", UserController.getContacts);


module.exports = router;
