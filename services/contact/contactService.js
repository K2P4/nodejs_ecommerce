const Contact = require("../../Models/Contact");

exports.createContact = async (req) => {
  const newContact = await new Contact(req.body);
  await newContact.save();

  return newContact;
};

exports.getContacts = async () => {
  return await Contact.find();
};
