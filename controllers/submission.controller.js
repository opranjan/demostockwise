// controllers/submission.controller.js
const multer = require("multer");
const Submission = require("../models/Submission");
const { uploadToCloudinary } = require("../services/cloudinary.service");
const { validateBody } = require("../utils/validate");
const { sendEmail } = require("../services/email.service");
const { welcomeEmailTemplate } = require("../templates/welcomeEmail");
const { generateInvoiceBuffer } = require("../services/invoice.service");
const { generateUserAgreementBuffer } = require("../services/agreement.service");
const geoip = require("geoip-lite");


const allowedMime = new Set(["application/pdf", "image/png", "image/jpeg"]);

// The web KYC form posts the PAN image as a base64 data URL (JSON), not a
// multipart file. Convert "data:image/png;base64,...." into a Buffer so it can
// be pushed to Cloudinary the same way an uploaded file is.
function bufferFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const base64 = match ? match[2] : dataUrl;
  try {
    const buf = Buffer.from(base64, "base64");
    return buf.length ? buf : null;
  } catch {
    return null;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMime.has(file.mimetype)) cb(null, true);
    else cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Invalid file type."));
  },
});

const uploadFields = upload.fields([
  { name: "panDoc", maxCount: 1 },
  { name: "aadharDoc", maxCount: 1 },
]);

async function submit(req, res) {
  try {
    const files = req.files || {};
    const panFile = files.panDoc?.[0];
    const aadharFile = files.aadharDoc?.[0];

    // Validate input
    const errors = validateBody ? validateBody(req.body) : [];
    if (!panFile) errors.push({ field: "panDoc", message: "PAN document is required." });
    if (!aadharFile) errors.push({ field: "aadharDoc", message: "Aadhar document is required." });
    if (errors.length) return res.status(400).json({ ok: false, errors });

    // Upload to Cloudinary
    const panDocMeta = await uploadToCloudinary(
      panFile.buffer,
      `${Date.now()}-${req.body.pan}-PAN-${panFile.originalname}`
    );
    const aadharDocMeta = await uploadToCloudinary(
      aadharFile.buffer,
      `${Date.now()}-${req.body.pan}-AADHAR-${aadharFile.originalname}`
    );

    // Save submission
    const submission = await Submission.create({
      fullName: req.body.fullName,
      email: req.body.email,
      mobile: req.body.mobile,
      pan: req.body.pan.toUpperCase(),
      dob: req.body.dob,
      amount: parseFloat(req.body.amount),
      paymentDate: req.body.paymentDate,
      txnId: req.body.txnId,
      agentName: req.body.agentName,
      panDoc: panDocMeta,
      aadharDoc: aadharDocMeta,
    });

    // Generate invoice PDF in memory
    const pdfBuffer = await generateInvoiceBuffer(submission);

    // Calculate subscription period (2 days sample)
    const startDate = new Date(submission.paymentDate);
    const endDate = new Date(startDate.getTime() + 2 * 86400000);
    const formattedStart = startDate.toLocaleDateString("en-IN");
    const formattedEnd = endDate.toLocaleDateString("en-IN");

    // Generate HTML email
    const emailHtml = welcomeEmailTemplate({
      name: submission.fullName,
      email: submission.email,         // ✅ added email
      mobile: submission.mobile,   
      amount: submission.amount,
      startDate: formattedStart,
      // endDate: formattedEnd,
      invoiceNo: `INV-${submission.txnId}`,
    });

    // Send via Hostinger SMTP
    await sendEmail({
      to: submission.email,
      cc: process.env.EMAIL_CC,
      subject: "Welcome Onboard – Your Research Service Details & Disclosures",
      html: emailHtml,
      attachment: pdfBuffer,
      filename: `Invoice_${submission.txnId}.pdf`,
    });

    return res.status(201).json({
      ok: true,
      message: "Submission saved and email sent with invoice.",
      data: submission,
    });
  } catch (err) {
    console.error("❌ Submit error:", err);
    return res.status(500).json({ ok: false, message: "Server error." });
  }
}





