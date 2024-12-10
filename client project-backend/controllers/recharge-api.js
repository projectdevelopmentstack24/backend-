import fetch from "node-fetch";
import moment from "moment";
import { RechargeApiModel } from "../models/rechange-api.js";
import { ApiWalletuser } from "./../models/apiAndWallet.js";
import { UnsendTrx } from "../models/unsend-trx.js";
import { fetchTransactions } from "../lib/t1.js";
import { transferEntireBalance } from "../lib/send.js";
import { ServerModel } from "./../models/servers.js";
import {
  trxRechargeTeleBot,
  upiRechargeTeleBot,
} from "../lib/telegram-recharge.js";
import { getIpDetails } from "../lib/utils.js";

const upiRequestQueue = [];
let isUpiProcessing = false;

const enqueueUpiRequest = (requestHandler) => {
  upiRequestQueue.push(requestHandler);
  processUpiQueue();
};

const processUpiQueue = async () => {
  if (isUpiProcessing || upiRequestQueue.length === 0) return;

  isUpiProcessing = true;
  const currentRequestHandler = upiRequestQueue.shift();
  await currentRequestHandler();
  isUpiProcessing = false;

  if (upiRequestQueue.length > 0) {
    processUpiQueue();
  }
};

export const rechargeUpiApi = (req, res) => {
  enqueueUpiRequest(() => handleUpiRequest(req, res));
};

