import { Router } from "express";
import {
  getServersData,
  getServiceData,
  getServiceDataAdmin,
  getTotalUserCount,
  getUserServiceData,
  totalRecharge,
} from "../controllers/getData.js";

const app = Router();

app.get("/get-service-data", getServiceData);
app.get("/get-service", getUserServiceData);
app.get("/get-service-data-admin", getServiceDataAdmin);
app.get("/get-service-data-server", getServersData);
app.get("/total-recharge-balance", totalRecharge);
app.get("/total-user-count", getTotalUserCount);

export default app;
