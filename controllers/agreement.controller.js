// controllers/agreement.controller.js
const Submission = require("../models/Submission");
const { sendEmail } = require("../services/email.service");
const { generateUserAgreementBuffer } = require("../services/agreement.service");
const COMPANY = require("../config/company");
const geoip = require("geoip-lite");


function agreementEmailTemplate(submission) {
  return `
  <div style="font-family: Arial, sans-serif; background-color: #f9fafc; padding: 30px;">
    <div style="max-width: 600px; background: #fff; margin: auto; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); padding: 30px;">
      <h2 style="color: #2c3e50; text-align:center;">Thank you for agreeing to our Terms</h2>
      <p style="font-size: 15px; color: #333;">Hi <strong>${submission.fullName}</strong>,</p>
      <p style="font-size: 15px; color: #333;">
        We have recorded your acceptance of the <strong>${COMPANY.NAME}</strong> Terms & Conditions.
      </p>
      <h3 style="color:#2c3e50; border-bottom:1px solid #ddd; padding-bottom:5px;">Subscription Summary</h3>
      <p style="font-size: 14px; margin:6px 0;">Amount: <strong>₹${submission.amount.toFixed(2)}</strong></p>
      <p style="font-size: 14px; margin:6px 0;">Days: <strong>2</strong></p>
      <p style="font-size: 14px; margin:6px 0;">Transaction ID: <strong>${submission.txnId}</strong></p>
      <p style="font-size: 14px; margin:6px 0;">Payment Date: <strong>${submission.paymentDate}</strong></p>

      <div style="margin-top: 20px; background: #f3f4f6; padding: 15px; border-radius: 5px;">
        <p style="font-size: 14px; color:#333;">
          We've attached a PDF copy of your signed agreement for your records.
        </p>
      </div>

      <p style="margin-top: 30px; font-size: 13px; color: #555;">
        ${COMPANY.NAME}<br>
        ${COMPANY.CONTACT.SUPPORT_EMAIL}<br>
        ${COMPANY.CONTACT.REPORT_MOBILE}
      </p>
    </div>
  </div>
  `;
}








//location start

function getClientLocation(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip;

  if (ip === "::1") ip = "127.0.0.1";
  if (ip?.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  const geo = geoip.lookup(ip);

  return {
    ip,
    city: geo?.city || "Unknown",
    region: geo?.region || "Unknown",
    country: geo?.country || "Unknown",
    timezone: geo?.timezone || "Unknown",
    latitude: geo?.ll?.[0] || null,
    longitude: geo?.ll?.[1] || null,
  };
}


//location end



async function sendAgreementEmail(req, res) {
  try {
   const { email, signatureBase64 } = req.body;

      if (!email || !signatureBase64) {
      return res.status(400).json({
        ok: false,
        message: "Email and e-signature are required",
      });
    }


function getClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip;

  // Fix IPv6 localhost & IPv4-mapped IPv6
  if (ip === "::1") ip = "127.0.0.1";
  if (ip?.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  return ip;
}


    const clientIp = getClientIp(req);
console.log("Client IP:", clientIp);


const clientLocation = getClientLocation(req);




    const submission = await Submission.findOne({ email });
    if (!submission) {
      return res.status(404).json({ ok: false, message: "No submission found for this email." });
    }



         // esign start


    if (submission.agreementAccepted) {
      return res.status(409).json({
        ok: false,
        message: "Agreement already accepted",
      });
    }



    submission.signature = signatureBase64;
    submission.agreementAccepted = true;
    submission.agreementAcceptedAt = new Date();
    submission.agreementIp = getClientIp(req);

submission.location = `${clientLocation.city || "Unknown City"}, ${
  clientLocation.region || "Unknown Region"
}, ${clientLocation.country || "Unknown Country"} | Lat: ${
  clientLocation.latitude ?? "NA"
}, Lng: ${clientLocation.longitude ?? "NA"}`;


    await submission.save();



    // esign end



    // Generate agreement PDF
    const agreementBuffer = await generateUserAgreementBuffer(submission, clientIp);

    // Send email
    await sendEmail({
      to: submission.email,
      cc: process.env.EMAIL_CC,
      subject: `Thank you for agreeing to our Terms – ${COMPANY.NAME}`,
      html: agreementEmailTemplate(submission),
      attachment: agreementBuffer,
      filename: `User_Agreement_${submission.txnId}.pdf`,
    });

    return res.status(200).json({
      ok: true,
      message: `Agreement email sent successfully to ${submission.email}.`,
    });
  } catch (err) {
    console.error("❌ Agreement email error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to send agreement email.",
    });
  }
}









// Reuse IP helper
function getClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip;

  if (ip === "::1") ip = "127.0.0.1";
  if (ip?.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  return ip;
}

async function getAgreementPdfByEmail(req, res) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Email is required",
      });
    }

    const submission = await Submission.findOne({ email });

    if (!submission) {
      return res.status(404).json({
        ok: false,
        message: "No agreement found for this email",
      });
    }

    const clientIp = getClientIp(req);

    // Generate PDF
    const pdfBuffer = await generateUserAgreementBuffer(
      submission,
      clientIp
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=User_Agreement_${submission.txnId || "Optionbricks"}.pdf`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Get agreement PDF error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate agreement PDF",
    });
  }
}



module.exports = { sendAgreementEmail, getAgreementPdfByEmail };
