import { ServiceDiscount } from "../models/serviceDiscount.js";

const addServiceDiscount = async (req, res) => {
  try {
    const { service, server, discount } = req.body;

    console.log(server, service, discount);

    if (!service) {
      return res.status(400).json({ error: "Service is required." });
    }
    if (!server) {
      return res.status(400).json({ error: "Server is required." });
    }
    if (discount === undefined || isNaN(parseFloat(discount))) {
      return res
        .status(400)
        .json({ error: "Discount must be a valid number." });
    }

    const discountValue = parseFloat(discount);

    let existingService = await ServiceDiscount.findOne({ server, service });

    if (existingService) {
      existingService.discount = discountValue;
      await existingService.save();
      return res
        .status(200)
        .json({ message: "Discount updated successfully." });
    } else {
      const newServiceDiscount = new ServiceDiscount({
        service,
        server,
        discount: discountValue,
      });
      await newServiceDiscount.save();
      return res.status(201).json({ message: "Discount added successfully." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getServiceDiscount = async (req, res) => {
  try {
    const serviceDiscounts = await ServiceDiscount.find();
    res.status(200).json(serviceDiscounts);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteServiceDiscount = async (req, res) => {
  try {
    const { service, server } = req.query;

    if (!service || !server) {
      return res
        .status(400)
        .json({ error: "Service and server are required." });
    }

    const deletedServiceDiscount = await ServiceDiscount.findOneAndDelete({
      service,
      server,
    });
    if (!deletedServiceDiscount) {
      return res.status(404).json({ error: "Service discount not found." });
    }

    res.status(200).json({ message: "Service discount deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { addServiceDiscount, getServiceDiscount, deleteServiceDiscount };
