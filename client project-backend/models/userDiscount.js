import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    server: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const userDiscountModel =
  mongoose.models.userDiscountModel || mongoose.model("user-discount", schema);
