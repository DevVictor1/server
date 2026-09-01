const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { firebaseAuth } = require("../config/firebaseAdmin");

const normalizeEmail = (email) => email.trim().toLowerCase();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByEmail = (email) =>
  User.findOne({
    email: new RegExp(`^${escapeRegExp(email)}$`, "i"),
  });

const logGoogleAuthError = (stage, error, sensitiveValues = []) => {
  const safeMessage = sensitiveValues.reduce(
    (message, value) =>
      typeof value === "string" && value
        ? message.split(value).join("[redacted]")
        : message,
    error?.message || "No error message"
  );

  console.error(
    "Google auth error:",
    stage,
    error?.code || error?.name || "none",
    safeMessage
  );
};

const createAppToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });

const buildAuthResponse = (user) => ({
  token: createAppToken(user._id),
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
  },
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error registering user",
      error: error.message,
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = await findUserByEmail(normalizeEmail(email));
    if (!user)
      return res.status(400).json({ message: "User not found" });

    if (!user.password)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    res.json(buildAuthResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

// GOOGLE LOGIN
router.post("/google", async (req, res) => {
  const { idToken } = req.body || {};

  if (typeof idToken !== "string" || !idToken.trim()) {
    return res.status(400).json({ message: "Firebase ID token is required" });
  }

  let decodedToken;

  try {
    decodedToken = await firebaseAuth.verifyIdToken(idToken);
  } catch (error) {
    logGoogleAuthError("firebase_verify", error, [idToken]);
    return res.status(401).json({ message: "Invalid Google authentication token" });
  }

  const { uid, email, email_verified: emailVerified, name } = decodedToken;
  const signInProvider = decodedToken.firebase?.sign_in_provider;

  if (
    typeof uid !== "string" ||
    !uid ||
    typeof email !== "string" ||
    !email.trim() ||
    emailVerified !== true ||
    signInProvider !== "google.com"
  ) {
    return res.status(401).json({ message: "A verified Google email is required" });
  }

  let stage = "user_lookup";

  try {
    const normalizedEmail = normalizeEmail(email);
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = await findUserByEmail(normalizedEmail);

      if (user) {
        if (user.firebaseUid && user.firebaseUid !== uid) {
          return res
            .status(409)
            .json({ message: "This email is linked to another Google account" });
        }

        if (!user.firebaseUid) {
          stage = "user_link";
          const linkResult = await User.updateOne(
            {
              _id: user._id,
              $or: [
                { firebaseUid: { $exists: false } },
                { firebaseUid: null },
              ],
            },
            { $set: { firebaseUid: uid } }
          );

          if (linkResult.modifiedCount === 0) {
            const currentlyLinkedUser = await User.findById(user._id);

            if (!currentlyLinkedUser || currentlyLinkedUser.firebaseUid !== uid) {
              return res
                .status(409)
                .json({ message: "This email is linked to another Google account" });
            }

            user = currentlyLinkedUser;
          } else {
            user.firebaseUid = uid;
          }
        }
      } else {
        const verifiedName =
          typeof name === "string" && name.trim()
            ? name.trim()
            : normalizedEmail.split("@")[0];

        stage = "user_create";
        user = await User.create({
          name: verifiedName,
          email: normalizedEmail,
          firebaseUid: uid,
        });
      }
    }

    stage = "jwt_sign";
    res.json(buildAuthResponse(user));
  } catch (error) {
    if (error && error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Google account could not be linked" });
    }

    logGoogleAuthError(stage, error, [
      idToken,
      uid,
      email,
      name,
      process.env.MONGO_URI,
      process.env.JWT_SECRET,
    ]);
    res.status(500).json({ message: "Google login error" });
  }
});

module.exports = router;
