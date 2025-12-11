import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import { createUserByAdmin, listUsers, updateUserStatus, updateUserPassword } from "../controllers/adminUserController.js";

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(isAuth, isAdmin);

router.get("/users", listUsers);
router.post("/users", createUserByAdmin);
router.patch("/users/:userId/status", updateUserStatus);
router.patch("/users/:userId/password", updateUserPassword);

export default router;

