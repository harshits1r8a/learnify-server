import { Router } from "express";

import { changePassword, forgotPassword, getProfile, login, logout, register,resetPassword, updateUser } from "../controllers/user.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const userRouter = Router()

userRouter.post('/register', upload.single('avatar'), register)
userRouter.post('/login', login)
userRouter.get('/logout', logout)
userRouter.get('/me',isLoggedIn, getProfile)
userRouter.post('/forgotpassword', forgotPassword)
userRouter.post('/resetpassword/:resetToken', resetPassword)
userRouter.post('/changepassword', isLoggedIn, changePassword)
userRouter.put('/update', isLoggedIn, upload.single("avatar"), updateUser)

export default userRouter