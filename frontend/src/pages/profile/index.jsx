import UserLayout from "@/layout/UserLayout";
import DashboardLayout from "@/layout/DashboardLayout";
import { BASE_URL, clientServer } from "@/config";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  getAboutUser,
  updateProfileDetails,
  saveProfileSkill,
  deleteProfileSkill,
  saveProfileProject,
  deleteProfileProject,
  saveProfileExperience,
  deleteProfileExperience,
  changePassword,
  hibernateUserAccount,
  deleteUserAccount,
  uploadResume
} from "@/config/redux/action/authAction";
import styles from "./index.module.css";

const emptyProfileForm = {
  name: "",
  username: "",
  tagline: "",
  about: "",
  location: "",
  domain: ""
};

const emptyProjectForm = {
  projectId: "",
  title: "",
  description: "",
  link: "",
  duration: ""
};

const emptyExperienceForm = {
  experienceId: "",
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  duration: "",
  description: ""
};

export default function ProfilePage() {
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const profile = authState.user;

  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [skillForm, setSkillForm] = useState({
    skillId: "",
    name: ""
  });
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [experienceForm, setExperienceForm] = useState(emptyExperienceForm);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && !profile) {
      dispatch(getAboutUser({ token }));
    }
  }, [dispatch, profile]);

  useEffect(() => {
    if (!profile?.userId) {
      return;
    }

    // This keeps the local form in sync with the profile returned by the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileForm({
      name: profile.userId.name || "",
      username: profile.userId.username || "",
      tagline: profile.tagline || profile.currentPost || "",
      about: profile.about || profile.bio || "",
      location: profile.location || "",
      domain: profile.domain || ""
    });
  }, [profile]);

  const handleBasicProfileSubmit = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    await dispatch(
      updateProfileDetails({
        token,
        ...profileForm,
        profilePhoto,
        coverPhoto
      })
    );

    setProfilePhoto(null);
    setCoverPhoto(null);
  };

  const handleSaveSkill = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || !skillForm.name.trim()) {
      return;
    }

    await dispatch(
      saveProfileSkill({
        token,
        skillId: skillForm.skillId || undefined,
        name: skillForm.name
      })
    );

    setSkillForm({
      skillId: "",
      name: ""
    });
  };

  const handleDeleteSkill = async (skillId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    await dispatch(deleteProfileSkill({ token, skillId }));
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || !projectForm.title.trim()) {
      return;
    }

    await dispatch(
      saveProfileProject({
        token,
        ...projectForm,
        projectId: projectForm.projectId || undefined
      })
    );

    setProjectForm(emptyProjectForm);
  };

  const handleDeleteProject = async (projectId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    await dispatch(deleteProfileProject({ token, projectId }));
  };

  const handleSaveExperience = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || !experienceForm.company.trim() || !experienceForm.role.trim()) {
      return;
    }

    await dispatch(
      saveProfileExperience({
        token,
        ...experienceForm,
        experienceId: experienceForm.experienceId || undefined
      })
    );

    setExperienceForm(emptyExperienceForm);
  };

  const handleDeleteExperience = async (experienceId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    await dispatch(deleteProfileExperience({ token, experienceId }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return;
    }

    await dispatch(
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
    );

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await clientServer.get(`/download_resume?id=${profile.userId._id}`);
      const filename = response.data.message;
      window.open(`${BASE_URL}/uploads/${filename}`, "_blank");
    } catch (error) {
      alert("Failed to download profile PDF");
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }

    try {
      await dispatch(uploadResume({ resumeFile: file }));
    } catch (error) {
      alert("Failed to upload and parse resume");
    }
  };

  const handleHibernate = async () => {
    if (confirm("Are you sure you want to hibernate/deactivate your account? You will be logged out, and your profile will be hidden until you log back in.")) {
      try {
        await dispatch(hibernateUserAccount());
      } catch (error) {
        alert("Failed to hibernate account");
      }
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to permanently delete your account? This action is irreversible and all your posts, connections, and messages will be permanently deleted.")) {
      try {
        await dispatch(deleteUserAccount());
      } catch (error) {
        alert("Failed to delete account");
      }
    }
  };

  if (!profile?.userId) {
    return (
      <UserLayout>
        <DashboardLayout>
          <div className={styles.loadingState}>Loading profile editor...</div>
        </DashboardLayout>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.page}>
          <div className={styles.hero}>
            <div className={styles.coverPreview}>
              {profile.coverPhoto ? (
                <img
                  src={`${BASE_URL}/uploads/${profile.coverPhoto}`}
                  alt="Cover"
                />
              ) : (
                <div className={styles.coverFallback}></div>
              )}
            </div>
            <div className={styles.heroContent}>
              <img
                className={styles.profileAvatar}
                src={`${BASE_URL}/uploads/${profile.userId.profilePicture}`}
                alt={profile.userId.name}
              />
              <div>
                <h1>{profile.userId.name}</h1>
                <p className={styles.heroMeta}>@{profile.userId.username}</p>
                <p className={styles.heroMeta}>
                  {profile.tagline || "Add a professional tagline"}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Autofill with Resume</h2>
                <p>Upload your PDF resume to automatically populate your professional tagline, bio, skills, education, and work history.</p>
              </div>
            </div>
            <div className={styles.resumeUploadArea}>
              <label className={styles.resumeLabel}>
                <span className={styles.resumeIcon}>📄</span>
                <span className={styles.resumeText}>
                  {authState.profileUpdating ? "Parsing Resume..." : "Choose PDF resume to upload & autofill"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeUpload}
                  disabled={authState.profileUpdating}
                  className={styles.resumeInput}
                />
              </label>
            </div>
          </div>

          <form onSubmit={handleBasicProfileSubmit} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Edit Profile</h2>
                <p>Update your profile photo, cover image, and professional summary.</p>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className={styles.secondaryButton}
                >
                  Download PDF
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={authState.profileUpdating}
                >
                  {authState.profileUpdating ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Name</span>
                <input
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Username</span>
                <input
                  value={profileForm.username}
                  onChange={(event) =>
                    setProfileForm((currentForm) => ({
                      ...currentForm,
                      username: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Tagline</span>
                <input
                  value={profileForm.tagline}
                  onChange={(event) =>
                    setProfileForm((currentForm) => ({
                      ...currentForm,
                      tagline: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Location</span>
                <input
                  value={profileForm.location}
                  onChange={(event) =>
                    setProfileForm((currentForm) => ({
                      ...currentForm,
                      location: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Domain</span>
                <input
                  value={profileForm.domain}
                  onChange={(event) =>
                    setProfileForm((currentForm) => ({
                      ...currentForm,
                      domain: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Profile Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setProfilePhoto(event.target.files?.[0] || null);
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>Cover Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setCoverPhoto(event.target.files?.[0] || null);
                  }}
                />
              </label>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>About</span>
                <textarea
                  rows={5}
                  value={profileForm.about}
                  onChange={(event) =>
                    setProfileForm((currentForm) => ({
                      ...currentForm,
                      about: event.target.value
                    }))
                  }
                />
              </label>
            </div>
          </form>

          <div className={styles.sectionGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Skills</h2>
                  <p>Add the strengths you want recruiters to notice first.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSkill} className={styles.inlineForm}>
                <input
                  value={skillForm.name}
                  placeholder="Add or edit a skill"
                  onChange={(event) =>
                    setSkillForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value
                    }))
                  }
                />
                <button type="submit" className={styles.primaryButton}>
                  {skillForm.skillId ? "Update" : "Add"}
                </button>
              </form>

              <div className={styles.pillList}>
                {(profile.skills || []).map((skill) => (
                  <div key={skill._id} className={styles.pillItem}>
                    <span>{skill.name}</span>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setSkillForm({
                            skillId: skill._id,
                            name: skill.name
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteSkill(skill._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Projects</h2>
                  <p>Show the work that proves your skills.</p>
                </div>
              </div>

              <form onSubmit={handleSaveProject} className={styles.stackForm}>
                <input
                  value={projectForm.title}
                  placeholder="Project title"
                  onChange={(event) =>
                    setProjectForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value
                    }))
                  }
                />
                <input
                  value={projectForm.link}
                  placeholder="Project link"
                  onChange={(event) =>
                    setProjectForm((currentForm) => ({
                      ...currentForm,
                      link: event.target.value
                    }))
                  }
                />
                <input
                  value={projectForm.duration}
                  placeholder="Duration"
                  onChange={(event) =>
                    setProjectForm((currentForm) => ({
                      ...currentForm,
                      duration: event.target.value
                    }))
                  }
                />
                <textarea
                  rows={3}
                  value={projectForm.description}
                  placeholder="Describe the project"
                  onChange={(event) =>
                    setProjectForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value
                    }))
                  }
                />
                <div className={styles.formActions}>
                  <button type="submit" className={styles.primaryButton}>
                    {projectForm.projectId ? "Update Project" : "Add Project"}
                  </button>
                  {projectForm.projectId && (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => {
                        setProjectForm(emptyProjectForm);
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              <div className={styles.itemList}>
                {(profile.projects || []).map((project) => (
                  <div key={project._id} className={styles.listItem}>
                    <div>
                      <h4>{project.title}</h4>
                      <p>{project.duration}</p>
                      <p>{project.description}</p>
                      {project.link && (
                        <a href={project.link} target="_blank" rel="noreferrer">
                          {project.link}
                        </a>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setProjectForm({
                            projectId: project._id,
                            title: project.title,
                            description: project.description || "",
                            link: project.link || "",
                            duration: project.duration || ""
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteProject(project._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Experience Timeline</h2>
                <p>Capture your professional journey in a clean, chronological format.</p>
              </div>
            </div>

            <form onSubmit={handleSaveExperience} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Company</span>
                <input
                  value={experienceForm.company}
                  onChange={(event) =>
                    setExperienceForm((currentForm) => ({
                      ...currentForm,
                      company: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Role</span>
                <input
                  value={experienceForm.role}
                  onChange={(event) =>
                    setExperienceForm((currentForm) => ({
                      ...currentForm,
                      role: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Start Date</span>
                <input
                  value={experienceForm.startDate}
                  onChange={(event) =>
                    setExperienceForm((currentForm) => ({
                      ...currentForm,
                      startDate: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>End Date</span>
                <input
                  value={experienceForm.endDate}
                  onChange={(event) =>
                    setExperienceForm((currentForm) => ({
                      ...currentForm,
                      endDate: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Duration</span>
                <input
                  value={experienceForm.duration}
                  onChange={(event) =>
                    setExperienceForm((currentForm) => ({
                      ...currentForm,
                      duration: event.target.value
                    }))
                  }
                />
              </label>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Description</span>
                <textarea
                  rows={4}
                  value={experienceForm.description}
                  onChange={(event) =>
                    setExperienceForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value
                    }))
                  }
                />
              </label>

              <div className={`${styles.formActions} ${styles.fullWidth}`}>
                <button type="submit" className={styles.primaryButton}>
                  {experienceForm.experienceId ? "Update Experience" : "Add Experience"}
                </button>
                {experienceForm.experienceId && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setExperienceForm(emptyExperienceForm);
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            <div className={styles.timeline}>
              {(profile.experience || []).map((experience) => (
                <div key={experience._id} className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <h4>{experience.role}</h4>
                    <p>{experience.company}</p>
                    <p className={styles.heroMeta}>
                      {experience.duration ||
                        [experience.startDate, experience.endDate]
                          .filter(Boolean)
                          .join(" - ")}
                    </p>
                    <p>{experience.description}</p>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setExperienceForm({
                            experienceId: experience._id,
                            company: experience.company,
                            role: experience.role,
                            startDate: experience.startDate || "",
                            endDate: experience.endDate || "",
                            duration: experience.duration || "",
                            description: experience.description || ""
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteExperience(experience._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Security</h2>
                <p>Change your password without leaving your profile settings.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Current Password</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((currentForm) => ({
                      ...currentForm,
                      currentPassword: event.target.value
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>New Password</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((currentForm) => ({
                      ...currentForm,
                      newPassword: event.target.value
                    }))
                  }
                />
              </label>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Confirm New Password</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((currentForm) => ({
                      ...currentForm,
                      confirmPassword: event.target.value
                    }))
                  }
                />
              </label>

              <div className={`${styles.formActions} ${styles.fullWidth}`}>
                <button type="submit" className={styles.primaryButton}>
                  Update Password
                </button>
              </div>
            </form>
          </div>

          <div className={`${styles.card} ${styles.dangerCard}`}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.dangerText}>Account Management</h2>
                <p>Hibernate your profile temporarily or permanently delete your account.</p>
              </div>
            </div>
            <div className={styles.dangerActions}>
              <button
                type="button"
                onClick={handleHibernate}
                className={styles.warningButton}
              >
                Hibernate Account
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.dangerButton}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