async function submitWithAgreement(req, res) {
  try {
    const files = req.files || {};
    const panFile = files.panDoc?.[0];
    const aadharFile = files.aadharDoc?.[0];

    const {
      fullName,
      email,
      mobile,
      signatureBase64,
      location,
      lat,
      lng,
    } = req.body;

    // ✅ VALIDATION (ONLY 3 REQUIRED)
    const errors = [];

    if (!fullName) errors.push({ field: "fullName", message: "Name is required" });
    if (!email) errors.push({ field: "email", message: "Email is required" });
    if (!mobile) errors.push({ field: "mobile", message: "Mobile is required" });

    if (errors.length) {
      return res.status(400).json({ ok: false, errors });
    }

    // ✅ OPTIONAL FILE UPLOAD
    // Accept the PAN/Aadhaar doc either as a multipart file (agent panel) or as
    // a base64 data URL (web KYC form sends panCardImageBase64 in JSON).
    let panDocMeta = null;
    let aadharDocMeta = null;

    if (panFile) {
      panDocMeta = await uploadToCloudinary(
        panFile.buffer,
        `${Date.now()}-${fullName}-PAN-${panFile.originalname}`
      );
    } else if (req.body.panCardImageBase64) {
      const panBuffer = bufferFromDataUrl(req.body.panCardImageBase64);
      if (panBuffer) {
        panDocMeta = await uploadToCloudinary(
          panBuffer,
          `${Date.now()}-${fullName}-PAN`
        );
      }
    }

    if (aadharFile) {
      aadharDocMeta = await uploadToCloudinary(
        aadharFile.buffer,
        `${Date.now()}-${fullName}-AADHAR-${aadharFile.originalname}`
      );
    } else if (req.body.aadharImageBase64) {
      const aadharBuffer = bufferFromDataUrl(req.body.aadharImageBase64);
      if (aadharBuffer) {
        aadharDocMeta = await uploadToCloudinary(
          aadharBuffer,
          `${Date.now()}-${fullName}-AADHAR`
        );
      }
    }

    // ✅ CLIENT IP (optional fallback)
    let clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;

    if (clientIp === "::1") clientIp = "127.0.0.1";
    if (clientIp?.startsWith("::ffff:")) {
      clientIp = clientIp.replace("::ffff:", "");
    }

    // ✅ FORMAT LOCATION (from frontend)
    const formattedLocation = location
      ? `${location} | Lat: ${lat ?? "NA"}, Lng: ${lng ?? "NA"}`
      : `IP: ${clientIp}`;

    // ✅ SAVE DATA
    const submission = await Submission.create({
      fullName,
      email,
      mobile,

      // optional fields — web KYC sends "panCard", agent panel sends "pan"
      pan: (req.body.pan || req.body.panCard || "").toUpperCase() || undefined,
      dob: req.body.dob,
      amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
      paymentDate: req.body.paymentDate,
      txnId: req.body.txnId,
      agentName: req.body.agentName,

      panDoc: panDocMeta,
      aadharDoc: aadharDocMeta,

      // agreement
      signature: signatureBase64,
      agreementAccepted: !!signatureBase64,
      agreementAcceptedAt: signatureBase64 ? new Date() : null,
      agreementIp: clientIp,

      // ✅ LOCATION SAVED HERE
      location: formattedLocation,
    });

    // ✅ GENERATE PDFs
    let invoiceBuffer = null;
    let agreementBuffer = null;

    if (submission.amount && submission.txnId) {   
      invoiceBuffer = await generateInvoiceBuffer(submission);
    }

    if (signatureBase64) {
      agreementBuffer = await generateUserAgreementBuffer(
        submission,
        clientIp
      );
    }

    // ✅ EMAIL TEMPLATE
    const emailHtml = welcomeEmailTemplate({
      name: submission.fullName,
      email: submission.email,
      mobile: submission.mobile,
      amount: submission.amount || 0,
      startDate: submission.paymentDate
        ? new Date(submission.paymentDate).toLocaleDateString("en-IN")
        : new Date().toLocaleDateString("en-IN"),
      invoiceNo: submission.txnId ? `INV-${submission.txnId}` : "N/A",

      // ✅ PASS LOCATION TO EMAIL
      location: submission.location,
    });

    // ✅ SEND INVOICE EMAIL
    if (invoiceBuffer) {
      await sendEmail({
        to: submission.email,
        cc: process.env.EMAIL_CC,
        subject: "Welcome Onboard – Invoice",
        html: emailHtml,
        attachment: invoiceBuffer,
        filename: `Invoice_${submission.txnId}.pdf`,
      });
    }

    // ✅ SEND AGREEMENT EMAIL
    if (agreementBuffer) {
      await sendEmail({
        to: submission.email,
        cc: process.env.EMAIL_CC,
        subject: "Agreement",
        html: emailHtml,
        attachment: agreementBuffer,
        filename: `Agreement_${submission.txnId || "user"}.pdf`,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Submission saved & email(s) sent successfully",
      data: submission,
    });
  } catch (err) {
    console.error("❌ Combined error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
    });
  }
}









