const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  genericName: { type: String, trim: true, default: "" },
  batchNumber: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  manufacturer: { type: String, trim: true, default: "" },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
  purchasePrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  reorderLevel: { type: Number, min: 0, default: 10 },
  expiryDate: { type: Date, required: true },
  prescriptionRequired: { type: Boolean, default: false }
}, { timestamps: true });

medicineSchema.index({ name: "text", genericName: "text", batchNumber: "text" });
medicineSchema.index({ expiryDate: 1, quantity: 1 });
const Medicine = mongoose.model("Medicine", medicineSchema);
module.exports = { Medicine };
