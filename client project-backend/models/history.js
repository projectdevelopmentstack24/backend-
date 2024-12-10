import mongoose from "mongoose";

const rechargeHistorySchema = new mongoose.Schema({
  userId: String,
  transaction_id: String,
  amount: String,
  payment_type: String,
  date_time: String,
  status: String,
});

export const rechargeHistory =
  mongoose.models.rechargeHistory ||
  mongoose.model("rechargeHistory", rechargeHistorySchema);

const transactionHistorySchema = new mongoose.Schema({
  userId: String,
  id: String,
  number: String,
  otp: String,
  date_time: String,
  service: String,
  server: String,
  price: String,
  status: String,
});

export const transactionHistory =
  mongoose.models.transactionHistory ||
  mongoose.model("transactionHistory", transactionHistorySchema);
