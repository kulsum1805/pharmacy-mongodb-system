const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
  medicineName: { type: String, required: true },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  items: { type: [saleItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ["Cash", "Card", "UPI"], default: "Cash" },
  customerName: { type: String, trim: true, default: "Walk-in customer" }
}, { timestamps: true });

saleSchema.index({ createdAt: -1 });
const Sale = mongoose.model("Sale", saleSchema);
module.exports = { Sale };
