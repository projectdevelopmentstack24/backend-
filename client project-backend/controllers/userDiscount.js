import { UserModel } from "../models/user.js";
import { userDiscountModel } from "../models/userDiscount.js";

const addUserDiscount = async (req, res) => {
  try {
    const { email, service, server, discount } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    if (!service) {
      return res.status(400).json({ error: "Service is required." });
    }
    if (!server) {
      return res.status(400).json({ error: "Server is required." });
    }
    if (discount === undefined || typeof discount !== "number") {
      return res.status(400).json({ error: "Discount must be a number." });
    }

    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const userId = user._id;

    let existingUserDiscount = await userDiscountModel.findOne({
      userId,
      service,
      server,
    });

    if (existingUserDiscount) {
      existingUserDiscount.discount = discount;
      await existingUserDiscount.save();
      return res
        .status(200)
        .json({ message: "Discount updated successfully." });
    } else {
      const newUserDiscount = new userDiscountModel({
        userId,
        service,
        server,
        discount,
      });
      await newUserDiscount.save();
      return res.status(201).json({ message: "Discount added successfully." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getUserDiscount = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const userDiscounts = await userDiscountModel
      .find({ userId })
      .populate("userId", "email"); // populate email
    res.status(200).json(userDiscounts);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUserDiscount = async (req, res) => {
  try {
    const { userId, service, server } = req.query;

    if (!userId || !service || !server) {
      return res
        .status(400)
        .json({ error: "User ID, Server and Service are required." });
    }

    const deletedUserDiscount = await userDiscountModel.findOneAndDelete({
      userId,
      service,
      server,
    });
    if (!deletedUserDiscount) {
      return res.status(404).json({ error: "User discount not found." });
    }

    res.status(200).json({ message: "User discount deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllUserDiscounts = async (req, res) => {
  try {
    const allUserDiscounts = await userDiscountModel
      .find()
      .populate("userId", "-password"); // Assuming 'email' is a field in your user model
    res.status(200).json(allUserDiscounts);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export {
  addUserDiscount,
  getUserDiscount,
  deleteUserDiscount,
  getAllUserDiscounts,
};
