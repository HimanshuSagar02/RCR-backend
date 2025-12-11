import jwt from "jsonwebtoken"

export const genToken = async(userId) => {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured in environment variables");
        }
        
        if (!userId) {
            throw new Error("User ID is required to generate token");
        }
        
        let token = jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn:"7d"});
        
        if (!token) {
            throw new Error("Failed to generate token");
        }
        
        return token;
    } catch (error) {
        console.error("[Token] Token generation error:", error);
        console.error("[Token] Error details:", {
            message: error.message,
            hasJWTSecret: !!process.env.JWT_SECRET,
            userId: userId
        });
        throw error; // Re-throw to let caller handle it
    }
}