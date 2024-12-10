import { Router } from "express";
import {
  getRechargeHistory,
  getTransactionHistory,
  saveRechargeHistory,
  transactionCount,
} from "../controllers/History.js";

const app = Router();

app.get("/recharge-history", getRechargeHistory);
app.get("/transaction-history", getTransactionHistory);
app.post("/save-recharge-history", saveRechargeHistory);
app.get("/transaction-history-count", transactionCount);

export default app;
