// models/ComplaintBoard.js
const mongoose = require("mongoose");

// Row of the main "Complaint Board" table (snapshot by source).
const complaintRowSchema = new mongoose.Schema(
  {
    srNo: { type: Number },
    receivedFrom: { type: String, default: "" },
    pendingLastMonth: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    receivedStar: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    pendingOver3Months: { type: Number, default: 0 },
    avgResolutionTime: { type: String, default: "N/A" },
  },
  { _id: false }
);

// Row used by both the monthly and annual disposal trend tables.
const trendRowSchema = new mongoose.Schema(
  {
    srNo: { type: Number },
    period: { type: String, default: "" },
    carriedForward: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    receivedStar: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
  },
  { _id: false }
);

// Each document is a full, immutable snapshot ("version") of the complaint
// board. Publishing an update creates a new version and keeps every previous
// one as history. Exactly one version is flagged isCurrent at a time.
const complaintBoardSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, index: true },
    periodLabel: { type: String, default: "" }, // e.g. "May 2026"

    complaintBoardData: { type: [complaintRowSchema], default: [] },
    monthlyTrendData: { type: [trendRowSchema], default: [] },
    annualTrendData: { type: [trendRowSchema], default: [] },

    isCurrent: { type: Boolean, default: false, index: true },
    updatedBy: { type: String, default: "" }, // optional admin label/note
  },
  { collection: "complaint_boards", timestamps: true }
);

module.exports = mongoose.model("ComplaintBoard", complaintBoardSchema);
