import mongoose from "mongoose";

const educationSchema = new mongoose.Schema({
  school: {
    type: String,
    default: ""
  },
  degree: {
    type: String,
    default: ""
  },
  fieldOfStudy: {
    type: String,
    default: ""
  }
});

const workSchema = new mongoose.Schema({
  company: {
    type: String,
    default: ""
  },
  position: {
    type: String,
    default: ""
  },
  years: {
    type: String,
    default: ""
  }
});

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  }
});

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  link: {
    type: String,
    default: ""
  },
  duration: {
    type: String,
    default: ""
  }
});

const experienceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: String,
    default: ""
  },
  endDate: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  duration: {
    type: String,
    default: ""
  }
});

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    bio: {
      type: String,
      default: ""
    },
    about: {
      type: String,
      default: ""
    },
    currentPost: {
      type: String,
      default: ""
    },
    tagline: {
      type: String,
      default: ""
    },
    coverPhoto: {
      type: String,
      default: ""
    },
    location: {
      type: String,
      default: ""
    },
    domain: {
      type: String,
      default: ""
    },
    pastWork: {
      type: [workSchema],
      default: []
    },
    experience: {
      type: [experienceSchema],
      default: []
    },
    skills: {
      type: [skillSchema],
      default: []
    },
    projects: {
      type: [projectSchema],
      default: []
    },
    education: {
      type: [educationSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const buildPastWorkFromExperience = (experience = []) => {
  return experience.map((item) => ({
    company: item.company,
    position: item.role,
    years:
      item.duration ||
      [item.startDate, item.endDate].filter(Boolean).join(" - ")
  }));
};

ProfileSchema.pre("validate", function syncLegacyProfileFields(next) {
  if (!this.about && this.bio) {
    this.about = this.bio;
  }

  if (!this.bio && this.about) {
    this.bio = this.about;
  }

  if (!this.tagline && this.currentPost) {
    this.tagline = this.currentPost;
  }

  if (!this.currentPost && this.tagline) {
    this.currentPost = this.tagline;
  }

  if ((!this.experience || this.experience.length === 0) && this.pastWork?.length) {
    this.experience = this.pastWork.map((work) => ({
      company: work.company,
      role: work.position,
      duration: work.years
    }));
  }

  if ((!this.pastWork || this.pastWork.length === 0) && this.experience?.length) {
    this.pastWork = buildPastWorkFromExperience(this.experience);
  }

  next();
});

const Profile = mongoose.model("Profile", ProfileSchema);

export default Profile;
