import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: String,
  lowestPrice: String, // New field added
  service_code: String, // New field added
  servers: [
    {
      serverNumber: Number,
      price: String,
      code: String,
      serviceName: String,
      block: { type: Boolean, default: false },
      otpText: Boolean,
    },
  ],
});

export const ServerList =
  mongoose.models.ServerList || mongoose.model("ServerList", schema);
