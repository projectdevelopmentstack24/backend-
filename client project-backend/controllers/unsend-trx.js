import { UnsendTrx } from "../models/unsend-trx.js";

export const getAllUnsendTrx = async (req, res) => {
  try {
    const allUnsendTrx = await UnsendTrx.find({});
    return res.status(200).json({ data: allUnsendTrx });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const deleteUnsendTrx = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "ID is required." });
    }

    const deletedEntry = await UnsendTrx.findByIdAndDelete(id);

    if (!deletedEntry) {
      return res.status(404).json({ error: "Document not found." });
    }

    return res.status(200).json({ message: "Document deleted successfully." });
  } catch (error) {
    console.error("Error deleting data:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
