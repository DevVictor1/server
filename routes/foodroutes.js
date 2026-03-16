const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Food = require("../models/food");

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

router.get("/", async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ message: "Database not connected yet" });
  }

  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch foods",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ message: "Database not connected yet" });
  }

  try {
    const newFood = new Food(req.body);
    await newFood.save();
    res.json(newFood);
  } catch (error) {
    res.status(500).json({
      message: "Failed to add food",
      error: error.message,
    });
  }
});

module.exports = router;
