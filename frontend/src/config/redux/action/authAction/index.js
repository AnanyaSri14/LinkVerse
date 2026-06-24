import {
  clearStoredAuth,
  clientServer,
  getAccessToken,
  setStoredAuth
} from "@/config";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const loginUser = createAsyncThunk(
  "user/login",
  async (user, thunkAPI) => {
    try {
      const response = await clientServer.post("/auth/login", {
        email: user.email,
        password: user.password
      });
      const authPayload = response.data.data;

      setStoredAuth({
        accessToken: authPayload.accessToken,
        refreshToken: authPayload.refreshToken
      });

      return thunkAPI.fulfillWithValue(authPayload);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || { message: "Login failed" }
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  "user/register",
  async (user, thunkAPI) => {
    try {
      const response = await clientServer.post("/auth/register", {
        username: user.username,
        password: user.password,
        email: user.email,
        name: user.name
      });

      return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || { message: "Registration failed" }
      );
    }
  }
);

export const forgotPasswordOtp = createAsyncThunk(
  "user/forgotPasswordOtp",
  async ({ email }, thunkAPI) => {
    try {
      const response = await clientServer.post("/auth/forgot-password", {
        email
      });

      return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || { message: "Unable to generate OTP" }
      );
    }
  }
);

export const resetPasswordWithOtp = createAsyncThunk(
  "user/resetPasswordWithOtp",
  async ({ email, otp, newPassword }, thunkAPI) => {
    try {
      const response = await clientServer.post("/auth/reset-password", {
        email,
        otp,
        newPassword
      });

      return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || { message: "Unable to reset password" }
      );
    }
  }
);

export const changePassword = createAsyncThunk(
  "user/changePassword",
  async ({ currentPassword, newPassword }, thunkAPI) => {
    try {
      const response = await clientServer.post("/auth/change-password", {
        token: getAccessToken(),
        currentPassword,
        newPassword
      });

      setStoredAuth(response.data.data);
      return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || { message: "Unable to change password" }
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "user/logoutUser",
  async (_, thunkAPI) => {
    try {
      const token = getAccessToken();

      if (token) {
        await clientServer.post("/auth/logout", {
          token
        });
      }

      clearStoredAuth();
      return thunkAPI.fulfillWithValue("Logged out successfully");
    } catch (error) {
      clearStoredAuth();
      return thunkAPI.fulfillWithValue("Logged out successfully");
    }
  }
);

export const getAboutUser = createAsyncThunk(
  "user/getAboutUser",
  async (user = {}, thunkAPI) => {
    try {
      const token = user.token || getAccessToken();
      const response = await clientServer.get(
        `/get_user_and_profile?token=${token}`
      );

      return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || { message: "Unable to fetch profile" }
      );
    }
  }
);

export const updateProfileDetails = createAsyncThunk(
  "profile/updateProfileDetails",
  async (profileData, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("token", profileData.token || getAccessToken());
      formData.append("name", profileData.name || "");
      formData.append("username", profileData.username || "");
      formData.append("tagline", profileData.tagline || "");
      formData.append("about", profileData.about || "");
      formData.append("location", profileData.location || "");
      formData.append("domain", profileData.domain || "");

      if (profileData.profilePhoto) {
        formData.append("profilePhoto", profileData.profilePhoto);
      }

      if (profileData.coverPhoto) {
        formData.append("coverPhoto", profileData.coverPhoto);
      }

      const response = await clientServer.put("/profile/update", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      thunkAPI.dispatch(getAllUsers());
      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to update profile"
      );
    }
  }
);

export const saveProfileSkill = createAsyncThunk(
  "profile/saveProfileSkill",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.post("/profile/skills", {
        ...payload,
        token: payload.token || getAccessToken()
      });
      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to save skill"
      );
    }
  }
);

export const deleteProfileSkill = createAsyncThunk(
  "profile/deleteProfileSkill",
  async ({ token, skillId }, thunkAPI) => {
    try {
      const response = await clientServer.delete(`/profile/skills/${skillId}`, {
        data: { token: token || getAccessToken() }
      });

      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to delete skill"
      );
    }
  }
);

export const saveProfileProject = createAsyncThunk(
  "profile/saveProfileProject",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.post("/profile/projects", {
        ...payload,
        token: payload.token || getAccessToken()
      });
      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to save project"
      );
    }
  }
);

