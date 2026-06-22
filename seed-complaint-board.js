// seed-complaint-board.js
// One-time seed: stores the data currently hardcoded on the frontend
// /complaint-board page as version 1. Run once:  node seed-complaint-board.js
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./utils/db");
const ComplaintBoard = require("./models/ComplaintBoard");

const complaintBoardData = [
  { srNo: 1, receivedFrom: "Directly from Investors", pendingLastMonth: 0, received: 0, receivedStar: 0, totalPending: 0, pendingOver3Months: 0, avgResolutionTime: "N/A" },
  { srNo: 2, receivedFrom: "SEBI (SCORES)", pendingLastMonth: 0, received: 0, receivedStar: 0, totalPending: 0, pendingOver3Months: 0, avgResolutionTime: "N/A" },
  { srNo: 3, receivedFrom: "Other Sources (If any)", pendingLastMonth: 0, received: 0, receivedStar: 0, totalPending: 0, pendingOver3Months: 0, avgResolutionTime: "N/A" },
  { srNo: 4, receivedFrom: "Grand Total", pendingLastMonth: 0, received: 0, receivedStar: 0, totalPending: 0, pendingOver3Months: 0, avgResolutionTime: "N/A" },
];

const monthlyTrendData = [
  { srNo: 1, period: "JAN-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 2, period: "FEB-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 3, period: "MAR-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 4, period: "APR-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 5, period: "MAY-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 6, period: "JUN-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 7, period: "JULY-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 8, period: "AUG-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 9, period: "SEP-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 10, period: "OCT-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 11, period: "NOV-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 12, period: "DEC-25", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 13, period: "JAN-26", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 14, period: "FEB-26", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 15, period: "MAR-26", carriedForward: 2, received: 0, receivedStar: 0, pending: 2 },
  { srNo: 16, period: "APR-26", carriedForward: 2, received: 0, receivedStar: 2, pending: 2 },
  { srNo: 17, period: "MAY-26", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 18, period: "GRAND TOTAL", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
];

const annualTrendData = [
  { srNo: 1, period: "2024-2025", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
  { srNo: 2, period: "2025-2026", carriedForward: 0, received: 2, receivedStar: 2, pending: 0 },
  { srNo: 3, period: "GRAND TOTAL", carriedForward: 0, received: 0, receivedStar: 0, pending: 0 },
];

async function run() {
  await connectDB(process.env.MONGO_URI);

  const existing = await ComplaintBoard.findOne().sort({ version: -1 });
  if (existing) {
    console.log(`ℹ️  Complaint board already has data (latest version ${existing.version}). Skipping seed.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const board = await ComplaintBoard.create({
    version: 1,
    periodLabel: "Initial (seeded)",
    complaintBoardData,
    monthlyTrendData,
    annualTrendData,
    isCurrent: true,
    updatedBy: "seed",
  });

  console.log(`✅ Seeded complaint board as version ${board.version} (id ${board._id}).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
