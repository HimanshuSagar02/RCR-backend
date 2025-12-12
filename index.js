import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import connectDb from "./configs/db.js"

// Routes
import authRouter from "./routes/authRoute.js";
import userRouter from "./routes/userRoute.js"
import courseRouter from "./routes/courseRoute.js"
import paymentRouter from "./routes/paymentRoute.js"
import aiRoute from "./routes/aiRoute.js";
import noteRoute from "./routes/noteRoute.js";
import assignmentRoute from "./routes/assignmentRoute.js";
import reviewRouter from "./routes/reviewRoute.js"
import progressRoutes from "./routes/progressRoutes.js";

import certificateRoutes from "./routes/certificateRoutes.js";
import adminRoute from "./routes/adminRoute.js";
import courseNoteRoute from "./routes/courseNoteRoute.js";
import attendanceRoute from "./routes/attendanceRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import setupRoute from "./routes/setupRoute.js";
import testRoute from "./routes/testRoute.js";
import liveClassRoute from "./routes/liveClassRoute.js";
import gradeRoute from "./routes/gradeRoute.js";
import doubtRoute from "./routes/doubtRoute.js";
import aiAssistantRoute from "./routes/aiAssistantRoute.js";
import feedbackRoute from "./routes/feedbackRoute.js";

dotenv.config({ path: "./.env" }); 

const app = express();
const port = process.env.PORT || 8000   // fallback if env missing

// Middlewares
app.use(express.json())
app.use(cookieParser())
// CORS configuration - allow both production and development origins
const allowedOrigins = [
    "https://rajchemreactor.netlify.app",
    "http://localhost:5175",
    "http://localhost:3000",
    process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

console.log("CORS Configuration:", {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    allowedOrigins: allowedOrigins
});

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log("[CORS] Request with no origin - allowing");
            return callback(null, true);
        }
        
        console.log(`[CORS] Request from origin: ${origin}`);
        
        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
            console.log("[CORS] Development mode - allowing all origins");
            return callback(null, true);
        }
        
        // In production, check against allowed origins
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log(`[CORS] Origin allowed: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`[CORS] Origin blocked: ${origin}. Allowed origins:`, allowedOrigins);
            // In production, still allow but log warning (for debugging)
            callback(null, true); // Temporarily allow all for debugging
            // callback(new Error('Not allowed by CORS')); // Uncomment after fixing
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}))

// API Routes 🔽
app.use("/api/auth", authRouter)          // LOGIN / SIGNUP
app.use("/api/user", userRouter)
app.use("/api/course", courseRouter)
app.use("/api/payment", paymentRouter)
app.use("/api/ai", aiRoute);
app.use("/api/ai-assistant", aiAssistantRoute); 
app.use("/api/review", reviewRouter)
app.use("/api/progress", progressRoutes)
  //progress route added successfully
app.use("/api/cert", certificateRoutes); // certificate route connected
app.use("/api/admin", adminRoute);
app.use("/api/sharednotes", courseNoteRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/notes", noteRoute);
app.use("/api/assignments", assignmentRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/setup", setupRoute); // One-time setup routes (no auth required)
app.use("/api/test", testRoute); // Test routes
app.use("/api/liveclass", liveClassRoute); // Live classes
app.use("/api/grades", gradeRoute); // Grades/Marks
app.use("/api/doubts", doubtRoute); // Doubts/Questions
app.use("/api/feedback", feedbackRoute); // Feedback System

// Test Route
app.get("/", (req,res)=>{
    res.send("Server Running Successfully ✔")
})

// Error handling middleware (should be after all routes)
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(500).json({ 
    message: "Internal server error", 
    error: process.env.NODE_ENV === "development" ? err.message : "Something went wrong" 
  });
});

// DB + Server Start
app.listen(port, ()=>{
    console.log(`🔥 Server started on port ${port}`)
    console.log("🔑 GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Set" : "Missing");
    console.log("☁️  Cloudinary Config:", 
        (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) 
        ? "Set" : "Missing"
    );
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        console.log("   Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    }
    console.log("📹 LiveKit Config:", 
        (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_URL) 
        ? "Set" : "Missing"
    );
    if (process.env.LIVEKIT_API_KEY) {
        console.log("   API Key:", process.env.LIVEKIT_API_KEY);
        console.log("   URL:", process.env.LIVEKIT_URL || "Not set");
        if (!process.env.LIVEKIT_API_SECRET) {
            console.log("   ⚠️  WARNING: LIVEKIT_API_SECRET is missing! LiveKit will not work.");
        }
    }
    connectDb()
})

process.on("uncaughtException", (err)=> {
  console.log("❗ Server Crash:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err)=> {
  console.log("❗ Unhandled Rejection:", err);
});
