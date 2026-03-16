const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const protect = require("../middleware/authMiddleware");

// Create Order (Protected)
router.post("/", protect, async (req, res) => {
    try {
    const { items, totalAmount } = req.body;

    const newOrder = new Order({
        userId: req.user._id,
        items,
        totalAmount
    });

    await newOrder.save();

    res.json({ message: "Order placed successfully" });

    } catch (error) {
    res.status(500).json({
        message: "Order failed",
        error: error.message
    });
    }
});

// Get Logged-in User Orders
router.get("/myorders", protect, async (req, res) => {
    try {
    const orders = await Order.find({ userId: req.user._id });
    res.json(orders);
} catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
}
});

module.exports = router;