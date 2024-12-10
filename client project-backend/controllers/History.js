import { ApiWalletuser } from "../models/apiAndWallet.js";
import { rechargeHistory, transactionHistory } from "./../models/history.js";
import { ServerModel } from "./../models/servers.js";

const getRechargeHistory = async (req, res) => {
  try {
    // Extract email from URL parameters
    const { userId } = req.query;

    const maintainanceServerData = await ServerModel.findOne({ server: 0 });
    if (maintainanceServerData.maintainance) {
      return res.status(403).json({ error: "Site is under maintenance." });
    }

    // Query recharge history data based on the email ID
    const rechargeHistoryData = await rechargeHistory.find(
      { userId },
      "-_id -__v"
    );

    if (!rechargeHistoryData || rechargeHistoryData.length === 0) {
      return res.json({
        message: "No recharge history found for the provided userId",
      });
    }

    res.status(200).json(rechargeHistoryData.reverse());
  } catch (error) {
    console.error("Error fetching recharge history:", error);
    res.status(500).json({ error: "Failed to fetch recharge history" });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    // Extract email from URL parameters
    const { userId } = req.query;

    const maintainanceServerData = await ServerModel.findOne({ server: 0 });
    if (maintainanceServerData.maintainance) {
      return res.status(403).json({ error: "Site is under maintenance." });
    }

    // Query recharge history data based on the email ID
    const transactionHistoryData = await transactionHistory.find(
      { userId },
      "-_id -__v"
    );

    if (!transactionHistoryData || transactionHistoryData.length === 0) {
      return res.json({
        message: "No transaction history found for the provided userId",
      });
    }

    res.status(200).json(transactionHistoryData.reverse());
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({ error: "Failed to fetch transaction history" });
  }
};

const saveRechargeHistory = async (req, res) => {
  try {
    const { userId, transaction_id, amount, payment_type, date_time, status } =
      req.body;

    if (
      !userId ||
      !transaction_id ||
      !amount ||
      !payment_type ||
      !date_time ||
      !status
    ) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Check if the transaction_id already exists
    const existingTransaction = await rechargeHistory.findOne({
      transaction_id,
    });
    if (existingTransaction) {
      return res.status(400).json({ error: "Transaction already done" });
    }

    // Format the amount to two decimal places
    const formattedAmount = parseFloat(parseFloat(amount).toFixed(2));

    if (status === "Received") {
      const api_key_and_wallet = await ApiWalletuser.findOne({ userId });

      api_key_and_wallet.balance += formattedAmount;
      api_key_and_wallet.balance = parseFloat(
        api_key_and_wallet.balance.toFixed(2)
      );
      await api_key_and_wallet.save();
    }

    const rechargeHistoryData = new rechargeHistory({
      userId,
      transaction_id,
      amount: formattedAmount,
      payment_type,
      date_time,
      status,
    });

    await rechargeHistoryData.save();

    res.status(200).json({ message: "Recharge Saved Successfully!" });
  } catch (error) {
    console.error("Error saving recharge:", error);
    res.status(500).json({ error: "Failed to save recharge" });
  }
};

const transactionCount = async (req, res) => {
  try {
    const recentTransactionHistory = await transactionHistory.find();

    const transactionsById = recentTransactionHistory.reduce(
      (acc, transaction) => {
        if (!acc[transaction.id]) {
          acc[transaction.id] = [];
        }
        acc[transaction.id].push(transaction);
        return acc;
      },
      {}
    );

    let successCount = 0;
    let cancelledCount = 0;
    let pendingCount = 0;

    Object.entries(transactionsById).forEach(([id, transactions]) => {
      const hasFinished = transactions.some((txn) => txn.status === "FINISHED");
      const hasCancelled = transactions.some(
        (txn) => txn.status === "CANCELLED"
      );
      const hasOtp = transactions.some((txn) => txn.otp !== null);

      if (hasFinished && hasOtp) {
        successCount++;
      } else if (hasFinished && hasCancelled) {
        cancelledCount++;
      } else if (hasFinished && !hasCancelled && !hasOtp) {
        pendingCount++;
      }
    });

    res.json({ successCount, cancelledCount, pendingCount });
  } catch (error) {
    console.error("Error transaction count:", error);
    res.status(500).json({ error: "Failed to count transaction" });
  }
};

export {
  getRechargeHistory,
  getTransactionHistory,
  saveRechargeHistory,
  transactionCount,
};
