const express = require("express");
const router = express.Router();

const inquiryController = require("../controllers/inquiry.controller");

router.post("/inquiries", inquiryController.createInquiry);

router.get("/", inquiryController.getAllInquiries);

router.get("/:id", inquiryController.getInquiryById);

router.delete("/:id", inquiryController.deleteInquiry);

module.exports = router;