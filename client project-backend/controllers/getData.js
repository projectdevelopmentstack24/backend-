import { ApiWalletuser } from "../models/apiAndWallet.js";
import { rechargeHistory } from "../models/history.js";
import { ServerDiscountModel } from "../models/serverDiscount.js";
import { ServerModel } from "../models/servers.js";
import { ServerList } from "../models/serviceData.js";
import { ServiceDiscount } from "../models/serviceDiscount.js";
import { UserModel } from "../models/user.js";
import { userDiscountModel } from "../models/userDiscount.js";

const getServersData = async (req, res) => {
  try {
    const { sname } = req.query;

    if (!sname) {
      return res.status(400).json({ error: "Service name is required." });
    }

    const normalizedSname = sname
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    const data = await ServerList.findOne(
      { name: new RegExp(`^${normalizedSname}$`, "i") },
      "servers lowestPrice -_id"
    );

    if (!data) {
      return res.status(404).json({ error: "Service not found." });
    }

    // Sort the servers array within the data object
    data.servers.sort((a, b) => a.serverNumber - b.serverNumber);

    res.status(200).json(data.servers);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getServiceDataAdmin = async (req, res) => {
  try {
    // Fetch the server list data
    const serverListData = await ServerList.find(
      {},
      "name lowestPrice servers -_id"
    );

    // Fetch the service discount data
    const serviceDiscountData = await ServiceDiscount.find({});

    // Fetch the server discount data
    const serverDiscountData = await ServerDiscountModel.find({});

    // Create a map for quick lookup of service discounts by service name and server number
    const serviceDiscountMap = new Map();
    serviceDiscountData.forEach((discount) => {
      const key = `${discount.service}_${discount.server}`;
      serviceDiscountMap.set(key, discount.discount);
    });

    // Create a map for quick lookup of server discounts by server number
    const serverDiscountMap = new Map();
    serverDiscountData.forEach((discount) => {
      serverDiscountMap.set(discount.server, discount.discount);
    });

    // Sort the data array by service name
    serverListData.sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      return nameA.localeCompare(nameB);
    });

    // Sort the servers array within each document and apply discounts
    serverListData.forEach((service) => {
      service.servers.sort((a, b) => a.serverNumber - b.serverNumber);
      service.servers.forEach((server) => {
        const serviceKey = `${service.name}_${server.serverNumber}`;
        const serverNumber = server.serverNumber;

        // Get service discount if exists
        let discount = serviceDiscountMap.get(serviceKey) || 0;

        // Get server discount if exists
        discount += serverDiscountMap.get(serverNumber) || 0;

        const originalPrice = parseFloat(server.price);
        server.price = (originalPrice + discount).toFixed(2); // Apply total discount and format to 2 decimal places
      });
    });

    res.status(200).json(serverListData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getServiceData = async (req, res) => {
  try {
    const { userId } = req.query;

    const maintainanceServerData = await ServerModel.findOne({ server: 0 });
    if (maintainanceServerData.maintainance) {
      return res.status(403).json({ error: "Site is under maintenance." });
    }

    // Fetch all server maintenance statuses
    const serversInMaintenance = await ServerModel.find(
      { maintainance: true },
      "server -_id"
    );

    // Extract server numbers that are under maintenance
    const maintenanceServerNumbers = serversInMaintenance.map(
      (server) => server.server
    );

    // Fetch the service data from ServerList
    const serviceData = await ServerList.find(
      {},
      "name lowestPrice servers service_code -_id"
    );

    // Fetch the service discount data
    const serviceDiscountData = await ServiceDiscount.find({});

    // Fetch the server discount data
    const serverDiscountData = await ServerDiscountModel.find({});

    // Create a map for quick lookup of service discounts by service name and server number
    const serviceDiscountMap = new Map();
    serviceDiscountData.forEach((discount) => {
      const key = `${discount.service}_${discount.server}`;
      serviceDiscountMap.set(key, discount.discount);
    });

    // Create a map for quick lookup of server discounts by server number
    const serverDiscountMap = new Map();
    serverDiscountData.forEach((discount) => {
      serverDiscountMap.set(discount.server, discount.discount);
    });

    let userDiscountMap = new Map();
    if (userId) {
      // Fetch the user discount data
      const userDiscountData = await userDiscountModel.find({
        userId,
      });

      // Create a map for quick lookup of user discounts by service name and server number
      userDiscountData.forEach((discount) => {
        const key = `${discount.service}_${discount.server}`;
        userDiscountMap.set(key, discount.discount);
      });
    }

    // Filter, sort, and process data
    const filteredData = serviceData.map((service) => {
      return {
        name: service.name,
        lowestPrice: service.lowestPrice,
        servicecode: service.service_code, // Rename service_code to servicecode
        servers: service.servers
          .filter(
            (server) =>
              !server.block &&
              !maintenanceServerNumbers.includes(server.serverNumber)
          )
          .map((server) => {
            // Compute the discount for the server
            const serviceKey = `${service.name}_${server.serverNumber}`;
            const serverNumber = server.serverNumber;

            // Get service discount if exists
            let discount = serviceDiscountMap.get(serviceKey) || 0;

            // Get server discount if exists
            discount += serverDiscountMap.get(serverNumber) || 0;

            // Get user discount if exists
            discount += userDiscountMap.get(serviceKey) || 0;

            // Apply the discount to the server price
            const originalPrice = parseFloat(server.price);
            server.price = (originalPrice + discount).toFixed(2); // Format price to 2 decimal places

            return {
              serverNumber: server.serverNumber,
              price: server.price,
            };
          })
          .sort((a, b) => a.serverNumber - b.serverNumber), // Sort servers by server number
      };
    });

    // Sort the data array by service name
    filteredData.sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });

    res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserServiceData = async (req, res) => {
  try {
    const { userId, api_key } = req.query;

    const apikeyrequest = await ApiWalletuser.findOne({ api_key });

    if (!api_key || !apikeyrequest) {
      return res.status(400).json({ error: "BAD REQUEST" });
    }

    const maintainanceServerData = await ServerModel.findOne({ server: 0 });
    if (maintainanceServerData.maintainance) {
      return res.status(403).json({ error: "Site is under maintenance." });
    }

    // Fetch all server maintenance statuses
    const serversInMaintenance = await ServerModel.find(
      { maintainance: true },
      "server -_id"
    );

    // Extract server numbers that are under maintenance
    const maintenanceServerNumbers = serversInMaintenance.map(
      (server) => server.server
    );

    // Fetch the service data from ServerList
    const serviceData = await ServerList.find(
      {},
      "servers service_code -_id" // Removed name and lowestPrice
    );

    // Fetch the service discount data
    const serviceDiscountData = await ServiceDiscount.find({});

    // Fetch the server discount data
    const serverDiscountData = await ServerDiscountModel.find({});

    // Create a map for quick lookup of service discounts by service name and server number
    const serviceDiscountMap = new Map();
    serviceDiscountData.forEach((discount) => {
      const key = `${discount.service}_${discount.server}`;
      serviceDiscountMap.set(key, discount.discount);
    });

    // Create a map for quick lookup of server discounts by server number
    const serverDiscountMap = new Map();
    serverDiscountData.forEach((discount) => {
      serverDiscountMap.set(discount.server, discount.discount);
    });

    let userDiscountMap = new Map();
    if (userId) {
      // Fetch the user discount data
      const userDiscountData = await userDiscountModel.find({
        userId,
      });

      // Create a map for quick lookup of user discounts by service name and server number
      userDiscountData.forEach((discount) => {
        const key = `${discount.service}_${discount.server}`;
        userDiscountMap.set(key, discount.discount);
      });
    }

    // Filter, sort, and process data
    const filteredData = serviceData
      .map((service) => {
        return {
          servicecode: service.service_code || "", // Ensure service_code is not undefined
          servers: service.servers
            .filter(
              (server) =>
                !server.block &&
                !maintenanceServerNumbers.includes(server.serverNumber)
            )
            .map((server) => {
              // Compute the discount for the server
              const serviceKey = `${service.service_code}_${server.serverNumber}`;
              const serverNumber = server.serverNumber;

              // Get service discount if exists
              let discount = serviceDiscountMap.get(serviceKey) || 0;

              // Get server discount if exists
              discount += serverDiscountMap.get(serverNumber) || 0;

              // Get user discount if exists
              discount += userDiscountMap.get(serviceKey) || 0;

              // Apply the discount to the server price
              const originalPrice = parseFloat(server.price);
              server.price = (originalPrice + discount).toFixed(2); // Format price to 2 decimal places

              return {
                servernumber: server.serverNumber,
                price: server.price,
              };
            })
            .sort((a, b) => a.servernumber - b.servernumber), // Sort servers by server number
        };
      })
      .filter((service) => service.servicecode !== ""); // Filter out any services without a service code

    // Sort the data array by servicecode
    filteredData.sort((a, b) => {
      const codeA = a.servicecode.toUpperCase();
      const codeB = b.servicecode.toUpperCase();
      if (codeA < codeB) {
        return -1;
      }
      if (codeA > codeB) {
        return 1;
      }
      return 0;
    });

    res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const totalRecharge = async (req, res) => {
  try {
    const histories = await rechargeHistory.find();

    const totalAmount = histories.reduce((sum, history) => {
      return sum + parseFloat(history.amount);
    }, 0);

    res.json({
      totalAmount: totalAmount.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recharge history" });
  }
};

const getTotalUserCount = async (req, res) => {
  try {
    // Count the total number of users in the database
    const userCount = await UserModel.countDocuments({});

    // Send the total count as a JSON response
    res.json({ totalUserCount: userCount });
  } catch (error) {
    console.error("Error fetching total user count:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the user count." });
  }
};

export {
  getServersData,
  getServiceDataAdmin,
  getServiceData,
  getUserServiceData,
  totalRecharge,
  getTotalUserCount,
};
