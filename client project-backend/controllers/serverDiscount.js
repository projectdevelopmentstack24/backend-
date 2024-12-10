import { ServerDiscountModel } from "../models/serverDiscount.js";

const addDiscount = async (req, res) => {
  try {
    const { server, discount } = req.body;

    if (server === undefined || server === null) {
      return res.status(400).json({ error: "Server number is required." });
    }
    if (discount === undefined || isNaN(parseFloat(discount))) {
      return res
        .status(400)
        .json({ error: "Discount must be a valid number." });
    }

    const discountValue = parseFloat(discount);

    let existingServer = await ServerDiscountModel.findOne({ server });

    if (existingServer) {
      existingServer.discount = discountValue;
      await existingServer.save();
      return res
        .status(200)
        .json({ message: "Discount updated successfully." });
    } else {
      const newServerDiscount = new ServerDiscountModel({
        server,
        discount: discountValue,
      });
      await newServerDiscount.save();
      return res.status(201).json({ message: "Discount added successfully." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getDiscount = async (req, res) => {
  try {
    const serverDiscounts = await ServerDiscountModel.find();
    res.status(200).json(serverDiscounts);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const { server } = req.query;

    if (!server) {
      return res.status(400).json({ error: "Server number is required." });
    }

    const deletedServerDiscount = await ServerDiscountModel.findOneAndDelete({
      server,
    });
    if (!deletedServerDiscount) {
      return res.status(404).json({ error: "Server discount not found." });
    }

    res.status(200).json({ message: "Server discount deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { addDiscount, getDiscount, deleteDiscount };
