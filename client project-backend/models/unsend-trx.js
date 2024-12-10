import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    trxAddress: {
      type: String,
      required: true,
    },
    trxPrivateKey: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const UnsendTrx =
  mongoose.models.UnsendTrx || mongoose.model("unsend-trx", schema);
