import fetch from "node-fetch";
import { stringSimilarity } from "string-similarity-js";
import fs from "fs"; // Use fs.promises for async file operations
import { ServerList } from "../models/serviceData.js";
import { ServerModel } from "../models/servers.js";

const urls = [
  "https://php.paidsms.in/p/fastsms.txt",
  "https://php.paidsms.in/p/5sim.txt",
  "https://php.paidsms.in/p/smshub.txt",
  "https://php.paidsms.in/p/tigersms.txt",
  "https://php.paidsms.in/p/grizzlysms.txt",
  "https://php.paidsms.in/p/tempnumber.txt",
  "https://php.paidsms.in/p/smsmansingle.txt",
  "https://php.paidsms.in/p/smsmanmulti.txt",
  "https://php.paidsms.in/p/cpay.txt",
];

// Define a mapping of URLs to their respective calculation functions
const priceCalculations = {
  "https://php.paidsms.in/p/fastsms.txt": (price) =>
    (price * 1.3 + 1).toFixed(2),
  "https://php.paidsms.in/p/5sim.txt": (price) => (price * 1.3 + 1).toFixed(2),
  "https://php.paidsms.in/p/smshub.txt": (price) => (price * 95 + 1).toFixed(2),
  "https://php.paidsms.in/p/tigersms.txt": (price) =>
    (price * 1.3 + 1).toFixed(2),
  "https://php.paidsms.in/p/grizzlysms.txt": (price) =>
    (price * 1.3 + 1).toFixed(2),
  "https://php.paidsms.in/p/tempnumber.txt": (price) =>
    (price * 1.3 + 1).toFixed(2),
  "https://php.paidsms.in/p/smsmansingle.txt": (price) =>
    (price * 1.3 + 1).toFixed(2),
  "https://php.paidsms.in/p/smsmanmulti.txt": (price) =>
    (price * 1.3 + 1).toFixed(2),
  "https://php.paidsms.in/p/cpay.txt": (price) => (price * 95 + 1).toFixed(2),
};

const getServerNumberFromUrl = (url) => {
  const urlToServerMap = {
    "https://php.paidsms.in/p/fastsms.txt": 1,
    "https://php.paidsms.in/p/5sim.txt": 2,
    "https://php.paidsms.in/p/smshub.txt": 3,
    "https://php.paidsms.in/p/tigersms.txt": 4,
    "https://php.paidsms.in/p/grizzlysms.txt": 5,
    "https://php.paidsms.in/p/tempnumber.txt": 6,
    "https://php.paidsms.in/p/smsmansingle.txt": 7,
    "https://php.paidsms.in/p/smsmanmulti.txt": 8,
    "https://php.paidsms.in/p/cpay.txt": 9,
  };

  return urlToServerMap[url];
};

const fetchDataWithRetry = async (url, delay = 1000) => {
  let attempts = 0;
  let data = null;

  while (true) {
    attempts += 1;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data = await response.json();

      if (data && data.length > 0) {
        console.log(`Data fetched successfully from ${url}`);
        return data;
      } else {
        console.warn(`No data found at ${url}`);
      }
    } catch (error) {
      console.error(
        `Error fetching data from ${url} (attempt ${attempts}):`,
        error.message
      );
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
};

const normalizeName = (name) => {
  if (typeof name === "string") {
    return name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
  } else {
    return ""; // Return an empty string if name is not a string
  }
};

const findExistingItem = async (name) => {
  const allItems = await ServerList.find();
  const normalizedName = normalizeName(name);
  let bestMatch = null;
  let highestSimilarity = 0;

  allItems.forEach((item) => {
    const similarity = stringSimilarity(
      normalizedName,
      normalizeName(item.name)
    );
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = item;
    }
  });

  return { item: bestMatch, similarity: highestSimilarity }; // Return both item and similarity
};

const pricesAreEqual = (price1, price2, tolerance = 1e-6) => {
  return Math.abs(price1 - price2) < tolerance;
};

const calculateLowestPrice = (servers) => {
  let lowest = Number.MAX_VALUE;

  servers.forEach((server) => {
    const price = parseFloat(server.price);
    if (price < lowest) {
      lowest = price;
    }
  });

  return lowest.toFixed(2); // Assuming you want to store prices with two decimal places
};

