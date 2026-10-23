const express = require("express");
const { Medicine } = require("../models/Medicine");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { search = "", category = "", stock = "" } = req.query;
    const filter = {};
    if (search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ name: { $regex: safe, $options: "i" } }, { genericName: { $regex: safe, $options: "i" } }, { batchNumber: { $regex: safe, $options: "i" } }];
    }
    if (category) filter.category = category;
    if (stock === "low") filter.$expr = { $lte: ["$quantity", "$reorderLevel"] };
    if (stock === "expired") filter.expiryDate = { $lt: new Date() };
    const medicines = await Medicine.find(filter).populate("supplier", "name").sort({ createdAt: -1 }).limit(500);
    res.json(medicines);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json(medicine);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!medicine) return res.status(404).json({ message: "Medicine not found." });
    res.json(medicine);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ message: "Medicine not found." });
    res.json({ message: "Medicine deleted." });
  } catch (err) { next(err); }
});

module.exports = router;