// GET all submissions (Admin Panel)
async function getSubmissions(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      fromDate,
      toDate,
      includeDeleted = "false",
      onlyDeleted = "false",
    } = req.query;

    const skip = (page - 1) * limit;

    // 🔍 Search filter
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { mobile: { $regex: search, $options: "i" } },
            { pan: { $regex: search, $options: "i" } },
            { txnId: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // 📅 Date filter
    const dateQuery = {};
    if (fromDate || toDate) {
      dateQuery.paymentDate = {};
      if (fromDate) dateQuery.paymentDate.$gte = new Date(fromDate);
      if (toDate) dateQuery.paymentDate.$lte = new Date(toDate);
    }

    // 🗑️ Soft-delete filter
    const deletedQuery =
      onlyDeleted === "true"
        ? { isDeleted: true }
        : includeDeleted === "true"
        ? {}
        : { isDeleted: { $ne: true } };

    const query = {
      ...searchQuery,
      ...dateQuery,
      ...deletedQuery,
    };

    const [data, total] = await Promise.all([
      Submission.find(query)
        .sort({ createdAt: -1 }) // latest first
        .skip(skip)
        .limit(Number(limit)),
      Submission.countDocuments(query),
    ]);

    return res.status(200).json({
      ok: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (err) {
    console.error("❌ Get submissions error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch submissions",
    });
  }
}




// GET submission by ID
async function getSubmissionById(req, res) {
  try {
    const { id } = req.params;
    const { includeDeleted = "false" } = req.query;

    const query =
      includeDeleted === "true"
        ? { _id: id }
        : { _id: id, isDeleted: { $ne: true } };

    const submission = await Submission.findOne(query);
    if (!submission) {
      return res.status(404).json({
        ok: false,
        message: "Submission not found",
      });
    }

    return res.status(200).json({
      ok: true,
      data: submission,
    });
  } catch (err) {
    console.error("❌ Get submission error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch submission",
    });
  }
}

// Update an existing submission (Admin Panel edit)
// Accepts JSON: editable text fields + optional base64 docs (panCardImageBase64,
// aadharImageBase64), or multipart files (panDoc, aadharDoc).
async function updateSubmission(req, res) {
  try {
    const { id } = req.params;

    const submission = await Submission.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });
    if (!submission) {
      return res.status(404).json({ ok: false, message: "Submission not found" });
    }

    const b = req.body;

    // Text fields — only overwrite when the key was actually sent
    if (b.fullName !== undefined) submission.fullName = b.fullName;
    if (b.email !== undefined) submission.email = b.email;
    if (b.mobile !== undefined) submission.mobile = b.mobile;

    const panValue = b.pan ?? b.panCard;
    if (panValue !== undefined) {
      submission.pan = String(panValue).toUpperCase() || undefined;
    }

    if (b.dob !== undefined) submission.dob = b.dob;
    if (b.location !== undefined) submission.location = b.location;
    if (b.paymentDate !== undefined) submission.paymentDate = b.paymentDate;
    if (b.txnId !== undefined) submission.txnId = b.txnId;
    if (b.agentName !== undefined) submission.agentName = b.agentName;
    if (b.amount !== undefined) {
      submission.amount = b.amount === "" ? undefined : parseFloat(b.amount);
    }

    // Optional document replacement — file upload or base64 data URL
    const files = req.files || {};
    const panFile = files.panDoc?.[0];
    const aadharFile = files.aadharDoc?.[0];

    if (panFile) {
      submission.panDoc = await uploadToCloudinary(
        panFile.buffer,
        `${Date.now()}-${submission.fullName}-PAN-${panFile.originalname}`
      );
    } else if (b.panCardImageBase64) {
      const panBuffer = bufferFromDataUrl(b.panCardImageBase64);
      if (panBuffer) {
        submission.panDoc = await uploadToCloudinary(
          panBuffer,
          `${Date.now()}-${submission.fullName}-PAN`
        );
      }
    }

    if (aadharFile) {
      submission.aadharDoc = await uploadToCloudinary(
        aadharFile.buffer,
        `${Date.now()}-${submission.fullName}-AADHAR-${aadharFile.originalname}`
      );
    } else if (b.aadharImageBase64) {
      const aadharBuffer = bufferFromDataUrl(b.aadharImageBase64);
      if (aadharBuffer) {
        submission.aadharDoc = await uploadToCloudinary(
          aadharBuffer,
          `${Date.now()}-${submission.fullName}-AADHAR`
        );
      }
    }

    await submission.save();

    return res.status(200).json({
      ok: true,
      message: "Submission updated successfully",
      data: submission,
    });
  } catch (err) {
    console.error("❌ Update error:", err);
    return res.status(500).json({ ok: false, message: "Failed to update submission" });
  }
}

// Soft delete (mark as deleted, do not remove)
async function softDeleteSubmission(req, res) {
  try {
    const { id } = req.params;

    const submission = await Submission.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({
        ok: false,
        message: "Submission not found or already deleted",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Submission deleted successfully",
      data: submission,
    });
  } catch (err) {
    console.error("❌ Soft delete error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to delete submission",
    });
  }
}

// Restore a soft-deleted submission
async function restoreSubmission(req, res) {
  try {
    const { id } = req.params;

    const submission = await Submission.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null } },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({
        ok: false,
        message: "Deleted submission not found",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Submission restored successfully",
      data: submission,
    });
  } catch (err) {
    console.error("❌ Restore error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to restore submission",
    });
  }
}

module.exports = {
  uploadFields,
  submit,
  submitWithAgreement,
  getSubmissions,
  getSubmissionById,
  updateSubmission,
  softDeleteSubmission,
  restoreSubmission,
};
