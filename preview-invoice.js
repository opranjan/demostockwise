const fs = require("fs");
const { generateInvoiceBuffer } = require("./services/invoice.service");

(async () => {
  const dummySubmission = {
    fullName: "Rohit Sharma",
    email: "rohit.sharma@gmail.com",
    amount: 1180,              // includes CGST + SGST
    txnId: "TXN123456",
    paymentDate: new Date(),
  };

  const buffer = await generateInvoiceBuffer(dummySubmission);
  fs.writeFileSync("invoice-preview.pdf", buffer);

  console.log("✅ Invoice preview generated: invoice-preview.pdf");
})();
