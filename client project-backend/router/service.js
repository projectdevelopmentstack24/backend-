import { Router } from "express";
import {
  getNumber,
  getOtp,
  numberCancel,
  otpCheck,
} from "../controllers/service.js";

const app = Router();

app.get("/get-number", getNumber);
app.get("/get-otp", getOtp);
app.get("/number-cancel", numberCancel);
app.get("/check-otp", otpCheck);

export default app;
