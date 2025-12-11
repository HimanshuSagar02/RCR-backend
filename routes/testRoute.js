import express from "express";
import User from "../models/userModel.js";
import connectDb from "../configs/db.js";
import mongoose from "mongoose";

const router = express.Router();

// Test database connection
router.get("/db", async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const states = {
            0: "disconnected",
            1: "connected",
            2: "connecting",
            3: "disconnecting"
        };
        
        return res.status(200).json({
            success: dbState === 1,
            status: states[dbState] || "unknown",
            message: dbState === 1 ? "Database is connected" : "Database is not connected",
            database: mongoose.connection.name,
            host: mongoose.connection.host
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Database check failed",
            error: error.message
        });
    }
});

// Test user query
router.get("/users", async (req, res) => {
    try {
        const count = await User.countDocuments();
        const sampleUsers = await User.find().limit(5).select("name email role status").lean();
        
        return res.status(200).json({
            success: true,
            totalUsers: count,
            sampleUsers: sampleUsers,
            message: "User query successful"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User query failed",
            error: error.message
        });
    }
});

// Test specific user lookup
router.get("/user/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email: email.toLowerCase() }).select("-password").lean();
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                email: email
            });
        }
        
        return res.status(200).json({
            success: true,
            user: user,
            message: "User found"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User lookup failed",
            error: error.message
        });
    }
});

export default router;
