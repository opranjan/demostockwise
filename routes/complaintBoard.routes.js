// routes/complaintBoard.routes.js
const router = require("express").Router();
const {
  getCurrentBoard,
  getHistory,
  getBoardById,
  createBoardVersion,
  updateBoard,
  setCurrentBoard,
  deleteBoard,
} = require("../controllers/complaintBoard.controller");

// Public site – latest published board
router.get("/complaint-board", getCurrentBoard);

// Panel – history (all versions) + single version
router.get("/complaint-board/history", getHistory);
router.get("/complaint-board/:id", getBoardById);

// Panel – publish / edit / restore / delete
router.post("/complaint-board", createBoardVersion);
router.put("/complaint-board/:id", updateBoard);
router.patch("/complaint-board/:id/set-current", setCurrentBoard);
router.delete("/complaint-board/:id", deleteBoard);

module.exports = router;
