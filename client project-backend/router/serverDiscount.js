import { Router } from "express";
import {
  addDiscount,
  getDiscount,
  deleteDiscount,
} from "../controllers/serverDiscount.js";

const router = Router();

router.post("/server/add-discount", addDiscount);
router.get("/server/get-discount", getDiscount);
router.delete("/server/delete-discount", deleteDiscount);

export default router;
