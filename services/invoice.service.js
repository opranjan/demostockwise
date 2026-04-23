// services/invoice.service.js
const PDFDocument = require("pdfkit");
const COMPANY = require("../config/company");
const numberToWords = require("number-to-words");

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function generateInvoiceBuffer(submission) {
  return new Promise((resolve) => {
    const cgst = 90.0;
    const sgst = 90.0;
    const total = submission.amount;
    const baseAmount = (total - (cgst + sgst)).toFixed(2);
    const invoiceNo = `INV-${submission.txnId}-${Date.now()}`;
    const invoiceDate = formatDate(new Date());

    function amountInWordsINR(amount) {
      const rupees = Math.floor(amount);
      const paise = Math.round((amount - rupees) * 100);

      let words = numberToWords.toWords(rupees)
        .replace(/,/g, "")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      let result = `${words} Rupees`;
      if (paise > 0) {
        const p = numberToWords.toWords(paise)
          .replace(/,/g, "")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        result += ` And ${p} Paise`;
      }
      return result + " Only";
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const pageWidth = doc.page.width - 100;
    const startX = 50;
    let y = 50;
    const pad = 10;

    /* ================= HEADER ================= */
    doc.rect(startX, y, pageWidth, 40).fill("#bd24df");
    doc
      .fillColor("#fff")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("ONBOARDING PERFORMA INVOICE", startX, y + 12, {
        width: pageWidth,
        align: "center",
      });
    y += 50;

    /* ================= INVOICE META ================= */
    doc.roundedRect(startX, y, pageWidth, 36, 6).stroke();
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000");
    doc.text("Invoice No:", startX + pad, y + 12);
    doc.font("Helvetica").text(invoiceNo, startX + 90, y + 12);
    doc.font("Helvetica-Bold").text("Date:", startX + pageWidth - 140, y + 12);
    doc.font("Helvetica").text(invoiceDate, startX + pageWidth - 80, y + 12);
    y += 50;

    /* ================= SUPPLIER & RECIPIENT ================= */
    const colW = pageWidth / 2 - 5;

    doc.roundedRect(startX, y, colW, 80, 6).stroke();
    doc.font("Helvetica-Bold").text("Supplier", startX + pad, y + 10);
    doc.font("Helvetica").text(COMPANY.NAME, startX + pad, y + 28);
    doc.text(COMPANY.ADDRESS.CITY_STATE, startX + pad, y + 44);
    doc.text(`GST No: ${COMPANY.GST.NUMBER}`, startX + pad, y + 60);

    doc.roundedRect(startX + colW + 10, y, colW, 80, 6).stroke();
    doc.font("Helvetica-Bold").text("Recipient", startX + colW + 20, y + 10);
    doc.font("Helvetica").text(submission.fullName, startX + colW + 20, y + 28);
    doc.text(submission.email, startX + colW + 20, y + 44);

    y += 100;

    /* ================= DESCRIPTION TABLE ================= */
    const headers = ["Description", "HSN / SAC", "Qty", "Amount"];
    const colWidths = [pageWidth * 0.45, pageWidth * 0.15, pageWidth * 0.1, pageWidth * 0.2];

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
    const row = ["Research Services Subscription", "998312", "1", baseAmount];
    doc.font("Helvetica");
    row.forEach((v, i) => {
      doc.text(v, x + pad, y + 10, {
        width: colWidths[i],
        align: i === 3 ? "right" : "left",
      });
      x += colWidths[i];
    });
    y += 45;






    // ===== DURATION (NEW STYLE) =====

// Top divider
doc
  .moveTo(startX, y)
  .lineTo(startX + pageWidth, y)
  .strokeColor("#ccc")
  .lineWidth(1)
  .stroke();

y += 12;

// Section title
doc
  .font("Helvetica-Bold")
  .fontSize(11)
  .fillColor("#333")
  .text("SERVICE DURATION", startX, y);

y += 14;

// Duration details (two-column layout)
doc
  .font("Helvetica")
  .fontSize(10)
  .fillColor("#555")
  .text("Start Date", startX, y);

doc
  .font("Helvetica-Bold")
  .fillColor("#000")
  .text(formatDate(submission.paymentDate), startX + pageWidth - 120, y, {
    width: 120,
    align: "right",
  });

y += 18;

// Bottom divider
doc
  .moveTo(startX, y)
  .lineTo(startX + pageWidth, y)
  .strokeColor("#eee")
  .lineWidth(1)
  .stroke();

y += 14;


    /* ================= TOTAL ================= */
    doc.roundedRect(startX + pageWidth / 2, y, pageWidth / 2, 40, 6).stroke();
    doc.font("Helvetica-Bold").text("Total Amount", startX + pageWidth / 2 + pad, y + 14);
    doc.text(total.toFixed(2), startX + pageWidth - 80, y + 14, {
      width: 60,
      align: "right",
    });
    y += 60;

    /* ================= AMOUNT IN WORDS ================= */
    doc.roundedRect(startX, y, pageWidth, 30, 6).stroke();
    doc.font("Helvetica-Bold").text("Amount in Words:", startX + pad, y + 10);
    doc.font("Helvetica").text(amountInWordsINR(total), startX + 150, y + 10);
    y += 45;

    /* ================= NOTES ================= */
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







    //     // ===== PAYMENT TERMS =====

// Section divider line
doc.moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
y += 8;

// Title
doc.font("Helvetica-Bold").fontSize(11)
  .text("PAYMENT TERMS", startX, y);
y += 14;

// Content (no boxes, clean list)
doc.font("Helvetica").fontSize(10);
const payLines = [
  "• Payment must be made only through official bank account",
  "• Never transfer funds to personal accounts",
  "• Report any suspicious payment requests immediately",
];

for (const p of payLines) {
  doc.text(p, startX, y);
  y += 14;
}

y += 6;


    /* ================= FOOTER ================= */
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
    y += 10;

    doc.font("Helvetica-Bold").text(COMPANY.NAME, startX, y);
    y += 12;
    doc.font("Helvetica").fontSize(9)
      .text(`SEBI Registration No. ${COMPANY.SEBI.REG_NO}`, startX, y)
      .text(`Email: ${COMPANY.CONTACT.SUPPORT_EMAIL} | Phone: ${COMPANY.CONTACT.REPORT_MOBILE}`, startX, y + 12)
      .text(`Website: ${COMPANY.WEBSITE}`, startX, y + 24)
      .text("This invoice is generated electronically and is valid without signature.", startX, y + 36);

    doc.end();
  });
}

module.exports = { generateInvoiceBuffer };

















// // services/invoice.service.js







// const PDFDocument = require("pdfkit");
// const COMPANY = require("../config/company");
// const numberToWords = require("number-to-words");

// function formatDate(date) {
//   const d = new Date(date);
//   return d.toLocaleDateString("en-IN", {
//     year: "numeric",
//     month: "short",
//     day: "numeric",
//   });
// }

// /**
//  * Generate a full professional invoice as a Buffer (for email attachments)
//  */
// async function generateInvoiceBuffer(submission) {
//   return new Promise((resolve) => {
//     const cgst = 90.0;
//     const sgst = 90.0;
//     const total = submission.amount;
//     const baseAmount = (total - (cgst + sgst)).toFixed(2);
//     const invoiceNo = `INV-${submission.txnId}-${Date.now()}`;
//     const invoiceDate = formatDate(new Date());



//     function amountInWordsINR(amount) {
//   const rupees = Math.floor(amount);
//   const paise = Math.round((amount - rupees) * 100);

//   let words = numberToWords.toWords(rupees)
//     .replace(/,/g, "")
//     .replace(/\b\w/g, (c) => c.toUpperCase());

//   let result = `${words} Rupees`;

//   if (paise > 0) {
//     const paiseWords = numberToWords.toWords(paise)
//       .replace(/,/g, "")
//       .replace(/\b\w/g, (c) => c.toUpperCase());
//     result += ` And ${paiseWords} Paise`;
//   }

//   return result + " Only";
// }

//     const doc = new PDFDocument({ size: "A4", margin: 50 });
//     const chunks = [];
//     doc.on("data", (chunk) => chunks.push(chunk));
//     doc.on("end", () => resolve(Buffer.concat(chunks)));

//     const pageWidth =
//       doc.page.width - doc.page.margins.left - doc.page.margins.right;
//     const startX = doc.page.margins.left;
//     let y = doc.y;
//     const pad = 10;

//     // ===== HEADER =====
//     doc.rect(startX, y, pageWidth, 28).stroke();
//     doc.font("Helvetica-Bold").fontSize(14).text("ONBOARDING PERFORMA INVOICE", 0, y + 8, {
//       align: "center",
//     });
//     y += 28;

//     // Invoice No / Date
//     doc.rect(startX, y, pageWidth, 28).stroke();
//     const colW = pageWidth / 2;
//     doc.fontSize(10).font("Helvetica-Bold").text("Invoice No", startX + pad, y + 8);
//     doc.font("Helvetica").text(invoiceNo, startX + 85, y + 8);
//     doc.font("Helvetica-Bold").text("Date", startX + colW + pad, y + 8);
//     doc.font("Helvetica").text(invoiceDate, startX + colW + 50, y + 8);
//     y += 28;

//     // ===== SUPPLIER =====
//     doc.rect(startX, y, pageWidth, 28).stroke();
//     doc.font("Helvetica-Bold").text("Supplier :", startX + pad, y + 8);
//     y += 28;

//     doc.rect(startX, y, pageWidth, 38).stroke();
//     doc.font("Helvetica-Bold").text(COMPANY.NAME, startX + pad, y + 8);
//     doc.font("Helvetica").text(COMPANY.ADDRESS.CITY_STATE, startX + pad, y + 22);
//     y += 38;

//     // GST
//     doc.rect(startX, y, pageWidth, 28).stroke();
//     doc.font("Helvetica-Bold").text("GST NO :", startX + pad, y + 8);
//     doc.font("Helvetica").text(COMPANY.GST.NUMBER, startX + 90, y + 8);
//     y += 28;

//     // ===== RECIPIENT =====
//     doc.rect(startX, y, pageWidth, 50).stroke();
//     doc.font("Helvetica-Bold").text("Recipient:", startX + pad, y + 8);
//     doc.font("Helvetica-Bold").text(submission.fullName, startX + pad, y + 23);
//     doc.font("Helvetica").text(submission.email, startX + pad, y + 38);
//     y += 50;

//     // ===== DESCRIPTION TABLE =====
//     const tableHeaderHeight = 28;
//     const tableRowHeight = 28;
//     const colWidths = [
//       pageWidth * 0.45,
//       pageWidth * 0.15,
//       pageWidth * 0.1,
//       pageWidth * 0.2,
//     ];
//     const headers = ["Description", "HSN / SAC", "Qty", "Amount"];

//     doc.rect(startX, y, pageWidth, tableHeaderHeight).stroke();
//     let x = startX;
//     doc.font("Helvetica-Bold");
//     for (let i = 0; i < headers.length; i++) {
//       doc.text(headers[i], x + pad, y + 8, {
//         width: colWidths[i],
//         align: i === 3 ? "right" : "left",
//       });
//       x += colWidths[i];
//     }
//     y += tableHeaderHeight;

//     doc.rect(startX, y, pageWidth, tableRowHeight).stroke();
//     const rowValues = [
//       "Research Services Subscription",
//       "998312",
//       "1",
//       baseAmount,
//     ];
//     x = startX;
//     doc.font("Helvetica");
//     for (let i = 0; i < rowValues.length; i++) {
//       doc.text(rowValues[i], x + pad, y + 8, {
//         width: colWidths[i],
//         align: i === 3 ? "right" : "left",
//       });
//       x += colWidths[i];
//     }
//     y += tableRowHeight;

//     // ===== DURATION =====
//     doc.rect(startX, y, pageWidth, 28).stroke();
//     doc.font("Helvetica-Bold").text("Duration", startX + pad, y + 8);
//     y += 28;

//     doc.rect(startX, y, pageWidth, 28).stroke();
//     doc.font("Helvetica-Bold").text("Start Date", startX + pad, y + 8);
//     doc.font("Helvetica").text(formatDate(submission.paymentDate), startX + 90, y + 8);
//     y += 28;

//     // ===== TAX SECTION =====
//     const taxBoxW = pageWidth * 0.5;
//     doc.rect(startX + taxBoxW, y, taxBoxW, 55).stroke();
//     // doc.font("Helvetica-Bold").text("CGST", startX + taxBoxW + pad, y + 10);
//     // doc.text(cgst.toFixed(2), startX + taxBoxW + taxBoxW - 70, y + 10, { width: 50, align: "right" });
//     // doc.font("Helvetica-Bold").text("SGST", startX + taxBoxW + pad, y + 28);
//     // doc.text(sgst.toFixed(2), startX + taxBoxW + taxBoxW - 70, y + 28, { width: 50, align: "right" });

//     doc.rect(startX + taxBoxW, y + 55, taxBoxW, 28).stroke();
//     doc.font("Helvetica-Bold").text("Total Amount", startX + taxBoxW + pad, y + 63);
//     doc.text(total.toFixed(2), startX + taxBoxW + taxBoxW - 70, y + 63, { width: 50, align: "right" });
//     y += 83;

//     // ===== AMOUNT IN WORDS =====
//     doc.rect(startX, y, pageWidth, 28).stroke();
//     const amountWords = amountInWordsINR(total);
//     doc.font("Helvetica-Bold").text("Total Amount in Words", startX + pad, y + 8);
//     doc.font("Helvetica").text(amountWords, startX + 190, y + 8);
//     y += 28;

//     // ===== IMPORTANT NOTES =====
//     const noteLines = [
//       "• Investments in securities are subject to market risks",
//       "• We do not guarantee profits or returns",
//       "• All investment decisions are at client's discretion",
//       "• This is research service, not investment advice",
//     ];
//     doc.rect(startX, y, pageWidth, 18).stroke();
//     doc.font("Helvetica-Bold").text("IMPORTANT NOTES", startX + pad, y + 5);
//     y += 18;
//     for (const n of noteLines) {
//       doc.rect(startX, y, pageWidth, 18).stroke();
//       doc.font("Helvetica").text(n, startX + pad, y + 5);
//       y += 18;
//     }

//     // ===== PAYMENT TERMS =====
//     const payLines = [
//       "• Payment must be made only through official bank account",
//       "• Never transfer funds to personal accounts",
//       "• Report any suspicious payment requests immediately",
//     ];
//     doc.rect(startX, y, pageWidth, 18).stroke();
//     doc.font("Helvetica-Bold").text("PAYMENT TERMS", startX + pad, y + 5);
//     y += 18;
//     for (const p of payLines) {
//       doc.rect(startX, y, pageWidth, 18).stroke();
//       doc.font("Helvetica").text(p, startX + pad, y + 5);
//       y += 18;
//     }

//     // ===== FOOTER =====
//     doc.rect(startX, y, pageWidth, 80).stroke();
//     y += 4;
//     doc.font("Helvetica-Bold").text(COMPANY.NAME, startX + pad, y);
//     y += 14;
//     doc.font("Helvetica").text(`SEBI Registration No. ${COMPANY.SEBI.REG_NO}`, startX + pad, y);
//     y += 12;
//     doc.text(`Email: ${COMPANY.CONTACT.EMAIL} | Phone: ${COMPANY.CONTACT.PHONE}`, startX + pad, y);
//     y += 12;
//     doc.text(`Website: ${COMPANY.WEBSITE}`, startX + pad, y);
//     y += 12;
//     doc.text("Thank you for choosing Optionbricks!", startX + pad, y);
//     y += 12;
//     doc.text("This invoice is generated electronically and is valid without signature.", startX + pad, y);

//     doc.end();
//   });
// }

// module.exports = { generateInvoiceBuffer };