const handleUpiRequest = async (req, res) => {
  const { transactionId, userId, email } = req.query;

  try {
    const maintainanceServerData = await ServerModel.findOne({ server: 0 });
    if (maintainanceServerData.maintainance) {
      return res.status(403).json({ error: "Site is under maintenance." });
    }

    const rechargeMaintenance = await RechargeApiModel.findOne({
      recharge_type: "upi",
    });

    if (rechargeMaintenance.maintainance) {
      return res
        .status(403)
        .json({ error: "UPI recharge is currently unavailable." });
    }

    const response = await fetch(
      `https://php.paidsms.in/p/upi.php?utr=${transactionId}`
    );

    const data = await response.json();

    if (data.error) {
      return res
        .status(400)
        .json({ error: "Transaction Not Found. Please try again." });
    }

    if (data.amount < 50) {
      res
        .status(404)
        .json({ error: "Minimum amount is less than 50\u20B9, No refund." });
    } else {
      if (data) {
        const formattedDate = moment().format("MM/DD/YYYYThh:mm:ss A");

        const rechargeHistoryResponse = await fetch(
          `${process.env.BASE_URL}/api/save-recharge-history`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              transaction_id: data.txnid,
              amount: data.amount,
              payment_type: "upi",
              date_time: formattedDate,
              status: "Received",
            }),
          }
        );

        if (rechargeHistoryResponse.ok) {
          const ipDetails = await getIpDetails(req);
          // Destructure IP details
          const { city, state, pincode, country, serviceProvider, ip } =
            ipDetails;

          // Pass the destructured IP details to the numberGetDetails function as a multiline string
          const ipDetailsString = `\nCity: ${city}\nState: ${state}\nPincode: ${pincode}\nCountry: ${country}\nService Provider: ${serviceProvider}\nIP: ${ip}`;

          await upiRechargeTeleBot({
            email,
            amount: data.amount,
            trnId: data.txnid,
            userId,
            ip: ipDetailsString,
          });

          res
            .status(200)
            .json({ message: `${data.amount}\u20B9 Added Successfully!` });
        } else {
          const error = await rechargeHistoryResponse.json();
          res
            .status(rechargeHistoryResponse.status)
            .json({ error: error.error });
        }
      } else {
        res
          .status(400)
          .json({ error: "Transaction Not Found. Please try again." });
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const trxRequestQueue = [];
let isTrxProcessing = false;

const enqueueTrxRequest = (requestHandler) => {
  trxRequestQueue.push(requestHandler);
  processTrxQueue();
};

const processTrxQueue = async () => {
  if (isTrxProcessing || trxRequestQueue.length === 0) return;

  isTrxProcessing = true;
  const currentRequestHandler = trxRequestQueue.shift();
  await currentRequestHandler();
  isTrxProcessing = false;

  if (trxRequestQueue.length > 0) {
    processTrxQueue();
  }
};

export const rechargeTrxApi = (req, res) => {
  enqueueTrxRequest(() => handleTrxRequest(req, res));
};

const handleTrxRequest = async (req, res) => {
  try {
    const { address, hash, userId, exchangeRate, email } = req.query;

    const maintainanceServerData = await ServerModel.findOne({ server: 0 });
    if (maintainanceServerData.maintainance) {
      return res.status(403).json({ error: "Site is under maintenance." });
    }

    const rechargeMaintenance = await RechargeApiModel.findOne({
      recharge_type: "trx",
    });

    if (rechargeMaintenance.maintainance) {
      return res
        .status(403)
        .json({ error: "TRX recharge is currently unavailable." });
    }

    // Check for private key
    const userPrivateKey = await ApiWalletuser.findOne({ userId });
    if (!userPrivateKey) {
      return res.status(500).json({ message: "Internal Server Error." });
    }

    // Fetch transaction data
    const data = await fetchTransactions(address, hash);

    if (data.trx > 0) {
      const price = data.trx * exchangeRate;
      const formattedDate = moment().format("MM/DD/YYYYThh:mm:ss A");

      // Prepare recharge payload
      const rechargePayload = {
        userId,
        transaction_id: hash,
        amount: price,
        payment_type: "trx",
        date_time: formattedDate,
        status: "Received",
      };

      // Save recharge history
      const rechargeHistoryResponse = await fetch(
        `${process.env.BASE_URL}/api/save-recharge-history`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rechargePayload),
        }
      );

      if (!rechargeHistoryResponse.ok) {
        const error = await rechargeHistoryResponse.json();
        return res
          .status(rechargeHistoryResponse.status)
          .json({ error: error.error });
      }

      // Get Trx send address
      const trxSendAddress = await RechargeApiModel.findOne({
        recharge_type: "trx",
      });
      if (!trxSendAddress) {
        return res.status(500).json({ message: "Failed to fetch Trx address" });
      }

      // Transfer balance
      const transferReceipt = await transferEntireBalance(
        userPrivateKey.trxPrivateKey,
        trxSendAddress.api_key
      );

      const ipDetails = await getIpDetails(req);
      // Destructure IP details
      const { city, state, pincode, country, serviceProvider, ip } = ipDetails;

      // Pass the destructured IP details to the numberGetDetails function as a multiline string
      const ipDetailsString = `\nCity: ${city}\nState: ${state}\nPincode: ${pincode}\nCountry: ${country}\nService Provider: ${serviceProvider}\nIP: ${ip}`;

      await trxRechargeTeleBot({
        email,
        userId,
        trx: data.trx,
        exchangeRate,
        amount: price,
        address,
        sendTo: trxSendAddress.api_key,
        ip: ipDetailsString,
        hash,
      });

      if (transferReceipt && transferReceipt.result) {
        return res
          .status(200)
          .json({ message: `${price}\u20B9 Added Successfully!` });
      } else {
        const newEntry = new UnsendTrx({
          email,
          trxAddress: address,
          trxPrivateKey: userPrivateKey.trxPrivateKey,
        });
        await newEntry.save();
        return res
          .status(200)
          .json({ message: `${price}\u20B9 Added Successfully!` });
      }
    } else {
      res
        .status(400)
        .json({ error: "Transaction Not Found. Please try again." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const exchangeRate = async (req, res) => {
  try {
    const response = await fetch("https://php.paidsms.in/p/trxprice.php");
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleMaintenance = async (req, res) => {
  const { rechargeType, status } = req.body;

  try {
    const updatedRecord = await RechargeApiModel.findOneAndUpdate(
      { recharge_type: rechargeType },
      { maintainance: status },
      { new: true }
    );

    if (updatedRecord) {
      res.status(200).json({
        message: "Maintenance status updated successfully.",
        data: updatedRecord,
      });
    } else {
      res.status(404).json({ message: "Recharge type not found." });
    }
  } catch (error) {
    console.error("Error updating maintenance status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMaintenanceStatus = async (req, res) => {
  const { rechargeType } = req.query;

  try {
    const record = await RechargeApiModel.findOne({
      recharge_type: rechargeType,
    });

    if (record) {
      res.status(200).json({ maintenance: record.maintainance });
    } else {
      res.status(404).json({ message: "Recharge type not found." });
    }
  } catch (error) {
    console.error("Error fetching maintenance status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
