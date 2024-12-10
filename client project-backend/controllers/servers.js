import getServerTwoToken from "../lib/getServertwoToken.js";
import { ServerModel } from "../models/servers.js";

const addserver = async (req, res) => {
  try {
    const { server, api_key } = req.body;

    if (server === undefined || server === null) {
      return res.status(400).json({ error: "Server is required." });
    }

    let existingServer = await ServerModel.findOne({ server });

    if (existingServer) {
      if (api_key !== undefined) {
        existingServer.api_key = api_key;
        await existingServer.save();
        return res
          .status(200)
          .json({ message: "API key updated successfully." });
      }
      return res
        .status(200)
        .json({ message: "Server already exists. No changes made." });
    } else {
      const newServer = new ServerModel({ server, api_key });
      await newServer.save();
      return res.status(201).json({ message: "Server added successfully." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getserver = async (req, res) => {
  try {
    const servers = await ServerModel.find().sort({ server: 1 });
    res.status(200).json(servers);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getserverzero = async (req, res) => {
  try {
    const servers = await ServerModel.findOne({ server: 0 });
    res.status(200).json({ maintainance: servers.maintainance });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteserver = async (req, res) => {
  try {
    const { server } = req.query;
    if (!server) {
      return res.status(400).json({ error: "Server number is required." });
    }

    const deletedServer = await ServerModel.findOneAndDelete({ server });
    if (!deletedServer) {
      return res.status(404).json({ error: "Server not found." });
    }

    res.status(200).json({
      message: "Server deleted successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const maintainanceServer = async (req, res) => {
  try {
    const { server, maintainance } = req.body;

    if (server === undefined) {
      return res.status(400).json({ error: "Server is required." });
    }
    if (typeof maintainance !== "boolean") {
      return res.status(400).json({ error: "Maintainance must be a boolean." });
    }

    const serverQuery = typeof server === "string" ? server : server.toString();

    const existingServer = await ServerModel.findOne({ server: serverQuery });
    if (!existingServer) {
      return res.status(404).json({ error: "Server does not exist." });
    }

    existingServer.maintainance = maintainance;
    await existingServer.save();

    res
      .status(200)
      .json({ message: "Maintenance status updated successfully." });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addTokenForServer9 = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required." });
    }

    const server9 = await ServerModel.findOne({ server: 9 });

    if (!server9) {
      return res.status(404).json({ error: "Server 9 not found." });
    }

    server9.token = token;
    await server9.save();

    await getServerTwoToken();

    res.status(200).json({ message: "Token added successfully." });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get token for server 9
const getTokenForServer9 = async (req, res) => {
  try {
    const server9 = await ServerModel.findOne({ server: 9 });

    if (!server9) {
      return res.status(404).json({ error: "Server 9 not found." });
    }

    res.status(200).json({ token: server9.token });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateExchangeRateAndMargin = async (req, res) => {
  try {
    const { server, exchangeRate, margin } = req.body;

    if (!server) {
      return res.status(400).json({ error: "Server is required." });
    }

    const existingServer = await ServerModel.findOne({ server });

    if (!existingServer) {
      return res.status(404).json({ error: "Server not found." });
    }

    let updated = false;

    // Update exchange rate if provided
    if (exchangeRate !== undefined) {
      existingServer.exchangeRate = exchangeRate;
      updated = true;
    }

    // Update margin if provided
    if (margin !== undefined) {
      existingServer.margin = margin;
      updated = true;
    }

    // If no updates were made, return early
    if (!updated) {
      return res.status(400).json({ error: "No valid data to update." });
    }

    await existingServer.save();

    res.status(200).json({
      message: "Exchange rate and/or margin updated successfully.",
      exchangeRate: existingServer.exchangeRate,
      margin: existingServer.margin,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export {
  addserver,
  getserver,
  deleteserver,
  maintainanceServer,
  getserverzero,
  addTokenForServer9,
  getTokenForServer9,
  updateExchangeRateAndMargin,
};
