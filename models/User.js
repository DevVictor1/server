const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.firebaseUid;
    },
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
  },
});

module.exports = mongoose.model("User", userSchema);
