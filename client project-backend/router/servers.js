import { Router } from "express";
import {
  addserver,
  addTokenForServer9,
  deleteserver,
  getserver,
  getserverzero,
  getTokenForServer9,
  maintainanceServer,
  updateExchangeRateAndMargin,
} from "../controllers/servers.js";

const app = Router();

app.post("/add-server", addserver);
app.get("/get-server", getserver);
app.delete("/delete-server", deleteserver);
app.post("/maintainance-server", maintainanceServer);
app.get("/maintainance-check", getserverzero);
app.post("/add-token-server9", addTokenForServer9);
app.get("/get-token-server9", getTokenForServer9);
app.post("/add-exhange-rate-margin-server", updateExchangeRateAndMargin);

export default app;
