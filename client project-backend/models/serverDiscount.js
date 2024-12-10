import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    server: {
      type: Number,
      required: true,
      unique: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const ServerDiscountModel =
  mongoose.models.ServerDiscountModel ||
  mongoose.model("server-discount", schema);
