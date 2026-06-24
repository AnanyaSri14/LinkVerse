import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET || "linkverse-access-secret";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET || "linkverse-refresh-secret";

export const ACCESS_TOKEN_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";
export const REFRESH_TOKEN_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const extractTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return req.body?.token || req.query?.token || req.headers["x-auth-token"] || "";
};

export const extractTokenFromSocket = (socket) => {
  const authHeader = socket.handshake.headers?.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return (
    socket.handshake.auth?.token ||
    socket.handshake.query?.token ||
    ""
  );
};

export const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      type: "access"
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN
    }
  );
};

export const signRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh"
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

export const issueTokensForUser = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.token = accessToken;
  user.refreshToken = refreshToken;
  user.lastSeen = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken
  };
};

export const resolveUserFromAccessToken = async (token) => {
  if (!token) {
    return null;
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);

    if (!user || user.token !== token) {
      return null;
    }

    return user;
  } catch (error) {
    return User.findOne({ token });
  }
};

export const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

export const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const buildSafeAuthPayload = async (user) => {
  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture
    }
  };
};
