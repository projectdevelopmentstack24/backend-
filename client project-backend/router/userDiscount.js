import { Router } from "express";
import {
  addUserDiscount,
  getUserDiscount,
  deleteUserDiscount,
  getAllUserDiscounts,
} from "../controllers/userDiscount.js";

const app = Router();

app.post("/users/add-discount", addUserDiscount);
app.get("/users/get-discount", getUserDiscount);
app.delete("/users/delete-discount", deleteUserDiscount);
app.get("/users/get-all-discounts", getAllUserDiscounts);

export default app;
