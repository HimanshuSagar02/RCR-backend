import express from "express";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import Certificate from "../models/certificateModel.js";
import User from "../models/userModel.js";
import Course from "../models/courseModel.js";

const router = express.Router();

/* =====================================================
    GENERATE CERTIFICATE PDF
=====================================================*/
router.get("/generate/:userId/:courseId", async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) return res.status(404).json({ message: "User or Course not found" });

    // Create DB entry for certificate
    const certificate = await Certificate.create({ userId, courseId });
    const certificateId = certificate._id.toString();

    // QR Code including verify URL(API/UI you will make later)
    const qrData = await QRCode.toDataURL(`https://your-domain.com/certificate/verify/${certificateId}`);

    /* ---------- PDF CONFIG ---------- */
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margin: 20,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${user.name}-certificate.pdf`);
    doc.pipe(res);

    /* ---------- BORDER ---------- */
    doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).lineWidth(3).stroke("#000");
    doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70).lineWidth(1).stroke("#000");

    /* ---------- WATERMARK ---------- */
    doc.save();
    doc.font("Helvetica-Bold")
       .fontSize(140)
       .fillColor("#FFD700")
       .opacity(0.15)
       .text("RCR", doc.page.width / 2 - 250, doc.page.height / 2 - 110);
    doc.restore();

    /* ---------- TITLE ---------- */
    doc.font("Helvetica-Bold")
       .fillColor("#000")
       .fontSize(42)
       .text("CERTIFICATE OF COMPLETION", 0, 80, { align: "center" });

    /* ---------- MAIN BODY ---------- */
    doc.fontSize(18).text("This certifies that", 0, 165, { align: "center" });

    doc.font("Helvetica-Bold")
       .fontSize(34)
       .text(user.name.toUpperCase(), 0, 210, { align: "center" });

    doc.font("Helvetica")
       .fontSize(18)
       .text("has successfully completed the course", 0, 260, { align: "center" });

    doc.font("Helvetica-Bold")
       .fontSize(28)
       .text(course.title, 0, 300, { align: "center" });

    /* ---------- DATE & CERTIFICATE ID ---------- */
    doc.fontSize(14).fillColor("#000")
       .text(`Certificate ID : ${certificateId}`, 0, 350, { align: "center" });

    doc.fontSize(14)
       .text(`Issued On : ${new Date().toLocaleDateString()}`, 0, 375, { align: "center" });

    /* ---------- QR CODE ---------- */
    const qrSize = 120;
    doc.image(qrData, 70, doc.page.height - qrSize - 70, { width: qrSize });
    doc.fontSize(12).text("Scan to Verify", 92, doc.page.height - 50);

    /* ---------- SIGNATURE LINE ---------- */
    const signY = doc.page.height - 150;
    doc.moveTo(doc.page.width / 2 - 120, signY)
       .lineTo(doc.page.width / 2 + 120, signY)
       .stroke();

    doc.fontSize(14).text("Authorized Signature", 0, signY + 10, { align: "center" });

    /* ---------- FOOTER ---------- */
    doc.fontSize(10)
       .text("RCR • RAJ CHEM REACTOR", 0, doc.page.height - 35, { align: "center" });

    doc.end();

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

export default router;
