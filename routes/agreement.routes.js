// routes/agreement.routes.js
const express = require("express");
const router = express.Router();
const { sendAgreementEmail, getAgreementPdfByEmail } = require("../controllers/agreement.controller");

// POST /api/send-agreement
router.post("/send-agreement", sendAgreementEmail);

router.get("/agreement/pdf", getAgreementPdfByEmail);

module.exports = router;
