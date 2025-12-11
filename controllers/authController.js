import { genToken } from "../configs/token.js"
import validator from "validator"

import bcrypt from "bcryptjs"
import User from "../models/userModel.js"

import sendMail from "../configs/Mail.js"


export const signUp=async (req,res)=>{
 
    try {

        let {name,email,password,role,class:studentClass,subject}= req.body
        let existUser= await User.findOne({email})
        if(existUser){
            return res.status(400).json({message:"email already exist"})
        }
        if(!validator.isEmail(email)){
            return res.status(400).json({message:"Please enter valid Email"})
        }
        if(password.length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters"})
        }
        
        // Validate class for students
        if(role === "student" && !studentClass){
            return res.status(400).json({message:"Class/Grade is mandatory for students. Please select 9th, 10th, 11th, 12th, or NEET Dropper"})
        }
        
        let hashPassword = await bcrypt.hash(password,10)
        let user = await User.create({
            name ,
            email ,
            password:hashPassword ,
            role,
            class: role === "student" ? studentClass : "",
            subject: role === "student" ? (subject || "") : "",
            status:"pending",
            createdByAdmin:false
            })
        let token = await genToken(user._id)
        
        // Cookie settings - use secure in production
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie("token",token,{
            httpOnly:true,
            secure: isProduction, // Use secure cookies in production (HTTPS only)
            sameSite: isProduction ? "None" : "Lax", // None for cross-site in production, Lax for development
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        
        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;
        return res.status(201).json(userResponse)

    } catch (error) {
        console.log("signUp error")
        return res.status(500).json({message:`signUp Error ${error}`})
    }
}

export const login=async(req,res)=>{
    try {
        let {email,password}= req.body
        
        // Validate input
        if(!email || !password){
            return res.status(400).json({message:"Email and password are required"})
        }
        
        // Normalize email (lowercase, trim)
        email = email.toLowerCase().trim()
        
        console.log(`[Login] Attempting login for email: ${email}`);
        
        // Find user by email (case-insensitive search)
        let user= await User.findOne({email: email.toLowerCase()})
        
        if(!user){
            console.log(`[Login] User not found: ${email}`);
            return res.status(400).json({message:"User does not exist"})
        }
        
        console.log(`[Login] User found - ID: ${user._id}, Status: ${user.status}, Role: ${user.role}`);
        
        // Check account status
        if(user.status === "pending"){
            console.log(`[Login] Account pending approval: ${email}`);
            return res.status(403).json({message:"Account pending approval by admin"})
        }
        if(user.status === "rejected"){
            console.log(`[Login] Account rejected: ${email}`);
            return res.status(403).json({message:"Account rejected by admin"})
        }
        
        // Check if user has a password
        if(!user.password || user.password.trim() === ''){
            console.log(`[Login] User has no password set: ${email}`);
            console.log(`[Login] User password field:`, user.password ? "exists but empty" : "null/undefined");
            return res.status(400).json({
                message:"This account does not have a password set. Please use 'Forgot Password' to set a password, or contact admin.",
                needsPasswordReset: true
            })
        }
        
        // Verify password
        console.log(`[Login] Comparing password for: ${email}`);
        console.log(`[Login] Password hash length: ${user.password.length}`);
        console.log(`[Login] Password hash preview: ${user.password.substring(0, 20)}...`);
        
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
            console.log(`[Login] Password comparison result: ${isMatch}`);
        } catch (compareError) {
            console.error(`[Login] Password comparison error:`, compareError);
            return res.status(500).json({
                message:"Error verifying password. Please try again.",
                error: process.env.NODE_ENV === 'development' ? compareError.message : undefined
            })
        }
        
        if(!isMatch){
            console.log(`[Login] Incorrect password for: ${email}`);
            return res.status(400).json({message:"Incorrect password"})
        }
        
        // Update last login
        user.lastLoginAt = new Date();
        await user.save();
        
        // Generate token
        let token = await genToken(user._id)
        
        // Cookie settings - use secure in production
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie("token",token,{
            httpOnly:true,
            secure: isProduction, // Use secure cookies in production (HTTPS only)
            sameSite: isProduction ? "None" : "Lax", // None for cross-site in production, Lax for development
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: isProduction ? undefined : undefined // Let browser set domain automatically
        })
        
        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;
        
        console.log(`[Login] Login successful for: ${email}, Role: ${user.role}`);
        return res.status(200).json(userResponse)

    } catch (error) {
        console.error("[Login] Login error:", error);
        console.error("[Login] Error stack:", error.stack);
        console.error("[Login] Error details:", {
            message: error.message,
            name: error.name,
            email: req.body?.email
        });
        return res.status(500).json({
            message: `Login error: ${error.message || 'Internal server error'}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
}




export const logOut = async(req,res)=>{
    try {
        await res.clearCookie("token")
        return res.status(200).json({message:"logOut Successfully"})
    } catch (error) {
        return res.status(500).json({message:`logout Error ${error}`})
    }
}


export const googleSignup = async (req,res) => {
    try {
        const {name , email , role, photoUrl, class: studentClass, subject} = req.body
        
        if (!email) {
            return res.status(400).json({message:"Email is required"})
        }
        
        let user = await User.findOne({email})
        
        if(!user){
            // New user - create with role from signup or default to student
            const userRole = role || "student"
            
            // Validate class for students
            if(userRole === "student" && !studentClass){
                return res.status(400).json({message:"Class/Grade is mandatory for students. Please select 9th, 10th, 11th, 12th, or NEET Dropper"})
            }
            
            user = await User.create({
                name: name || "User",
                email,
                role: userRole,
                photoUrl: photoUrl || "",
                class: userRole === "student" ? studentClass : "",
                subject: userRole === "student" ? (subject || "") : "",
                status: "approved", // Auto-approve Google signups
                createdByAdmin: false
            })
        } else {
            // Existing user - update last login and photo if provided
            user.lastLoginAt = new Date()
            if (photoUrl && !user.photoUrl) {
                user.photoUrl = photoUrl
            }
            if (name && user.name !== name) {
                user.name = name
            }
            await user.save()
        }
        
        // Check account status
        if(user.status === "pending"){
            return res.status(403).json({message:"Account pending approval by admin"})
        }
        if(user.status === "rejected"){
            return res.status(403).json({message:"Account rejected by admin"})
        }
        
        let token = await genToken(user._id)
        res.cookie("token",token,{
            httpOnly:true,
            secure:false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        
        // Return user without password
        const userResponse = user.toObject()
        delete userResponse.password
        return res.status(200).json(userResponse)

    } catch (error) {
        console.error("Google signup error:", error)
        return res.status(500).json({message:`Google signup error: ${error.message}`})
    }
}

export const sendOtp = async (req,res) => {
    try {
        const {email} = req.body
        if(!email){
            return res.status(400).json({message:"Email is required"})
        }
        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString()

        user.resetOtp=otp,
        user.otpExpires=Date.now() + 5*60*1000,
        user.isOtpVerifed= false 

        await user.save()
        try {
            await sendMail(email,otp)
            return res.status(200).json({message:"OTP sent successfully to your email"})
        } catch (mailError) {
            console.error("Email send error:", mailError);
            return res.status(500).json({message:"Failed to send email. Please check your email configuration or try again later."})
        }
    } catch (error) {
        console.error("Send OTP error:", error);
        return res.status(500).json({message:`Send OTP error: ${error.message}`})
    }
}

export const verifyOtp = async (req,res) => {
    try {
        const {email,otp} = req.body
        if(!email || !otp){
            return res.status(400).json({message:"Email and OTP are required"})
        }
        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        if(!user.resetOtp){
            return res.status(400).json({message:"No OTP found. Please request a new OTP."})
        }
        if(user.resetOtp !== otp){
            return res.status(400).json({message:"Invalid OTP. Please check and try again."})
        }
        if(user.otpExpires < Date.now()){
            return res.status(400).json({message:"OTP has expired. Please request a new OTP."})
        }
        user.isOtpVerifed=true
        // Keep OTP until password is reset
        await user.save()
        return res.status(200).json({message:"OTP verified successfully. You can now reset your password."})


    } catch (error) {
        console.error("Verify OTP error:", error);
        return res.status(500).json({message:`Verify OTP error: ${error.message}`})
    }
}

export const resetPassword = async (req,res) => {
    try {
        const {email ,password } =  req.body
        if(!email || !password){
            return res.status(400).json({message:"Email and password are required"})
        }
        if(password.length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters"})
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({email: normalizedEmail})
        
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        
        // Allow password reset if OTP verified OR if user has no password (first time setup)
        const hasNoPassword = !user.password || user.password.trim() === '';
        
        if(!hasNoPassword && !user.isOtpVerifed){
            return res.status(400).json({message:"OTP verification required. Please verify OTP first."})
        }

        console.log(`[ResetPassword] Setting password for: ${normalizedEmail}, HasNoPassword: ${hasNoPassword}, OTPVerified: ${user.isOtpVerifed}`);

        const hashPassword = await bcrypt.hash(password,10)
        user.password = hashPassword
        user.isOtpVerifed=false
        user.resetOtp=undefined
        user.otpExpires=undefined
        await user.save()
        
        console.log(`[ResetPassword] Password reset successfully for: ${normalizedEmail}`);
        return res.status(200).json({message:"Password Reset Successfully"})
    } catch (error) {
        console.error("[ResetPassword] Reset password error:", error);
        return res.status(500).json({message:`Reset Password error: ${error.message}`})
    }
}