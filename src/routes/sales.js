const express = require("express");
const mongoose = require("mongoose");
const { Medicine } = require("../models/Medicine");
const { Sale } = require("../models/Sale");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try { res.json(await Sale.find().sort({ createdAt: -1 }).limit(100)); }
  catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  const { items, discount = 0, paymentMethod = "Cash", customerName = "Walk-in customer" } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Add at least one item to the sale." });
  if (!["Cash", "Card", "UPI"].includes(paymentMethod)) return res.status(400).json({ message: "Invalid payment method." });
  if (!Number.isFinite(Number(discount)) || Number(discount) < 0) return res.status(400).json({ message: "Discount must be zero or more." });

  const changed = [];
  try {
    const saleItems = [];
    let subtotal = 0;
    for (const item of items) {
      if (!mongoose.isValidObjectId(item.medicineId) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
        throw Object.assign(new Error("Each sale item needs a valid medicine and positive whole-number quantity."), { status: 400 });
      }
      const medicine = await Medicine.findOneAndUpdate(
        { _id: item.medicineId, quantity: { $gte: Number(item.quantity) }, expiryDate: { $gte: new Date() } },
        { $inc: { quantity: -Number(item.quantity) } },
        { new: true }
      );
      if (!medicine) throw Object.assign(new Error("Insufficient stock, expired medicine, or medicine not found. Sale was not completed."), { status: 409 });
      changed.push({ id: medicine._id, quantity: Number(item.quantity) });
      const lineTotal = Number((medicine.sellingPrice * Number(item.quantity)).toFixed(2));
      subtotal += lineTotal;
      saleItems.push({
        medicine: medicine._id, medicineName: medicine.name, batchNumber: medicine.batchNumber,
        quantity: Number(item.quantity), unitPrice: medicine.sellingPrice, lineTotal
      });
    }
    subtotal = Number(subtotal.toFixed(2));
    const safeDiscount = Number(Number(discount).toFixed(2));
    if (safeDiscount > subtotal) throw Object.assign(new Error("Discount cannot exceed subtotal."), { status: 400 });

    const sale = await Sale.create({
      billNumber: `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      items: saleItems, subtotal, discount: safeDiscount, total: Number((subtotal - safeDiscount).toFixed(2)),
      paymentMethod, customerName
    });
    res.status(201).json(sale);
  } catch (err) {
    // Best-effort stock compensation if a multi-item sale fails midway.
    for (const entry of changed.reverse()) {
      try { await Medicine.updateOne({ _id: entry.id }, { $inc: { quantity: entry.quantity } }); }
      catch (rollbackError) { console.error("Stock compensation failed:", rollbackError.message); }
    }
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

module.exports = router;
