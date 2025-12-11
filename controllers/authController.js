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
        res.cookie("token",token,{
            httpOnly:true,
            secure:false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.status(201).json(user)

    } catch (error) {
        console.log("signUp error")
        return res.status(500).json({message:`signUp Error ${error}`})
    }
}

export const login=async(req,res)=>{
    try {
        let {email,password}= req.body
        let user= await User.findOne({email})
        if(!user){
            return res.status(400).json({message:"user does not exist"})
        }
        if(user.status === "pending"){
            return res.status(403).json({message:"Account pending approval by admin"})
        }
        if(user.status === "rejected"){
            return res.status(403).json({message:"Account rejected by admin"})
        }
        let isMatch =await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.status(400).json({message:"incorrect Password"})
        }
        user.lastLoginAt = new Date();
        await user.save();
        let token =await genToken(user._id)
        res.cookie("token",token,{
            httpOnly:true,
            secure:false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.status(200).json(user)

    } catch (error) {
        console.log("login error")
        return res.status(500).json({message:`login Error ${error}`})
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
        if(password.length < 8){
            return res.status(400).json({message:"Password must be at least 8 characters"})
        }
         const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        if(!user.isOtpVerifed ){
            return res.status(400).json({message:"OTP verification required. Please verify OTP first."})
        }

        const hashPassword = await bcrypt.hash(password,10)
        user.password = hashPassword
        user.isOtpVerifed=false
        user.resetOtp=undefined
        user.otpExpires=undefined
        await user.save()
        return res.status(200).json({message:"Password Reset Successfully"})
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({message:`Reset Password error: ${error.message}`})
    }
}