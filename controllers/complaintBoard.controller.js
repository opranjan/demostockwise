// controllers/complaintBoard.controller.js
const ComplaintBoard = require("../models/ComplaintBoard");

// Sanitize the three table arrays coming from the panel so we never store
// stray fields and always coerce numbers.
function cleanComplaintRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r, i) => ({
    srNo: Number(r.srNo ?? i + 1),
    receivedFrom: String(r.receivedFrom ?? ""),
    pendingLastMonth: Number(r.pendingLastMonth) || 0,
    received: Number(r.received) || 0,
    receivedStar: Number(r.receivedStar) || 0,
    totalPending: Number(r.totalPending) || 0,
    pendingOver3Months: Number(r.pendingOver3Months) || 0,
    avgResolutionTime: String(r.avgResolutionTime ?? "N/A"),
  }));
}

function cleanTrendRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r, i) => ({
    srNo: Number(r.srNo ?? i + 1),
    period: String(r.period ?? ""),
    carriedForward: Number(r.carriedForward) || 0,
    received: Number(r.received) || 0,
    receivedStar: Number(r.receivedStar) || 0,
    pending: Number(r.pending) || 0,
  }));
}

// GET /api/complaint-board  → latest (current) board, for the public site
async function getCurrentBoard(_req, res) {
  try {
    const board =
      (await ComplaintBoard.findOne({ isCurrent: true }).sort({ version: -1 })) ||
      (await ComplaintBoard.findOne().sort({ version: -1 }));

    if (!board) {
      return res.status(200).json({ ok: true, data: null });
    }
    return res.status(200).json({ ok: true, data: board });
  } catch (err) {
    console.error("❌ getCurrentBoard error:", err);
    return res.status(500).json({ ok: false, message: "Failed to fetch complaint board" });
  }
}

// GET /api/complaint-board/history?page=&limit=  → all versions (panel)
async function getHistory(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      ComplaintBoard.find().sort({ version: -1 }).skip(skip).limit(limit),
      ComplaintBoard.countDocuments(),
    ]);

    return res.status(200).json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      data,
    });
  } catch (err) {
    console.error("❌ getHistory error:", err);
    return res.status(500).json({ ok: false, message: "Failed to fetch history" });
  }
}

// GET /api/complaint-board/:id  → a specific version (panel view)
async function getBoardById(req, res) {
  try {
    const board = await ComplaintBoard.findById(req.params.id);
    if (!board) return res.status(404).json({ ok: false, message: "Version not found" });
    return res.status(200).json({ ok: true, data: board });
  } catch (err) {
    console.error("❌ getBoardById error:", err);
    return res.status(500).json({ ok: false, message: "Failed to fetch version" });
  }
}

// POST /api/complaint-board  → publish a new version (keeps previous as history)
async function createBoardVersion(req, res) {
  try {
    const { periodLabel, complaintBoardData, monthlyTrendData, annualTrendData, updatedBy } =
      req.body || {};

    const last = await ComplaintBoard.findOne().sort({ version: -1 });
    const nextVersion = last ? last.version + 1 : 1;

    // Demote any previously-current version.
    await ComplaintBoard.updateMany({ isCurrent: true }, { $set: { isCurrent: false } });

    const board = await ComplaintBoard.create({
      version: nextVersion,
      periodLabel: String(periodLabel ?? ""),
      complaintBoardData: cleanComplaintRows(complaintBoardData),
      monthlyTrendData: cleanTrendRows(monthlyTrendData),
      annualTrendData: cleanTrendRows(annualTrendData),
      updatedBy: String(updatedBy ?? ""),
      isCurrent: true,
    });

    return res.status(201).json({ ok: true, data: board });
  } catch (err) {
    console.error("❌ createBoardVersion error:", err);
    return res.status(500).json({ ok: false, message: "Failed to create version" });
  }
}

// PUT /api/complaint-board/:id  → edit a version in place (fix a typo, etc.)
async function updateBoard(req, res) {
  try {
    const { periodLabel, complaintBoardData, monthlyTrendData, annualTrendData, updatedBy } =
      req.body || {};

    const update = {};
    if (periodLabel !== undefined) update.periodLabel = String(periodLabel);
    if (updatedBy !== undefined) update.updatedBy = String(updatedBy);
    if (complaintBoardData !== undefined)
      update.complaintBoardData = cleanComplaintRows(complaintBoardData);
    if (monthlyTrendData !== undefined)
      update.monthlyTrendData = cleanTrendRows(monthlyTrendData);
    if (annualTrendData !== undefined)
      update.annualTrendData = cleanTrendRows(annualTrendData);

    const board = await ComplaintBoard.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!board) return res.status(404).json({ ok: false, message: "Version not found" });
    return res.status(200).json({ ok: true, data: board });
  } catch (err) {
    console.error("❌ updateBoard error:", err);
    return res.status(500).json({ ok: false, message: "Failed to update version" });
  }
}

// PATCH /api/complaint-board/:id/set-current  → make an old version current again
async function setCurrentBoard(req, res) {
  try {
    const board = await ComplaintBoard.findById(req.params.id);
    if (!board) return res.status(404).json({ ok: false, message: "Version not found" });

    await ComplaintBoard.updateMany({ isCurrent: true }, { $set: { isCurrent: false } });
    board.isCurrent = true;
    await board.save();

    return res.status(200).json({ ok: true, data: board });
  } catch (err) {
    console.error("❌ setCurrentBoard error:", err);
    return res.status(500).json({ ok: false, message: "Failed to set current version" });
  }
}

// DELETE /api/complaint-board/:id  → remove a version
async function deleteBoard(req, res) {
  try {
    const board = await ComplaintBoard.findByIdAndDelete(req.params.id);
    if (!board) return res.status(404).json({ ok: false, message: "Version not found" });

    // If we deleted the current version, promote the newest remaining one.
    if (board.isCurrent) {
      const latest = await ComplaintBoard.findOne().sort({ version: -1 });
      if (latest) {
        latest.isCurrent = true;
        await latest.save();
      }
    }

    return res.status(200).json({ ok: true, message: "Version deleted" });
  } catch (err) {
    console.error("❌ deleteBoard error:", err);
    return res.status(500).json({ ok: false, message: "Failed to delete version" });
  }
}

module.exports = {
  getCurrentBoard,
  getHistory,
  getBoardById,
  createBoardVersion,
  updateBoard,
  setCurrentBoard,
  deleteBoard,
};
