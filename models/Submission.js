// models/Submission.js
const mongoose = require("mongoose");

const cloudinaryFileSchema = new mongoose.Schema(
  {
    public_id: { type: String, required: true },
    url: { type: String, required: true },
    format: { type: String },
    bytes: { type: Number },
    resource_type: { type: String },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },

    // ❌ make optional
    pan: { type: String },
    dob: { type: String },
    amount: { type: Number },
    paymentDate: { type: String },
    txnId: { type: String },
    agentName: { type: String },

    // ❌ optional files
    panDoc: { type: cloudinaryFileSchema },
    aadharDoc: { type: cloudinaryFileSchema },

    agreementAccepted: { type: Boolean, default: false },
    agreementAcceptedAt: { type: Date },
    agreementIp: { type: String },
    signature: { type: String },
    location: { type: String },

    createdAt: { type: Date, default: Date.now },
  },
  { collection: "submissions" }
);

module.exports = mongoose.model("Submission", submissionSchema);
