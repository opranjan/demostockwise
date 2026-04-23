// services/email.service.js
require("dotenv").config();
const nodemailer = require("nodemailer");
const COMPANY = require("../config/company");



const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: parseInt(process.env.SMTP_PORT) === 465, // FIXED
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, 
  },
});

/**
 * Send email via Hostinger SMTP
 */
async function sendEmail({ to,cc, subject, html, attachment, filename }) {
  try {
    const mailOptions = {
      from: `${COMPANY.NAME} || StockwiseIq <${process.env.SMTP_USER}>`,
      to,
      cc, 
      subject,
      html,
      replyTo: process.env.COMPANY_EMAIL || process.env.SMTP_USER,
      attachments: attachment
        ? [
            {
              filename: filename || "invoice.pdf",
              content: attachment,
              contentType: "application/pdf",
            },
          ]
        : [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Email send failed:", err);
    throw err;
  }
}

module.exports = { sendEmail, transporter };



