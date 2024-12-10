import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    api_key: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
    trxAddress: {
      type: String,
    },
    trxPrivateKey: {
      type: String,
    },
  },
  { timestamps: true }
);

export const ApiWalletuser =
  mongoose.models.ApiWalletuser || mongoose.model("apikey_and_balance", schema);
