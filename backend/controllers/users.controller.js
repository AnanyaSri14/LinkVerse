import Profile from "../models/profile.model.js";
import User from "../models/user.models.js";
import ConnectionRequest from "../models/connections.models.js";
import Comment from "../models/comments.model.js";
import Post from "../models/posts.models.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";

import bcrypt from 'bcrypt';
import crypto from "crypto";

import PDFDocument from "pdfkit";
import fs from "fs";

const convertUserDataTOPDF = async (userData) => {
  const doc = new PDFDocument({ margin: 50 });

  const outputPath = crypto.randomBytes(32).toString("hex") + ".pdf";
  const stream = fs.createWriteStream("uploads/" + outputPath);

  doc.pipe(stream);

  // Profile Header
  const profilePicPath = `uploads/${userData.userId.profilePicture}`;
  if (userData.userId.profilePicture && fs.existsSync(profilePicPath)) {
    try {
      doc.image(profilePicPath, {
        width: 80,
        height: 80
      });
      doc.moveDown(1);
    } catch (err) {
      console.error("Failed to add profile picture to PDF", err);
    }
  }

  doc.fontSize(22).font('Helvetica-Bold').text(userData.userId.name || "");
  doc.fontSize(12).font('Helvetica-Oblique').fillColor('#555555').text(`@${userData.userId.username || ""}`);
  doc.fontSize(12).font('Helvetica').fillColor('#333333').text(userData.userId.email || "");
  
  if (userData.location) {
    doc.fontSize(12).text(`Location: ${userData.location}`);
  }
  if (userData.domain) {
    doc.fontSize(12).text(`Domain: ${userData.domain}`);
  }
  
  doc.moveDown(1);
  
  if (userData.tagline) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text("Tagline");
    doc.fontSize(12).font('Helvetica').fillColor('#333333').text(userData.tagline);
    doc.moveDown(1);
  }

  if (userData.about || userData.bio) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text("About");
    doc.fontSize(12).font('Helvetica').fillColor('#333333').text(userData.about || userData.bio);
    doc.moveDown(1);
  }

  // Skills
  if (userData.skills && userData.skills.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text("Skills");
    const skillList = userData.skills.map(s => s.name).join(", ");
    doc.fontSize(12).font('Helvetica').fillColor('#333333').text(skillList);
    doc.moveDown(1);
  }

  // Experience
  if (userData.experience && userData.experience.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text("Experience");
    userData.experience.forEach((exp) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text(`${exp.role} at ${exp.company}`);
      const durationText = exp.duration || [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#666666').text(durationText);
      if (exp.description) {
        doc.fontSize(11).font('Helvetica').fillColor('#333333').text(exp.description);
      }
      doc.moveDown(0.5);
    });
    doc.moveDown(0.5);
  }

  // Education
  if (userData.education && userData.education.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text("Education");
    userData.education.forEach((edu) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text(`${edu.degree || "Degree"} in ${edu.fieldOfStudy || "Field of Study"}`);
      doc.fontSize(11).font('Helvetica').fillColor('#555555').text(edu.school || "School");
      doc.moveDown(0.5);
    });
    doc.moveDown(0.5);
  }

  // Projects
  if (userData.projects && userData.projects.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text("Projects");
    userData.projects.forEach((proj) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text(proj.title);
      if (proj.duration) {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#666666').text(proj.duration);
      }
      if (proj.description) {
        doc.fontSize(11).font('Helvetica').fillColor('#333333').text(proj.description);
      }
      if (proj.link) {
        doc.fontSize(11).font('Helvetica').fillColor('#0a66c2').text(proj.link);
      }
      doc.moveDown(0.5);
    });
  }

  doc.end();

  return outputPath;
};

console.log("✅ REGISTER CONTROLLER HIT");

