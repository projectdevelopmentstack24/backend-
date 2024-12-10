import { Router } from "express";
import { deleteUnsendTrx, getAllUnsendTrx } from "../controllers/unsend-trx.js";

const app = Router();

app.get("/unsend-trx", getAllUnsendTrx);
app.delete("/unsend-trx", deleteUnsendTrx);

export default app;
