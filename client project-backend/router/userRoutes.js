import express from "express"
import {signin, verifyEmail} from "../controllers/signin.js"
import login from "../controllers/login.js"
const router=express.Router()



router.use("/signin",signin)
router.use('/login',login)
router.use("/verifyEmail/:token",verifyEmail)
export default router