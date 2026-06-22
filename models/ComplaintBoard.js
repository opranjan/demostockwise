// models/ComplaintBoard.js
const mongoose = require("mongoose");

// The three independently-versioned tables on the complaint board.
const BOARD_TYPES = ["complaint", "monthly", "annual"];

// Each document is a full, immutable snapshot ("version") of ONE table
// (boardType). Publishing an update for a table creates a new version of only
// that table and keeps every previous one as history. Exactly one version per
// boardType is flagged isCurrent at a time.
//
// `rows` holds the table data; its shape depends on boardType:
//   - complaint: { srNo, receivedFrom, pendingLastMonth, received, receivedStar,
//                  totalPending, pendingOver3Months, avgResolutionTime }
//   - monthly / annual: { srNo, period, carriedForward, received, receivedStar, pending }
const complaintBoardSchema = new mongoose.Schema(
  {
    boardType: { type: String, enum: BOARD_TYPES, required: true, index: true },
    version: { type: Number, required: true, index: true },
    periodLabel: { type: String, default: "" }, // e.g. "May 2026"

    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },

    isCurrent: { type: Boolean, default: false, index: true },
    updatedBy: { type: String, default: "" }, // optional admin label/note
  },
  { collection: "complaint_boards", timestamps: true }
);

const model = mongoose.model("ComplaintBoard", complaintBoardSchema);
model.BOARD_TYPES = BOARD_TYPES;

module.exports = model;
