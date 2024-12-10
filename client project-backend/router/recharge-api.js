import { Router } from "express";
import {
  exchangeRate,
  getMaintenanceStatus,
  rechargeTrxApi,
  rechargeUpiApi,
  toggleMaintenance,
} from "../controllers/recharge-api.js";
const app = Router();

app.get("/recharge-upi-transaction", rechargeUpiApi);
app.get("/recharge-trx-transaction", rechargeTrxApi);
app.get("/exchange-rate", exchangeRate);
app.post("/recharge-maintenance-toggle", toggleMaintenance);
app.get("/get-recharge-maintenance", getMaintenanceStatus);

export default app;