const calculateLowestPrices = async () => {
  try {
    const serverList = await ServerList.find().exec();
    for (const server of serverList) {
      server.lowestPrice = calculateLowestPrice(server.servers);
      await server.save();
    }
    console.log("Lowest prices updated successfully");
  } catch (error) {
    console.error("Error calculating lowest prices:", error);
  }
};

const calculatePrice = (price) => {
  let multiplier = 95;
  let offset = 1;

  const numericPrice = parseFloat(price);

  // Calculate the new price
  if (isNaN(numericPrice)) {
    console.warn(`Invalid price value: ${price}`);
    return price;
  }

  const calculatedPrice = numericPrice * multiplier + offset;

  return calculatedPrice.toFixed(2); // Return the price with two decimal places
};

const fetchAndDisplayData = async () => {
  try {
    console.log("Fetching server list data...");
    const serverListData = await ServerList.find({}, "name servers").exec();
    const serviceData = serverListData.map((entry) => ({
      name: entry.name,
      servers: entry.servers,
    }));

    const validEntries = [];
    const multiObjectNames = [];
    const emptyBusinessTypeListNames = [];

    for (const { name, servers } of serviceData) {
      console.log(`Processing ${name}...`);
      try {
        let url;
        let response;
        let responseData;

        // Check if the service already has server 9 with a service name
        const server9 = servers.find(
          (server) => server.serverNumber === 9 && server.serviceName
        );

        if (server9) {
          // If server 9 exists, use the service name to fetch updated code and price
          url = `https://php.paidsms.in/p/ccpay.php?type=ccpay&name=${encodeURIComponent(
            server9.serviceName
          )}`;
          response = await fetch(url);
          responseData = await response.json();

          if (
            responseData.businessTypeList &&
            responseData.businessTypeList.length > 0
          ) {
            const { businessCode, price } = responseData.businessTypeList[0];
            const calculatedPrice = calculatePrice(price);

            // Update only the code and price, do not change the service name
            server9.price = calculatedPrice.toString();
            server9.code = businessCode.toString();

            await ServerList.updateOne(
              { name },
              { $set: { "servers.$[elem]": server9 } },
              { arrayFilters: [{ "elem.serverNumber": 9 }] }
            );
          } else {
            emptyBusinessTypeListNames.push(name);
          }
        } else {
          // If server 9 does not exist, use the original URL to find and add the service
          url = `https://php.paidsms.in/p/ccpay.php?type=find&name=${encodeURIComponent(
            name
          )}`;
          response = await fetch(url);
          responseData = await response.json();

          if (
            responseData.businessTypeList &&
            responseData.businessTypeList.length > 0
          ) {
            if (responseData.businessTypeList.length > 1) {
              multiObjectNames.push(name);
            }

            const { businessCode, price } = responseData.businessTypeList[0];
            const calculatedPrice = calculatePrice(price);

            // If the entry exists, update it, otherwise, create a new entry
            const existingEntry = await ServerList.findOne({ name });

            if (existingEntry) {
              // Add or update server 9 details
              existingEntry.servers.push({
                serverNumber: 9,
                price: calculatedPrice.toString(),
                code: businessCode.toString(),
                serviceName: name, // Use the original name as serviceName
              });

              await existingEntry.save();
            } else {
              // Create a new entry if it doesn't exist
              const newEntry = new ServerList({
                name,
                servers: [
                  {
                    serverNumber: 9,
                    price: calculatedPrice.toString(),
                    code: businessCode.toString(),
                    serviceName: name, // Use the original name as serviceName
                  },
                ],
              });

              await newEntry.save();
            }
          } else {
            emptyBusinessTypeListNames.push(name);
          }
        }
      } catch (error) {
        console.error(`Error processing ${name}:`, error);
      }
    }

    console.log(`Data from ccpay api saved to the database successfully.`);

    // // Save multiObjectNames to a file if needed
    // await fs.promises.writeFile(
    //   "multiObjectNames.txt",
    //   multiObjectNames.join("\n"),
    //   "utf8"
    // );
    // console.log("multiObjectNames saved to multiObjectNames.txt");

    // // Save emptyBusinessTypeListNames to a file if needed
    // await fs.promises.writeFile(
    //   "emptyBusinessTypeListNames.txt",
    //   emptyBusinessTypeListNames.join("\n"),
    //   "utf8"
    // );
    // console.log(
    //   "emptyBusinessTypeListNames saved to emptyBusinessTypeListNames.txt"
    // );

    // await calculateLowestPrices();
  } catch (error) {
    console.error("Error fetching service data:", error);
  }
};