export const deleteProfileProject = createAsyncThunk(
  "profile/deleteProfileProject",
  async ({ token, projectId }, thunkAPI) => {
    try {
      const response = await clientServer.delete(`/profile/projects/${projectId}`, {
        data: { token: token || getAccessToken() }
      });

      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to delete project"
      );
    }
  }
);

export const saveProfileExperience = createAsyncThunk(
  "profile/saveProfileExperience",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.post("/profile/experience", {
        ...payload,
        token: payload.token || getAccessToken()
      });
      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to save experience"
      );
    }
  }
);

export const deleteProfileExperience = createAsyncThunk(
  "profile/deleteProfileExperience",
  async ({ token, experienceId }, thunkAPI) => {
    try {
      const response = await clientServer.delete(
        `/profile/experience/${experienceId}`,
        {
          data: { token: token || getAccessToken() }
        }
      );

      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to delete experience"
      );
    }
  }
);

export const getAllUsers = createAsyncThunk(
  "user/getAllUsers",
  async (_, thunkAPI) => {
    try {
      const response = await clientServer.get("/users/get_all_users", {
        params: {
          token: getAccessToken()
        }
      });

      return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || { message: "Unable to fetch users" }
      );
    }
  }
);

export const fetchConnections = createAsyncThunk(
  "connections/fetchConnections",
  async ({ token, filter = "all" } = {}, thunkAPI) => {
    try {
      const response = await clientServer.get("/connections", {
        params: {
          token: token || getAccessToken(),
          filter
        }
      });

      return thunkAPI.fulfillWithValue(response.data.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to fetch connections"
      );
    }
  }
);

export const sendConnectionRequest = createAsyncThunk(
  "connections/sendConnectionRequest",
  async (user, thunkAPI) => {
    try {
      const resolvedToken = user.token || getAccessToken();
      const response = await clientServer.post("/connection/send", {
        token: resolvedToken,
        targetUserId: user.connectionId
      });
      thunkAPI.dispatch(fetchConnections({ token: resolvedToken }));
      thunkAPI.dispatch(getConnectionSuggestions({ token: resolvedToken }));

      return thunkAPI.fulfillWithValue(response.data.message);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to send connection request"
      );
    }
  }
);

export const respondToConnectionRequest = createAsyncThunk(
  "connections/respondToConnectionRequest",
  async ({ token, connectionId, action }, thunkAPI) => {
    try {
      const resolvedToken = token || getAccessToken();
      const response = await clientServer.post("/connection/respond", {
        token: resolvedToken,
        connectionId,
        action
      });

      thunkAPI.dispatch(fetchConnections({ token: resolvedToken }));
      thunkAPI.dispatch(getConnectionSuggestions({ token: resolvedToken }));
      return thunkAPI.fulfillWithValue(response.data.message);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Something went wrong"
      );
    }
  }
);

export const getConnectionSuggestions = createAsyncThunk(
  "connections/getConnectionSuggestions",
  async ({ token } = {}, thunkAPI) => {
    try {
      const response = await clientServer.get("/connections/suggestions", {
        params: {
          token: token || getAccessToken()
        }
      });

      return thunkAPI.fulfillWithValue(response.data.data.suggestions);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to fetch connection suggestions"
      );
    }
  }
);

export const getConnectionsRequest = fetchConnections;
export const getMyConnectionRequests = fetchConnections;
export const acceptConnection = respondToConnectionRequest;

export const hibernateUserAccount = createAsyncThunk(
  "user/hibernateAccount",
  async (_, thunkAPI) => {
    try {
      const response = await clientServer.post("/hibernate_account", {
        token: getAccessToken()
      });
      thunkAPI.dispatch(logoutUser());
      return thunkAPI.fulfillWithValue(response.data.message);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to hibernate account"
      );
    }
  }
);

export const deleteUserAccount = createAsyncThunk(
  "user/deleteAccount",
  async (_, thunkAPI) => {
    try {
      const response = await clientServer.post("/delete_account", {
        token: getAccessToken()
      });
      thunkAPI.dispatch(logoutUser());
      return thunkAPI.fulfillWithValue(response.data.message);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to delete account"
      );
    }
  }
);

export const uploadResume = createAsyncThunk(
  "profile/uploadResume",
  async ({ resumeFile }, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("token", getAccessToken());
      formData.append("resume", resumeFile);

      const response = await clientServer.post("/profile/upload_resume", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      return thunkAPI.fulfillWithValue(response.data.data.profile);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to parse resume"
      );
    }
  }
);
