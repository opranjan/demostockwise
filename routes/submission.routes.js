const router = require("express").Router();
const {
  uploadFields,
  submit,
  submitWithAgreement,
  getSubmissions,
  getSubmissionById,
  softDeleteSubmission,
  restoreSubmission,
} = require("../controllers/submission.controller");


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

// Soft delete a submission
router.delete("/userkyc/:id", softDeleteSubmission);

// Restore a soft-deleted submission
router.patch("/userkyc/:id/restore", restoreSubmission);



module.exports = router;