export const saveServerDataOnce = async (req, res) => {
  // Send a response immediately
  res.json({
    message:
      "Data fetching and saving has started. It will continue in the background.",
  });

  // Run the data processing in the background
  processServerData();
};

const processServerData = async () => {
  try {
    for (const url of urls) {
      const data = await fetchDataWithRetry(url);

      if (!data) {
        console.warn(`Skipping URL due to no data: ${url}`);
        continue; // Skip to the next URL if data fetching failed
      }

      // Fetch server data from the database
      const serverNumber = getServerNumberFromUrl(url);
      const server = await ServerModel.findOne({ server: serverNumber });

      if (!server) {
        console.warn(`No server configuration found for ${url}`);
        continue;
      }

      const exchangeRate = server.exchangeRate || 0.0;
      const margin = server.margin || 0.0;

      const calculatePrice = (price) =>
        (price * exchangeRate + margin).toFixed(2);

      for (const item of data) {
        const adjustedPrice = calculatePrice(parseFloat(item.price));

        const { item: existingItem, similarity } = await findExistingItem(
          item.name
        );

        if (existingItem && similarity > 0.8) {
          const serverIndex = existingItem.servers.findIndex(
            (s) => s.serverNumber === parseInt(item.server)
          );

          if (serverIndex === -1) {
            existingItem.servers.push({
              serverNumber: parseInt(item.server),
              price: adjustedPrice.toString(),
              code: item.code,
            });
          } else {
            if (
              !pricesAreEqual(
                existingItem.servers[serverIndex].price,
                adjustedPrice
              )
            ) {
              existingItem.servers[serverIndex].price =
                adjustedPrice.toString();
              existingItem.servers[serverIndex].code = item.code;
            }
          }
          await existingItem.save();
        } else {
          const newItem = new ServerList({
            name: item.name,
            servers: [
              {
                serverNumber: parseInt(item.server),
                price: adjustedPrice.toString(),
                code: item.code,
              },
            ],
          });
          await newItem.save();
        }
      }
      console.log(`Data from ${url} saved to the database successfully.`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await mergeDuplicates();
    await calculateLowestPrices();

    console.log("Background Data fetched and saved successfully");
  } catch (error) {
    console.error("Error saving server data:", error);
  }
};

const findDuplicates = async (Model) => {
  const documents = await Model.find().exec();
  const nameCounts = {};
  const duplicates = [];

  documents.forEach((doc) => {
    const name = doc.name;
    if (nameCounts[name]) {
      nameCounts[name]++;
    } else {
      nameCounts[name] = 1;
    }
  });

  for (const [name, count] of Object.entries(nameCounts)) {
    if (count > 1) {
      duplicates.push({ name, count });
    }
  }

  return duplicates;
};

export const checkDuplicates = async (req, res) => {
  try {
    const serverListDuplicates = await findDuplicates(ServerList);

    res.json({
      serverListDuplicates,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const mergeDuplicates = async () => {
  try {
    const serverListDuplicates = await findDuplicates(ServerList);

    for (const duplicate of serverListDuplicates) {
      const duplicateDocs = await ServerList.find({
        name: duplicate.name,
      }).exec();

      if (duplicateDocs.length > 1) {
        // Merge logic: Choose one as the master and merge others into it
        const masterDoc = duplicateDocs[0];
        const docsToMerge = duplicateDocs.slice(1);

        for (const doc of docsToMerge) {
          // Merge servers
          masterDoc.servers.push(...doc.servers);

          // Remove merged document
          await ServerList.deleteOne({ _id: doc._id });
        }

        // Remove duplicate servers in the masterDoc
        const uniqueServers = Array.from(
          new Set(masterDoc.servers.map((server) => JSON.stringify(server)))
        ).map((server) => JSON.parse(server));
        masterDoc.servers = uniqueServers;

        await masterDoc.save();
      }
    }
    console.log("Duplicates merged successfully");
    await updateServiceCodes(); // Call the function to update service codes
    console.log("serice code added successfully");
  } catch (error) {
    console.error("Error merging duplicates:", error);
  }
};

const updateServiceCodes = async () => {
  try {
    const serverList = await ServerList.find().exec();

    for (const server of serverList) {
      const normalizedCode = normalizeName(server.name);
      server.service_code = normalizedCode;
      await server.save();
    }

    console.log("Service codes updated successfully");
  } catch (error) {
    console.error("Error updating service codes:", error);
  }
};

// New API to update prices based on server list
export const updateServerPrices = async (req, res) => {
  try {
    const serverList = await ServerList.find().exec();

    for (const url of urls) {
      const data = await fetchDataWithRetry(url);

      if (!data) {
        console.warn(`Skipping URL due to no data: ${url}`);
        continue; // Skip to the next URL if data fetching failed
      }

      const calculatePrice = priceCalculations[url] || ((price) => price);

      for (const server of serverList) {
        let priceUpdated = false;

        for (const serverData of server.servers) {
          const matchedItem = data.find((item) => {
            return (
              normalizeName(item.name) === normalizeName(server.name) &&
              parseInt(item.server) === serverData.serverNumber
            );
          });

          if (matchedItem) {
            const adjustedPrice = calculatePrice(parseFloat(matchedItem.price));

            if (!pricesAreEqual(adjustedPrice, serverData.price)) {
              serverData.price = adjustedPrice.toString();
              priceUpdated = true;
            }
          }
        }

        if (priceUpdated) {
          await server.save();
        }
      }
      console.log(`Data from ${url} processed successfully`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay between URL fetches
    }

    // Update prices for server 9 using the ccpay URL
    for (const server of serverList) {
      const server9 = server.servers.find((s) => s.serverNumber === 9);

      if (server9 && server9.serviceName) {
        const ccpayUrl = `https://php.paidsms.in/p/?server=ccpay&name=${encodeURIComponent(
          server9.serviceName
        )}`;
        try {
          console.log(`Fetching data from ${ccpayUrl}`);
          const response = await fetch(ccpayUrl);
          const ccpayData = await response.json();
          console.log(`Response from ${ccpayUrl}:`, ccpayData);

          if (ccpayData && ccpayData.price) {
            const calculatedPrice = calculatePrice(ccpayData.price);

            if (!pricesAreEqual(calculatedPrice, server9.price)) {
              server9.price = calculatedPrice.toString();
              await server.save();
              console.log(
                `Updated price for ${server9.serviceName} to ${calculatedPrice}`
              );
            } else {
              console.log(
                `Price for ${server9.serviceName} is already up-to-date`
              );
            }
          } else {
            console.warn(
              `No valid data found for ${server9.serviceName} at ${ccpayUrl}`
            );
          }
        } catch (error) {
          console.error(`Error fetching data from ${ccpayUrl}:`, error.message);
        }
      }
    }

    res.json({
      message: "Server prices updated successfully",
    });
  } catch (error) {
    console.error("Error updating server prices:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addNewServiceData = async (req, res) => {
  const { name } = req.body;

  try {
    for (const url of urls) {
      const data = await fetchDataWithRetry(url);

      if (!data) {
        console.warn(`Skipping URL due to no data: ${url}`);
        continue;
      }

      const calculatePrice = priceCalculations[url] || ((price) => price);

      // Find the item in data that matches the specified name
      const matchedItem = data.find(
        (item) => normalizeName(item.name) === normalizeName(name)
      );

      if (matchedItem) {
        const adjustedPrice = calculatePrice(parseFloat(matchedItem.price));

        const { item: existingItem, similarity } = await findExistingItem(name);

        if (existingItem && similarity > 0.8) {
          const serverIndex = existingItem.servers.findIndex(
            (s) => s.serverNumber === parseInt(matchedItem.server)
          );

          if (serverIndex === -1) {
            existingItem.servers.push({
              serverNumber: parseInt(matchedItem.server),
              price: adjustedPrice.toString(),
              code: matchedItem.code,
            });
          } else {
            if (
              !pricesAreEqual(
                existingItem.servers[serverIndex].price,
                adjustedPrice
              )
            ) {
              existingItem.servers[serverIndex].price =
                adjustedPrice.toString();
              existingItem.servers[serverIndex].code = matchedItem.code;
            }
          }
          await existingItem.save();
        } else {
          const newItem = new ServerList({
            name: matchedItem.name,
            servers: [
              {
                serverNumber: parseInt(matchedItem.server),
                price: adjustedPrice.toString(),
                code: matchedItem.code,
              },
            ],
          });
          await newItem.save();
        }

        console.log(
          `Data for ${name} from ${url} saved to the database successfully.`
        );
      } else {
        console.warn(`No data found for ${name} at ${url}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay between URL fetches
    }

    await updateServiceCodes();
    await calculateLowestPrices();

    res.json({
      message: `Data for ${name} added and saved successfully`,
    });
  } catch (error) {
    console.error(`Error adding data for ${name}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// New API for adding/updating service data using CCPAY URL
export const addccpayServiceNameData = async (req, res) => {
  const { name, serviceName } = req.body;

  console.log(name, serviceName);

  try {
    const ccpayUrl = `https://php.paidsms.in/p/ccpay.php?type=ccpay&name=${encodeURIComponent(
      serviceName
    )}`;
    const response = await fetch(ccpayUrl);
    const ccpayData = await response.json();

    if (ccpayData && ccpayData.price && ccpayData.code) {
      // Calculate the price using the same logic
      const calculatedPrice = calculatePrice(ccpayData.price);

      const { item: existingItem, similarity } = await findExistingItem(name);

      if (existingItem && similarity > 0.8) {
        const serverIndex = existingItem.servers.findIndex(
          (s) => s.serverNumber === 9
        );

        if (serverIndex === -1) {
          existingItem.servers.push({
            serverNumber: 9,
            price: calculatedPrice,
            code: ccpayData.code,
            serviceName: serviceName,
          });
        } else {
          existingItem.servers[serverIndex].price = calculatedPrice;
          existingItem.servers[serverIndex].code = ccpayData.code;
          existingItem.servers[serverIndex].serviceName = serviceName;
        }
        await existingItem.save();
      } else {
        const newItem = new ServerList({
          name: name,
          servers: [
            {
              serverNumber: 9,
              price: calculatedPrice,
              code: ccpayData.code,
              serviceName: serviceName,
            },
          ],
        });
        await newItem.save();
      }

      console.log(
        `Data for ${name} with serviceName ${serviceName} saved successfully.`
      );
      res.json({
        message: `Data for ${name} with serviceName ${serviceName} saved successfully.`,
      });

      await updateServiceCodes();
      await calculateLowestPrices();
    } else {
      console.warn(`No valid data found for ${serviceName} at ${ccpayUrl}`);
      res
        .status(404)
        .json({ message: `No valid data found for ${serviceName}` });
    }
  } catch (error) {
    console.error(
      `Error adding data for ${name} with serviceName ${serviceName}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

// API to block or unblock a service
export const blockUnblockService = async (req, res) => {
  const { name, serverNumber, block } = req.body;

  try {
    // Find the existing item with the specified name
    const existingItem = await ServerList.findOne({ name });

    if (existingItem) {
      // Find the server within the item
      const server = existingItem.servers.find(
        (s) => s.serverNumber === serverNumber
      );

      if (server) {
        // Update the block status
        server.block = block;
        await existingItem.save();
        res.json({
          message: `Service with name ${name} and server number ${serverNumber} has been ${
            block ? "blocked" : "unblocked"
          }.`,
        });
      } else {
        res.status(404).json({
          message: `Server number ${serverNumber} not found for service with name ${name}.`,
        });
      }
    } else {
      res.status(404).json({
        message: `Service with name ${name} not found.`,
      });
    }
  } catch (error) {
    console.error(`Error updating block status for ${name}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// API to delete a service by name
export const deleteService = async (req, res) => {
  const { name } = req.body;

  try {
    // Find and delete the service with the specified name
    const result = await ServerList.findOneAndDelete({ name });

    if (result) {
      res.json({
        message: `Service ${name} has been deleted successfully.`,
      });
    } else {
      res.status(404).json({
        message: `Service with name ${name} not found.`,
      });
    }
  } catch (error) {
    console.error(`Error deleting service with name ${name}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};
