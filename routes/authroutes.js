const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// REGISTER
router.post("/register", async (req, res) => {
    try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
    return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
    name,
    email,
    password: hashedPassword
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });

} catch (error) {
  console.log(error); // 👈 shows real error in terminal
  res.status(500).json({
    message: "Error registering user",
    error: error.message
  });
}
});

// LOGIN
router.post("/login", async (req, res) => {
try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
    return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
    return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
    { id: user._id },
    "secretkey",
    { expiresIn: "1d" }
    );

    res.json({
    token,
    user: {
        id: user._id,
        name: user.name,
        email: user.email
    }
    });

} catch (error) {
    res.status(500).json({ message: "Login error" });
}
});

module.exports = router;