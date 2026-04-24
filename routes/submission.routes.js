const router = require("express").Router();
const { uploadFields, submit,submitWithAgreement, getSubmissions, getSubmissionById } = require("../controllers/submission.controller");


// Health
router.get("/health", (_req, res) => res.json({ ok: true }));

// Submit
router.post("/submit", uploadFields, submit);


// Submit  in onego
// router.post("/submitandpay", submitWithAgreement);

// ✅ Submit in one go
router.post("/submitandpay", (req, res, next) => {
  console.log("🔥 submitandpay HIT");
  next();
}, submitWithAgreement);



// GET – admin panel list
router.get("/userkyc/", getSubmissions);

// GET – single submission
router.get("/userkyc/:id", getSubmissionById);



module.exports = router;
