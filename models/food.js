const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    description: String,
});

module.exports = mongoose.model("Food", foodSchema);