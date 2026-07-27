const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
      trim: true,
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid mobile number"],
    },
    investment: {
      type: String,
      required: true,
    },
    segment: {
      type: String,
      required: true,
      // enum: [
      //   "Equity Cash/ Intraday",
      //   "F&O",
      //   "Commodity",
      //   "Currency",
      //   "Mutual Funds",
      // ],
    },
    trading: {
      type: String,
      required: true,
      enum: ["Yes", "No"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Inquiry", inquirySchema);