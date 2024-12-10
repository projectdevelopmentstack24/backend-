import { Router } from "express";
import {
  addccpayServiceNameData,
  addNewServiceData,
  blockUnblockService,
  checkDuplicates,
  deleteService,
  mergeDuplicates,
  saveServerDataOnce,
  updateServerPrices,
} from "../controllers/serverData.js";

const app = Router();

app.get("/save-server-data-once", saveServerDataOnce);
app.get("/check-duplicates", checkDuplicates);
app.get("/merge-duplicates", mergeDuplicates);
app.get("/update-server-prices", updateServerPrices);
app.post("/add-new-service-data", addNewServiceData);
app.post("/add-ccpay-service-name-data", addccpayServiceNameData);
app.post("/service-data-block-unblock", blockUnblockService);
app.post("/delete-service", deleteService);

export default app;
