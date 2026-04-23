const PDFDocument = require("pdfkit");
const Submission = require("../models/Submission");
const COMPANY = require("../config/company");
const numberToWords = require("number-to-words");

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function amountInWordsINR(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = numberToWords
    .toWords(rupees)
    .replace(/,/g, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let result = `${words} Rupees`;

  if (paise > 0) {
    const p = numberToWords
      .toWords(paise)
      .replace(/,/g, "")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    result += ` And ${p} Paise`;
  }

  return result + " Only";
}

async function generateInvoice(req, res) {
  try {
    const { txnId } = req.params;
    const submission = await Submission.findOne({ txnId });

    if (!submission)
      return res
        .status(404)
        .json({ ok: false, message: "Submission not found" });

    const cgst = 90.0;
    const sgst = 90.0;
    const total = submission.amount;
    const baseAmount = (total - (cgst + sgst)).toFixed(2);
    const invoiceNo = `INV-${txnId}-${Date.now()}`;
    const invoiceDate = formatDate(new Date());

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Invoice_${invoiceNo}.pdf"`
    );

    doc.pipe(res);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;
    let y = doc.y;
    const pad = 10;

    /* ================= HEADER ================= */
    doc.rect(startX, y, pageWidth, 40).fill("#bd24df");
    doc.fillColor("#fff")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("ONBOARDING PERFORMA INVOICE", startX, y + 12, {
        width: pageWidth,
        align: "center",
      });
    y += 50;

    /* ================= META ================= */
    doc.roundedRect(startX, y, pageWidth, 36, 6).stroke();
    doc.fillColor("#000").fontSize(10).font("Helvetica-Bold");
    doc.text("Invoice No:", startX + pad, y + 12);
    doc.font("Helvetica").text(invoiceNo, startX + 90, y + 12);
    doc.font("Helvetica-Bold").text("Date:", startX + pageWidth - 140, y + 12);
    doc.font("Helvetica").text(invoiceDate, startX + pageWidth - 80, y + 12);
    y += 50;

    /* ================= SUPPLIER & RECIPIENT ================= */
    const colW = pageWidth / 2 - 5;

    doc.roundedRect(startX, y, colW, 90, 6).stroke();
    doc.font("Helvetica-Bold").text("Supplier", startX + pad, y + 10);
    doc.font("Helvetica").text(COMPANY.NAME, startX + pad, y + 28);
    doc.text(COMPANY.ADDRESS.CITY_STATE, startX + pad, y + 44);
    doc.text(`GST No: ${COMPANY.GST.NUMBER}`, startX + pad, y + 60);

    doc.roundedRect(startX + colW + 10, y, colW, 90, 6).stroke();
    doc.font("Helvetica-Bold").text("Recipient", startX + colW + 20, y + 10);
    doc.font("Helvetica").text(submission.fullName, startX + colW + 20, y + 28);
    doc.text(submission.email, startX + colW + 20, y + 44);
    y += 110;

    /* ================= TABLE ================= */
    const headers = ["Description", "HSN / SAC", "Qty", "Amount"];
    const colWidths = [
      pageWidth * 0.45,
      pageWidth * 0.15,
      pageWidth * 0.1,
      pageWidth * 0.2,
    ];

    doc.rect(startX, y, pageWidth, 30).fill("#f0f4f8");
    let x = startX;
    doc.fillColor("#000").font("Helvetica-Bold");

    headers.forEach((h, i) => {
      doc.text(h, x + pad, y + 10, {
        width: colWidths[i],
        align: i === 3 ? "right" : "left",
      });
      x += colWidths[i];
    });

    y += 30;

    doc.rect(startX, y, pageWidth, 30).stroke();
    x = startX;

    const row = [
      "Research Services Subscription",
      "998312",
      "1",
      baseAmount,
    ];

    doc.font("Helvetica");
    row.forEach((v, i) => {
      doc.text(v, x + pad, y + 10, {
        width: colWidths[i],
        align: i === 3 ? "right" : "left",
      });
      x += colWidths[i];
    });

    y += 35;

    /* ================= CGST ================= */
    doc.rect(startX, y, pageWidth, 25).stroke();
    doc.text("CGST", startX + pageWidth - 200, y + 8);
    doc.text(cgst.toFixed(2), startX + pageWidth - 80, y + 8, {
      width: 60,
      align: "right",
    });
    y += 25;

    /* ================= SGST ================= */
    doc.rect(startX, y, pageWidth, 25).stroke();
    doc.text("SGST", startX + pageWidth - 200, y + 8);
    doc.text(sgst.toFixed(2), startX + pageWidth - 80, y + 8, {
      width: 60,
      align: "right",
    });
    y += 40;

    /* ================= TOTAL ================= */
    doc.roundedRect(startX + pageWidth / 2, y, pageWidth / 2, 40, 6).stroke();
    doc.font("Helvetica-Bold")
      .text("Total Amount", startX + pageWidth / 2 + pad, y + 14);
    doc.text(total.toFixed(2), startX + pageWidth - 80, y + 14, {
      width: 60,
      align: "right",
    });
    y += 60;

    /* ================= AMOUNT IN WORDS ================= */
    doc.roundedRect(startX, y, pageWidth, 30, 6).stroke();
    doc.font("Helvetica-Bold")
      .text("Amount in Words:", startX + pad, y + 10);
    doc.font("Helvetica")
      .text(amountInWordsINR(total), startX + 150, y + 10);
    y += 45;

    /* ================= IMPORTANT NOTES ================= */
    const notes = [
      "• Investments in securities are subject to market risks",
      "• We do not guarantee profits or returns",
      "• All investment decisions are at client's discretion",
      "• This is research service, not investment advice",
    ];

    doc.font("Helvetica-Bold").text("IMPORTANT NOTES", startX, y);
    y += 12;

    notes.forEach((n) => {
      doc.font("Helvetica").text(n, startX, y);
      y += 14;
    });

    y += 10;

    /* ================= PAYMENT TERMS ================= */
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
    y += 8;

    doc.font("Helvetica-Bold")
      .fontSize(11)
      .text("PAYMENT TERMS", startX, y);
    y += 14;

    const payLines = [
      "• Payment must be made only through official bank account",
      "• Never transfer funds to personal accounts",
      "• Report any suspicious payment requests immediately",
    ];

    doc.font("Helvetica").fontSize(10);
    payLines.forEach((p) => {
      doc.text(p, startX, y);
      y += 14;
    });

    y += 12;

    /* ================= FOOTER ================= */
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
    y += 10;

    doc.font("Helvetica-Bold").text(COMPANY.NAME, startX, y);
    y += 12;

    doc.font("Helvetica")
      .fontSize(9)
      .text(`SEBI Registration No. ${COMPANY.SEBI.REG_NO}`, startX, y)
      .text(
        `Email: ${COMPANY.CONTACT.SUPPORT_EMAIL} | Phone: ${COMPANY.CONTACT.REPORT_MOBILE}`,
        startX,
        y + 12
      )
      .text(`Website: ${COMPANY.WEBSITE}`, startX, y + 24)
      .text(
        "This invoice is generated electronically and is valid without signature.",
        startX,
        y + 36
      );

    doc.end();
  } catch (err) {
    console.error("Invoice generation error:", err);
    res
      .status(500)
      .json({ ok: false, message: "Failed to generate invoice." });
  }
}

module.exports = { generateInvoice };
