import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }
    
    let { token } = req.cookies;
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required. Please login." });
    }
    
    let verifyToken;
    try {
      verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please login again." });
      }
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token. Please login again." });
      }
      throw jwtError;
    }
    
    if (!verifyToken || !verifyToken.userId) {
      return res.status(401).json({ message: "Invalid token format" });
    }
  
    req.userId = verifyToken.userId;
    next();
  } catch (error) {
    console.error("isAuth middleware error:", error);
    return res.status(500).json({ 
      message: `Authentication error: ${error.message || String(error)}` 
    });
  }
};

export default isAuth;