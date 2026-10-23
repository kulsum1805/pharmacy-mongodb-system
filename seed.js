
require("dotenv").config();

const mongoose = require("mongoose");
const { Medicine } = require("./src/models/Medicine");
const { Supplier } = require("./src/models/Supplier");
const { Sale } = require("./src/models/Sale");

const DATABASE_NAME = "pharmacy_management";

async function seed() {
  try {
    // 1. Check the MongoDB Atlas connection string
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error(
        "MONGODB_URI is missing. Please check your .env file."
      );
    }

    if (!uri.startsWith("mongodb+srv://")) {
      throw new Error(
        "Please use your MongoDB Atlas connection string in .env."
      );
    }

    // 2. Connect explicitly to the correct database
    await mongoose.connect(uri, {
      dbName: DATABASE_NAME,
      serverSelectionTimeoutMS: 15000
    });

    console.log("MongoDB connected successfully!");
    console.log("Database:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);

    if (mongoose.connection.name !== DATABASE_NAME) {
      throw new Error("Connected to the wrong database.");
    }

    // 3. Clear old demo records before inserting fresh data
    console.log("Preparing demo collections...");

    await Promise.all([
      Medicine.deleteMany({}),
      Supplier.deleteMany({}),
      Sale.deleteMany({})
    ]);

    // 4. Insert suppliers
    const suppliers = await Supplier.insertMany([
      {
        name: "HealthPlus Distributors",
        contactPerson: "Ravi Kumar",
        phone: "9876543210",
        email: "orders@example.com",
        address: "Bengaluru, Karnataka"
      },
      {
        name: "MediCare Wholesale",
        contactPerson: "Asha Rao",
        phone: "9123456780",
        email: "sales@example.com",
        address: "Mysuru, Karnataka"
      }
    ]);

    // 5. Generate expiry dates relative to today
    const daysFromToday = (days) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };

    // 6. Insert sample medicines
    const medicines = await Medicine.insertMany([
      {
        name: "Paracetamol 500mg",
        genericName: "Paracetamol",
        batchNumber: "PCM-2026-A1",
        category: "Pain Relief",
        manufacturer: "Demo Pharma",
        supplier: suppliers[0]._id,
        purchasePrice: 1.5,
        sellingPrice: 2,
        quantity: 150,
        reorderLevel: 20,
        expiryDate: daysFromToday(300),
        prescriptionRequired: false
      },
      {
        name: "Cetirizine 10mg",
        genericName: "Cetirizine",
        batchNumber: "CTZ-2026-B2",
        category: "Allergy",
        manufacturer: "Demo Pharma",
        supplier: suppliers[0]._id,
        purchasePrice: 2,
        sellingPrice: 3,
        quantity: 8,
        reorderLevel: 10,
        expiryDate: daysFromToday(240),
        prescriptionRequired: false
      },
      {
        name: "Vitamin C 500mg",
        genericName: "Ascorbic acid",
        batchNumber: "VTC-2026-C3",
        category: "Vitamins",
        manufacturer: "Wellness Labs",
        supplier: suppliers[1]._id,
        purchasePrice: 3,
        sellingPrice: 5,
        quantity: 75,
        reorderLevel: 15,
        expiryDate: daysFromToday(18),
        prescriptionRequired: false
      },
      {
        name: "Amoxicillin 250mg",
        genericName: "Amoxicillin",
        batchNumber: "AMX-2026-D4",
        category: "Antibiotic",
        manufacturer: "Demo Pharma",
        supplier: suppliers[1]._id,
        purchasePrice: 4,
        sellingPrice: 6,
        quantity: 40,
        reorderLevel: 10,
        expiryDate: daysFromToday(180),
        prescriptionRequired: true
      }
    ]);

    // 7. Verify that the records were inserted
    const medicineCount = await Medicine.countDocuments();
    const supplierCount = await Supplier.countDocuments();
    const saleCount = await Sale.countDocuments();

    console.log("\nSeed completed successfully!");
    console.log("Medicines inserted:", medicines.length);
    console.log("Suppliers inserted:", suppliers.length);
    console.log("Medicines in database:", medicineCount);
    console.log("Suppliers in database:", supplierCount);
    console.log("Sales in database:", saleCount);

    if (medicineCount !== 4 || supplierCount !== 2) {
      throw new Error("The inserted record counts do not match.");
    }

    console.log(
      "\nOpen MongoDB Atlas Data Explorer to view your records."
    );
  } catch (error) {
    console.error("\nSeed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log("MongoDB connection closed.");
  }
}

seed();
