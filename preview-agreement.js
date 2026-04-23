// preview-agreement.js
const fs = require("fs");
const path = require("path");
const { generateUserAgreementBuffer } = require("./services/agreement.service");

(async () => {
  try {
    console.log("⏳ Generating Agreement PDF preview...");



       // 👉 Sample base64 signature (replace with your real one)
    const signatureBase64 = fs.readFileSync(
      path.join(__dirname, "signature.png")
    ).toString("base64");

    const fakeSubmission = {
      fullName: "Akash Kumar",
      email: "akash@example.com",
      mobile: "9876543210",
      'location' : "Sample City, Sample Region, Sample Country | Lat: 12.34, Lng: 56.78",
       signature: `data:image/png;base64,${signatureBase64}`,
    };

    const ip = "103.224.67.12"; // fake IP

    // Generate PDF Buffer
    const pdfBuffer = await generateUserAgreementBuffer(fakeSubmission, ip);

    // Save file
    const filePath = path.join(__dirname, "agreement_preview.pdf");
    fs.writeFileSync(filePath, pdfBuffer);

    console.log(`✅ PDF generated successfully: ${filePath}`);
    console.log("📂 Open it manually in File Explorer or drag into Chrome.");
  } catch (err) {
    console.error("❌ Error generating PDF:", err);
  }
})();
