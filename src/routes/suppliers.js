const express = require("express");
const { Supplier } = require("../models/Supplier");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try { res.json(await Supplier.find().sort({ name: 1 })); }
  catch (err) { next(err); }
});
router.post("/", async (req, res, next) => {
  try { res.status(201).json(await Supplier.create(req.body)); }
  catch (err) { next(err); }
});
module.exports = router;
