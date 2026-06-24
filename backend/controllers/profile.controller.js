import Profile from "../models/profile.model.js";
import User from "../models/user.models.js";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const publicUserFields = "name username email profilePicture";

const getUserByToken = async (token) => {
  if (!token) {
    return null;
  }

  return User.findOne({ token });
};

const getOrCreateProfile = async (userId) => {
  let profile = await Profile.findOne({ userId }).populate("userId", publicUserFields);

  if (!profile) {
    profile = await Profile.create({ userId });
    profile = await Profile.findOne({ userId }).populate("userId", publicUserFields);
  }

  return profile;
};

const mapProfileResponse = async (userId) => {
  return Profile.findOne({ userId }).populate("userId", publicUserFields);
};

export const updateProfile = async (req, res) => {
  try {
    const { token, name, username, tagline, about, location, domain } = req.body;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profile = await getOrCreateProfile(user._id);

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });

      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Username already taken"
        });
      }
    }

    if (name) {
      user.name = name;
    }

    if (username) {
      user.username = username;
    }

    if (req.files?.profilePhoto?.[0]?.filename) {
      user.profilePicture = req.files.profilePhoto[0].filename;
    }

    if (req.files?.coverPhoto?.[0]?.filename) {
      profile.coverPhoto = req.files.coverPhoto[0].filename;
    }

    profile.tagline = tagline || "";
    profile.about = about || "";
    profile.bio = about || "";
    profile.currentPost = tagline || "";
    profile.location = location || "";
    profile.domain = domain || "";

    await user.save();
    await profile.save();

    const updatedProfile = await mapProfileResponse(user._id);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        profile: updatedProfile
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveSkill = async (req, res) => {
  try {
    const { token, skillId, name } = req.body;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Skill name is required" });
    }

    const profile = await getOrCreateProfile(user._id);
    const normalizedName = name.trim();
    const existingSkill = skillId ? profile.skills.id(skillId) : null;

    if (existingSkill) {
      existingSkill.name = normalizedName;
    } else {
      profile.skills.push({ name: normalizedName });
    }

    await profile.save();

    return res.json({
      success: true,
      message: "Skill saved successfully",
      data: {
        profile: await mapProfileResponse(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { token } = req.body;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profile = await getOrCreateProfile(user._id);
    const skill = profile.skills.id(skillId);

    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill not found" });
    }

    skill.deleteOne();
    await profile.save();

    return res.json({
      success: true,
      message: "Skill deleted successfully",
      data: {
        profile: await mapProfileResponse(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveProject = async (req, res) => {
  try {
    const { token, projectId, title, description, link, duration } = req.body;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Project title is required" });
    }

    const profile = await getOrCreateProfile(user._id);
    const existingProject = projectId ? profile.projects.id(projectId) : null;
    const nextProject = {
      title: title.trim(),
      description: description || "",
      link: link || "",
      duration: duration || ""
    };

    if (existingProject) {
      Object.assign(existingProject, nextProject);
    } else {
      profile.projects.push(nextProject);
    }

    await profile.save();

    return res.json({
      success: true,
      message: "Project saved successfully",
      data: {
        profile: await mapProfileResponse(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { token } = req.body;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profile = await getOrCreateProfile(user._id);
    const project = profile.projects.id(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.deleteOne();
    await profile.save();

    return res.json({
      success: true,
      message: "Project deleted successfully",
      data: {
        profile: await mapProfileResponse(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveExperience = async (req, res) => {
  try {
    const {
      token,
      experienceId,
      company,
      role,
      startDate,
      endDate,
      description,
      duration
    } = req.body;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!company?.trim() || !role?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company and role are required"
      });
    }

    const profile = await getOrCreateProfile(user._id);
    const existingExperience = experienceId ? profile.experience.id(experienceId) : null;
    const nextExperience = {
      company: company.trim(),
      role: role.trim(),
      startDate: startDate || "",
      endDate: endDate || "",
      description: description || "",
      duration:
        duration || [startDate, endDate].filter(Boolean).join(" - ")
    };

    if (existingExperience) {
      Object.assign(existingExperience, nextExperience);
    } else {
      profile.experience.push(nextExperience);
    }

    profile.pastWork = profile.experience.map((item) => ({
      company: item.company,
      position: item.role,
      years: item.duration
    }));

    await profile.save();

    return res.json({
      success: true,
      message: "Experience saved successfully",
      data: {
        profile: await mapProfileResponse(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { token } = req.body;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profile = await getOrCreateProfile(user._id);
    const experience = profile.experience.id(experienceId);

    if (!experience) {
      return res.status(404).json({ success: false, message: "Experience not found" });
    }

    experience.deleteOne();
    profile.pastWork = profile.experience.map((item) => ({
      company: item.company,
      position: item.role,
      years: item.duration
    }));
    await profile.save();

    return res.json({
      success: true,
      message: "Experience deleted successfully",
      data: {
        profile: await mapProfileResponse(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const parseResumeText = (text) => {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let tagline = "";
  let domain = "";
  
  const commonRoles = ["software engineer", "developer", "designer", "product manager", "frontend developer", "backend developer", "fullstack developer", "data scientist", "engineer"];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lineLower = lines[i].toLowerCase();
    const matchedRole = commonRoles.find(role => lineLower.includes(role));
    if (matchedRole) {
      tagline = lines[i];
      domain = matchedRole.toUpperCase();
      break;
    }
  }
  
  if (!tagline && lines.length > 1) {
    tagline = lines[1];
  }

  let location = "";
  const locationRegex = /(?:location|address|lives in|based in)?:?\s*([a-zA-Z\s]+,\s*[a-zA-Z\s]+)/i;
  const locMatch = text.match(locationRegex);
  if (locMatch) {
    location = locMatch[1].trim();
  }

  const commonSkillsList = [
    "JavaScript", "TypeScript", "Node.js", "React", "Angular", "Vue", "HTML", "CSS", "Tailwind",
    "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "SQL", "PostgreSQL", "MySQL",
    "MongoDB", "Redis", "Git", "Docker", "Kubernetes", "AWS", "Google Cloud", "Azure",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "UI/UX", "Figma", "Agile"
  ];
  const extractedSkills = [];
  commonSkillsList.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      extractedSkills.push({ name: skill });
    }
  });

  const experience = [];
  const expHeaderIndex = text.search(/(experience|work history|employment|career)/i);
  if (expHeaderIndex !== -1) {
    const expText = text.substring(expHeaderIndex);
    const expLines = expText.split("\n").map(l => l.trim()).filter(Boolean).slice(1, 20);
    
    let currentExp = null;
    expLines.forEach(line => {
      if (line.search(/(education|projects|skills)/i) !== -1) {
        return;
      }
      
      const hasRole = commonRoles.some(role => line.toLowerCase().includes(role)) || /(engineer|developer|designer|manager|lead|intern|analyst|specialist)\b/i.test(line);
      const dateMatch = line.match(/\b(19\d{2}|20\d{2})\b|\b(present|current)\b/i);
      
      if (hasRole) {
        if (currentExp) {
          experience.push(currentExp);
        }
        
        let company = "Company";
        let role = line;
        
        if (line.includes("|")) {
          const parts = line.split("|");
          role = parts[0].trim();
          company = parts[1]?.trim() || "Company";
        } else if (line.includes(" at ")) {
          const parts = line.split(" at ");
          role = parts[0].trim();
          company = parts[1]?.trim() || "Company";
        } else if (line.includes(",")) {
          const parts = line.split(",");
          role = parts[0].trim();
          company = parts[1]?.trim() || "Company";
        }
        
        currentExp = {
          company,
          role,
          startDate: "",
          endDate: "",
          duration: "",
          description: ""
        };
      } else if (currentExp) {
        if (dateMatch && !currentExp.duration) {
          currentExp.duration = line;
        } else if (line.length > 10) {
          currentExp.description = currentExp.description 
            ? currentExp.description + " " + line 
            : line;
        }
      }
    });
    if (currentExp) {
      experience.push(currentExp);
    }
  }

  const education = [];
  const eduHeaderIndex = text.search(/(education|academic|studies|university)/i);
  if (eduHeaderIndex !== -1) {
    const eduText = text.substring(eduHeaderIndex);
    const eduLines = eduText.split("\n").map(l => l.trim()).filter(Boolean).slice(1, 10);
    
    let currentEdu = null;
    const degreeRegex = /(bachelor|master|phd|b\.s|m\.s|b\.tech|m\.tech|b\.sc|m\.sc|degree|diploma)/i;
    const schoolKeywords = /(university|college|school|institute)/i;
    
    eduLines.forEach(line => {
      if (line.search(/(experience|projects|skills|about)/i) !== -1) {
        return;
      }
      
      const degreeMatch = line.match(degreeRegex);
      const schoolMatch = schoolKeywords.test(line);
      
      if (degreeMatch || schoolMatch) {
        if (currentEdu) {
          education.push(currentEdu);
        }
        
        currentEdu = {
          school: schoolMatch ? line : "University",
          degree: degreeMatch ? degreeMatch[1] : "Degree",
          fieldOfStudy: "Field of Study"
        };
      } else if (currentEdu) {
        if (schoolKeywords.test(line)) {
          currentEdu.school = line;
        } else if (line.length > 5) {
          currentEdu.fieldOfStudy = line;
        }
      }
    });
    if (currentEdu) {
      education.push(currentEdu);
    }
  }

  return {
    tagline,
    domain,
    location,
    skills: extractedSkills,
    experience: experience.slice(0, 5),
    education: education.slice(0, 3)
  };
};

export const uploadResumeAndAutofill = async (req, res) => {
  try {
    const user = req.user || await getUserByToken(req.body.token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No resume file uploaded" });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const parsedPdf = await pdfParse(dataBuffer);
    const text = parsedPdf.text;

    const parsedDetails = parseResumeText(text);

    const profile = await getOrCreateProfile(user._id);

    if (parsedDetails.tagline) {
      profile.tagline = parsedDetails.tagline;
      profile.currentPost = parsedDetails.tagline;
    }
    if (parsedDetails.domain) {
      profile.domain = parsedDetails.domain;
    }
    if (parsedDetails.location) {
      profile.location = parsedDetails.location;
    }
    
    if (parsedDetails.skills && parsedDetails.skills.length > 0) {
      profile.skills = parsedDetails.skills;
    }
    if (parsedDetails.experience && parsedDetails.experience.length > 0) {
      profile.experience = parsedDetails.experience;
      profile.pastWork = parsedDetails.experience.map(exp => ({
        company: exp.company,
        position: exp.role,
        years: exp.duration || [exp.startDate, exp.endDate].filter(Boolean).join(" - ")
      }));
    }
    if (parsedDetails.education && parsedDetails.education.length > 0) {
      profile.education = parsedDetails.education;
    }

    await profile.save();

    const updatedProfile = await mapProfileResponse(user._id);

    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error("Failed to delete temp resume file", err);
    }

    return res.json({
      success: true,
      message: "Resume uploaded and profile details autofilled!",
      data: {
        profile: updatedProfile
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
