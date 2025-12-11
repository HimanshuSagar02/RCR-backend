import express from "express";
import sendMail from "../configs/Mail.js";
import { testCloudinary } from "../configs/cloudinary.js";

const router = express.Router();

// Test email configuration
router.get("/test-email", async (req, res) => {
  try {
    const testEmail = req.query.email || "test@example.com";
    await sendMail(testEmail, "1234");
    return res.status(200).json({ 
      message: "Test email sent successfully!",
      note: "Check your email inbox and spam folder"
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Email test failed",
      error: error.message,
      hint: "Make sure EMAIL and EMAIL_PASS are set in .env file"
    });
  }
});

// Test Cloudinary configuration
router.get("/test-cloudinary", async (req, res) => {
  try {
    const result = await testCloudinary();
    
    if (result.success) {
      return res.status(200).json({ 
        success: true,
        message: result.message,
        status: result.status,
        cloudName: result.cloudName,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({ 
        success: false,
        message: result.message,
        error: result.error,
        details: result.details,
        hint: "Make sure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env file"
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: "Cloudinary test failed",
      error: error.message,
      hint: "Check your Cloudinary credentials in .env file"
    });
  }
});

export default router;

