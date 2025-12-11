import mongoose from "mongoose";

const connectDb = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            console.error("❌ MONGODB_URL is not configured in environment variables");
            return;
        }
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ DB connected successfully");
    } catch (error) {
        console.error("❌ DB connection error:", error.message || error);
    }
};

export default connectDb;