import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  service: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  server: {
    type: Number,
    required: true,
  },
  numberId: {
    type: String,
    required: true,
  },
  number: {
    type: String,
    required: true,
  },
  orderTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expirationTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["ACTIVE", "EXPIRED"],
    default: "ACTIVE",
  },
});

export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
