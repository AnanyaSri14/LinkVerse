import mongoose, { Schema } from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  active: {
    type: Boolean,
    default: true
  },
  password: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: "default.jpg"
  },
  token: {
    type: String   
  },
  refreshToken: {
    type: String,
    default: ""
  },
  resetPasswordOtpHash: {
    type: String,
    default: ""
  },
  resetPasswordOtpExpires: {
    type: Date,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("User", UserSchema);
