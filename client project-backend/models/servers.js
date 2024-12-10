import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    server: {
      type: Number,
      required: true,
      unique: true,
    },
    maintainance: {
      type: Boolean,
      default: false,
    },
    api_key: {
      type: String,
    },
    token: {
      type: String, // Add the token field
    },
    exchangeRate: {
      type: Number,
      default: 0.0, // Provide a default value if necessary
    },
    margin: {
      type: Number,
      default: 0.0, // Provide a default value if necessary
    },
  },
  { timestamps: true }
);

export const ServerModel =
  mongoose.models.ServerModel || mongoose.model("servers", schema);
