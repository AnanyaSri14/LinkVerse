import bcrypt from "bcrypt";
import Profile from "../models/profile.model.js";
import User from "../models/user.models.js";
import Notification from "../models/notification.model.js";
import {
  isEmailDeliveryConfigured,
  sendPasswordResetOtpEmail
} from "../utils/email.utils.js";
import {
  buildSafeAuthPayload,
  generateOtp,
  hashOtp,
  issueTokensForUser,
  verifyRefreshToken
} from "../utils/auth.utils.js";
import {
  validateEmailAddress,
  validateName,
  validatePasswordStrength,
  validateUsername
} from "../utils/validation.utils.js";

const publicUserFields = "name email username profilePicture";

const buildLoginResponse = async (user) => {
  const tokens = await issueTokensForUser(user);
  const safePayload = await buildSafeAuthPayload(user);

  return {
    ...tokens,
    ...safePayload
  };
};

export const register = async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const emailValidation = validateEmailAddress(email);
    const usernameValidation = validateUsername(username);
    const nameValidation = validateName(name);
    const passwordValidation = validatePasswordStrength(password);

    if (!nameValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: nameValidation.message
      });
    }

    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    if (!usernameValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      });
    }

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    const normalizedEmail = emailValidation.normalizedEmail;
    const normalizedUsername = usernameValidation.normalizedUsername;

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername }
      ]
    });

    if (existingUser) {
      const duplicateField =
        existingUser.email === normalizedEmail ? "email" : "username";

      return res.status(400).json({
        success: false,
        message: `This ${duplicateField} is already in use`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: nameValidation.normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      username: normalizedUsername
    });

    await Profile.create({ userId: user._id });

    return res.json({
      success: true,
      message: "Registration is successful. Please sign in."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const emailValidation = validateEmailAddress(email);

    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    const user = await User.findOne({ email: emailValidation.normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const loginPayload = await buildLoginResponse(user);

    return res.json({
      success: true,
      message: "Login successful",
      token: loginPayload.accessToken,
      refreshToken: loginPayload.refreshToken,
      data: loginPayload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.sub);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }

    const tokens = await issueTokensForUser(user);

    return res.json({
      success: true,
      message: "Token refreshed",
      data: tokens
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Refresh token expired or invalid"
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const isProduction = process.env.NODE_ENV === "production";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const emailValidation = validateEmailAddress(email);

    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    const user = await User.findOne({ email: emailValidation.normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otp = generateOtp();

    user.resetPasswordOtpHash = hashOtp(otp);
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    let otpDeliveryMessage = "OTP sent to your email address";
    let devOtp = "";

    try {
      if (isEmailDeliveryConfigured()) {
        await sendPasswordResetOtpEmail({
          to: user.email,
          name: user.name,
          otp
        });
      } else {
        otpDeliveryMessage =
          "OTP generated. Email delivery is not configured yet, so the OTP was logged on the server for local development.";
        devOtp = otp;
        console.log(
          `[LinkVerse][DEV OTP] Password reset OTP for ${user.email}: ${otp}`
        );
      }
    } catch (emailError) {
      otpDeliveryMessage =
        "OTP generated, but email delivery failed. The OTP was logged on the server for local development.";
      devOtp = otp;
      console.error("[LinkVerse][OTP EMAIL ERROR]", emailError.message);
      console.log(`[LinkVerse][DEV OTP] Password reset OTP for ${user.email}: ${otp}`);
    }

    return res.json({
      success: true,
      message: otpDeliveryMessage,
      devOtp: !isProduction ? devOtp : ""
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    const emailValidation = validateEmailAddress(email);
    const passwordValidation = validatePasswordStrength(newPassword, {
      label: "New password"
    });

    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    if (!/^\d{6}$/.test(String(otp).trim())) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit code"
      });
    }

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    const user = await User.findOne({ email: emailValidation.normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (
      !user.resetPasswordOtpHash ||
      !user.resetPasswordOtpExpires ||
      user.resetPasswordOtpExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one."
      });
    }

    if (user.resetPasswordOtpHash !== hashOtp(String(otp).trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOtpHash = "";
    user.resetPasswordOtpExpires = null;
    user.token = "";
    user.refreshToken = "";
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful. Please sign in again."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    const passwordValidation = validatePasswordStrength(newPassword, {
      label: "New password"
    });

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password"
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    const tokens = await issueTokensForUser(user);

    const notification = await Notification.create({
      receiver: user._id,
      sender: null,
      type: "password_changed"
    });

    if (req.io) {
      req.io.to(`user:${user._id}`).emit("new_notification", notification);
    }

    return res.json({
      success: true,
      message: "Password changed successfully",
      data: tokens
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    req.user.token = "";
    req.user.refreshToken = "";
    req.user.isOnline = false;
    req.user.lastSeen = new Date();
    await req.user.save();

    return res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
