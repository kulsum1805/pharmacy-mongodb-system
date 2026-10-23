require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const medicineRoutes = require("./src/routes/medicines");
const supplierRoutes = require("./src/routes/suppliers");
const saleRoutes = require("./src/routes/sales");
const { Medicine } = require("./src/models/Medicine");
const { Sale } = require("./src/models/Sale");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.get("/api/dashboard", async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    soon.setHours(23, 59, 59, 999);

    const [medicineCount, lowStockCount, expiredCount, expiringSoonCount, inventory, salesToday] =
      await Promise.all([
        Medicine.countDocuments(),
        Medicine.countDocuments({ $expr: { $lte: ["$quantity", "$reorderLevel"] } }),
        Medicine.countDocuments({ expiryDate: { $lt: today } }),
        Medicine.countDocuments({ expiryDate: { $gte: today, $lte: soon } }),
        Medicine.aggregate([
          { $group: { _id: null, stockValue: { $sum: { $multiply: ["$quantity", "$purchasePrice"] } }, units: { $sum: "$quantity" } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, revenue: { $sum: "$total" }, bills: { $sum: 1 } } }
        ])
      ]);

    res.json({
      medicineCount, lowStockCount, expiredCount, expiringSoonCount,
      stockValue: inventory[0]?.stockValue || 0,
      unitsInStock: inventory[0]?.units || 0,
      salesToday: salesToday[0]?.revenue || 0,
      billsToday: salesToday[0]?.bills || 0
    });
  } catch (err) { next(err); }
});

app.use("/api/medicines", medicineRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/sales", saleRoutes);

app.get("/api/reports/category-stock", async (req, res, next) => {
  try {
    const rows = await Medicine.aggregate([
      { $group: { _id: "$category", medicineCount: { $sum: 1 }, units: { $sum: "$quantity" }, stockValue: { $sum: { $multiply: ["$quantity", "$purchasePrice"] } } } },
      { $sort: { stockValue: -1 } }
    ]);
    res.json(rows);
  } catch (err) { next(err); }
});

app.get("/api/reports/top-selling", async (req, res, next) => {
  try {
    const rows = await Sale.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.medicineName", unitsSold: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } },
      { $sort: { unitsSold: -1 } },
      { $limit: 10 }
    ]);
    res.json(rows);
  } catch (err) { next(err); }
});

app.use((req, res) => res.status(404).json({ message: "API route not found." }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: "A record with that unique value already exists." });
  res.status(500).json({ message: "Server error. Check the terminal for details." });
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pharmacy_management")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Pharmacy app running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
