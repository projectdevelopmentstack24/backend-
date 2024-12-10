import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
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

export const ServiceDiscount =
  mongoose.models.ServiceDiscount || mongoose.model("service-discount", schema);
