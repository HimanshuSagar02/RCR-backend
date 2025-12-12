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
            serverSelectionTimeoutMS: 10000, // Increased timeout for production
            socketTimeoutMS: 45000,
        });
        
        console.log("✅ DB connected successfully");
        console.log("   Database:", mongoose.connection.name);
        console.log("   Host:", mongoose.connection.host);
        console.log("   Ready State:", mongoose.connection.readyState, "(1=connected)");
        
        // Set up connection event listeners
        mongoose.connection.on('error', (err) => {
            console.error("❌ MongoDB connection error:", err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn("⚠️  MongoDB disconnected");
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log("✅ MongoDB reconnected");
        });
        
    } catch (error) {
        console.error("❌ DB connection error:", error.message || error);
        console.error("   Please check:");
        console.error("   1. MONGODB_URL is correct");
        console.error("   2. MongoDB Atlas network access allows your IP (0.0.0.0/0 for all)");
        console.error("   3. Database credentials are correct");
        console.error("   4. MongoDB Atlas cluster is running");
        // Don't exit process, let the server start but log the error
    }
};

// Helper function to check if database is connected
export const isDbConnected = () => {
    return mongoose.connection.readyState === 1;
};

export default connectDb;