export const register = async (req, res) => {
  try {
     const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      username
    });

    await newUser.save();

    const profile = new Profile({
      userId: newUser._id
    });

    await profile.save();
    return res.json({ message: "User Created" });
    } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    const token = crypto.randomBytes(32).toString("hex");
  
    user.token = token;
    if (user.active === false) {
      user.active = true;
    }
    await user.save();

    return res.json({ token: token });
  } catch(error){
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

export const uploadProfilePicture = async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findOne({ token: token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profilePicture = req.file.filename;

    await user.save();

    return res.json({ message: "Profile Picture Updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async(req,res) => {
  try {
    const { token, ...newUserData } = req.body;

    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { username, email } = newUserData;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      if (existingUser || String(existingUser._id) !== String(user._id)) {
        return res.status(400).json({ message: "User already exists" });
      }
    }

    Object.assign(user, newUserData);

    await user.save();

    return res.json({ message: "User Updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getUserAndProfile = async (req, res) => {
  try {
    const { token } = req.query;

    console.log(`Token: ${token}`)

    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userProfile = await Profile.findOne({ userId: user._id })
      .populate("userId", "name email username profilePicture");

    return res.json(userProfile);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProfileData = async (req, res) => {
  try {
    const { token, ...newProfileData } = req.body;

    const userProfile = await User.findOne({ token: token });

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile_to_update = await Profile.findOne({ userId: userProfile._id });

    if (!profile_to_update) {
      return res.status(404).json({ message: "Profile not found" });
    }

    Object.assign(profile_to_update, newProfileData);

    await profile_to_update.save();

    return res.json({message:"Profile Updated"});
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllUserProfile = async (req, res) => {
  try {
    const profiles = await Profile.find()
      .populate('userId', 'name username email profilePicture active');

    const activeProfiles = profiles.filter(
      (profile) => profile.userId && profile.userId.active !== false
    );

    const profilesWithScore = await Promise.all(
      activeProfiles.map(async (profile) => {
        const userId = profile.userId._id;

        // 1. Count connections
        const connectionsCount = await ConnectionRequest.countDocuments({
          $and: [
            {
              $or: [
                { sender: userId },
                { receiver: userId },
                { userId },
                { connectionId: userId }
              ]
            },
            {
              $or: [
                { status: "accepted" },
                { status_accepted: true }
              ]
            }
          ]
        });

        // 2. Fetch user's posts
        const userPosts = await Post.find({ userId });
        const postsCount = userPosts.length;
        let totalLikes = 0;
        let totalComments = 0;
        userPosts.forEach(post => {
          totalLikes += (post.likedBy?.length || 0);
          totalComments += (post.comments?.length || 0);
        });

        // 3. Compute score
        const score = (connectionsCount * 2) + (postsCount * 3) + (totalLikes * 2) + (totalComments * 2);

        return {
          profile,
          score
        };
      })
    );

    // Sort by score descending
    profilesWithScore.sort((a, b) => b.score - a.score);

    let finalProfiles = profilesWithScore.map(item => item.profile);

    // If there are 50+ active users, only return top 5
    if (finalProfiles.length >= 50) {
      finalProfiles = finalProfiles.slice(0, 5);
    }

    return res.json({ profiles: finalProfiles });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const downloadProfile = async (req, res) => {
  const user_id = req.query.id;

  const userProfile = await Profile.findOne({ userId: user_id })
    .populate('userId', 'name username email profilePicture');

  if (!userProfile) {
      return res.status(404).json({ message: "Profile not found for this user" });
  }

  let outputPath = await convertUserDataTOPDF(userProfile);

  return res.json({ "message": outputPath });
};

export const sendConnectionRequest = async (req, res) => {
  const { token, connectionId } = req.body;

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const connectionUser = await User.findOne({ _id: connectionId });

    if (!connectionUser) {
      return res.status(404).json({ message: "Connection User not found" });
    }

    if (user._id.toString() === connectionUser._id.toString()) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    const directRequest = await ConnectionRequest.findOne({
      userId: user._id,
      connectionId: connectionUser._id
    });

    const reverseRequest = await ConnectionRequest.findOne({
      userId: connectionUser._id,
      connectionId: user._id
    });

    if (directRequest) {
      if (directRequest.status_accepted === true) {
        return res.status(400).json({ message: "Users are already connected" });
      }

      if (directRequest.status_accepted === null) {
        return res.status(400).json({ message: "Request already sent" });
      }

      directRequest.status_accepted = null;
      await directRequest.save();

      return res.json({ message: "Request Sent" });
    }

    if (reverseRequest) {
      if (reverseRequest.status_accepted === true) {
        return res.status(400).json({ message: "Users are already connected" });
      }

      if (reverseRequest.status_accepted === null) {
        reverseRequest.status_accepted = true;
        await reverseRequest.save();

        return res.json({ message: "Connection Request Accepted" });
      }

      reverseRequest.userId = user._id;
      reverseRequest.connectionId = connectionUser._id;
      reverseRequest.status_accepted = null;
      await reverseRequest.save();

      return res.json({ message: "Request Sent" });
    }

    const request = new ConnectionRequest({
      userId: user._id,
      connectionId: connectionUser._id
    });

    await request.save();

    return res.json({ message: "Request Sent" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyConnectionsRequests = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const connections = await ConnectionRequest.find({
      $or: [
        { connectionId: user._id }, // incoming
        { userId: user._id }        // sent
      ]
    })
    .populate('connectionId', 'name username email profilePicture')
    .populate('userId', 'name username email profilePicture');

    return res.json({ connections });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const whatAreMyConnections = async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const connections = await ConnectionRequest.find({ connectionId: user._id })
      .populate('userId', 'name username email profilePicture');

    return res.json(connections);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  const { token, requestId, action_type } = req.body;

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const connection = await ConnectionRequest.findOne({ _id: requestId });

    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    if (connection.connectionId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to update this request" });
    }

    if (connection.status_accepted !== null) {
      return res.status(400).json({ message: "Request already processed" });
    }

    const connectionQuery = {
      $or: [
        {
          userId: connection.userId,
          connectionId: connection.connectionId
        },
        {
          userId: connection.connectionId,
          connectionId: connection.userId
        }
      ]
    };

    if (action_type === "reject") {
      await ConnectionRequest.deleteMany(connectionQuery);
      return res.json({ message: "Request Rejected" });
    }

    await ConnectionRequest.updateMany(
      connectionQuery,
      {
        $set: {
          status_accepted: true
        }
      }
    );

    return res.json({ message: "Request Accepted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const commentPost = async (req, res) => {
  const { token, post_id, commentBody } = req.body;
  try {
    const user = await User.findOne({ token: token }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const post = await Post.findOne({
      _id: post_id
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = new Comment({
      userId: user._id,
      postId: post_id,
      body: commentBody
    });

    await comment.save();

    return res.status(200).json({message:"comment added"});
  } catch(err){
    console.log(err.message);
    return res.status(500).json({message: err.message});
  }
}

export const getUserProfileAndUserBasedOnUsername = async (req, res) => {
  const { username } = req.query;

  try {
    const user = await User.findOne({
      username
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userProfile = await Profile.findOne({ userId: user._id })
      .populate('userId', 'name username email profilePicture');

    return res.json({ "profile": userProfile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export const hibernateAccount = async (req, res) => {
  try {
    const user = req.user || await User.findOne({ token: req.body.token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.active = false;
    user.token = "";
    await user.save();
    return res.json({ message: "Account hibernated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const user = req.user || await User.findOne({ token: req.body.token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userId = user._id;

    await Profile.deleteOne({ userId });
    await ConnectionRequest.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId },
        { userId },
        { connectionId: userId }
      ]
    });
    await Post.deleteMany({ userId });
    await Comment.deleteMany({ userId });
    await Message.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });
    await Notification.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });
    await User.deleteOne({ _id: userId });

    return res.json({ message: "Account deleted permanently" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
