import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    recharge_type: {
      type: String,
      required: true,
    },
    api_key: {
      type: String,
    },
    maintainance: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const RechargeApiModel =
  mongoose.models.RechargeApiModel || mongoose.model("recharge-api", schema);

export { RechargeApiModel };
