import mongoose from "mongoose";

const connectDb = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            console.error("❌ MONGODB_URL is not configured in environment variables");
            console.error("   Please set MONGODB_URL in your .env file or Render environment variables");
            return;
        }
        
        const mongoUrl = process.env.MONGODB_URL.trim();
        console.log("🔌 Attempting to connect to MongoDB...");
        console.log("   Connection string preview:", mongoUrl.substring(0, 20) + "...");
        
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        
        console.log("✅ DB connected successfully");
        console.log("   Database:", mongoose.connection.name);
        console.log("   Host:", mongoose.connection.host);
    } catch (error) {
        console.error("❌ DB connection error:", error.message || error);
        console.error("   Please check:");
        console.error("   1. MONGODB_URL is correct");
        console.error("   2. MongoDB Atlas network access allows your IP");
        console.error("   3. Database credentials are correct");
        // Don't exit process, let the server start but log the error
    }
};

export default connectDb;