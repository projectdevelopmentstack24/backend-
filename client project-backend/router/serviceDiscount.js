import { Router } from "express";
import {
  addServiceDiscount,
  getServiceDiscount,
  deleteServiceDiscount,
} from "../controllers/serviceDiscount.js";

const app = Router();

app.post("/service/add-discount", addServiceDiscount);
app.get("/service/get-discount", getServiceDiscount);
app.delete("/service/delete-discount", deleteServiceDiscount);

export default app;
