const { createContact, getContacts } = require("../services/contact/contactService");

exports.sendMessage = async (req, res) => {
  try {
    const newContact = await createContact(req.body);
    res.status(201).json({
      message: "User have sent message successfully",
      success: true,
      user: newContact,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await getContacts();
    res.status(200).json({
      data: contacts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
