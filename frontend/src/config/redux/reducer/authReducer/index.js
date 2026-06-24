import { createSlice } from "@reduxjs/toolkit";
import {
  loginUser,
  registerUser,
  forgotPasswordOtp,
  resetPasswordWithOtp,
  changePassword,
  logoutUser,
  getAboutUser,
  getAllUsers,
  updateProfileDetails,
  saveProfileSkill,
  deleteProfileSkill,
  saveProfileProject,
  deleteProfileProject,
  saveProfileExperience,
  deleteProfileExperience,
  fetchConnections,
  getConnectionSuggestions,
  sendConnectionRequest,
  respondToConnectionRequest,
  uploadResume
} from "../../action/authAction";

const initialState = {
  user: undefined,
  token: null,
  refreshToken: null,
  isError: false,
  isTokenThere: false,
  isSuccess: false,
  isLoading: false,
  loggedIn: false,
  message: "",
  profileFetched: false,
  connections: [],
  connectionSuggestions: [],
  connectionCounts: {
    sent: 0,
    received: 0,
    accepted: 0,
    rejected: 0
  },
  connectionsFetched: false,
  connectionsLoading: false,
  profileUpdating: false,
  authFlowLoading: false,
  otpRequested: false,
  devOtp: "",
  all_users: [],
  all_profiles_fetched: false
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: () => initialState,
    handleLoginUser: (state) => {
      state.message = "hello";
    },
    emptyMessage: (state) => {
      state.message = "";
    },
    resetForgotPasswordFlow: (state) => {
      state.authFlowLoading = false;
      state.otpRequested = false;
      state.devOtp = "";
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
    },
    setTokenIsThere: (state) => {
      state.isTokenThere = true;
    },
    setTokenIsNotThere: (state) => {
      state.isTokenThere = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "Knocking the door...";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.isSuccess = true;
        state.loggedIn = true;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.message = "Login is successful";
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "Registering you...";
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.isSuccess = true;
        state.loggedIn = false;
        state.message = action.payload.message;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(forgotPasswordOtp.pending, (state) => {
        state.authFlowLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.devOtp = "";
        state.message = "";
      })
      .addCase(forgotPasswordOtp.fulfilled, (state, action) => {
        state.authFlowLoading = false;
        state.isError = false;
        state.isSuccess = true;
        state.otpRequested = true;
        state.devOtp = action.payload.devOtp || "";
        state.message = action.payload.message;
      })
      .addCase(forgotPasswordOtp.rejected, (state, action) => {
        state.authFlowLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.otpRequested = false;
        state.devOtp = "";
        state.message = action.payload;
      })
      .addCase(resetPasswordWithOtp.pending, (state) => {
        state.authFlowLoading = true;
        state.isError = false;
        state.isSuccess = false;
      })
      .addCase(resetPasswordWithOtp.fulfilled, (state, action) => {
        state.authFlowLoading = false;
        state.otpRequested = false;
        state.devOtp = "";
        state.isError = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(resetPasswordWithOtp.rejected, (state, action) => {
        state.authFlowLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(changePassword.pending, (state) => {
        state.authFlowLoading = true;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.authFlowLoading = false;
        state.token = action.payload.data.accessToken;
        state.refreshToken = action.payload.data.refreshToken;
        state.message = action.payload.message;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.authFlowLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(getAboutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAboutUser.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(getAboutUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.profileFetched = true;
        state.user = action.payload;
      })
      .addCase(updateProfileDetails.pending, (state) => {
        state.profileUpdating = true;
      })
      .addCase(updateProfileDetails.fulfilled, (state, action) => {
        state.profileUpdating = false;
        state.user = action.payload;
        state.message = "Profile updated successfully";
      })
      .addCase(updateProfileDetails.rejected, (state, action) => {
        state.profileUpdating = false;
        state.message = action.payload;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.all_profiles_fetched = true;
        state.all_users = action.payload.profiles;
      })
      .addCase(fetchConnections.pending, (state) => {
        state.connectionsLoading = true;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.connectionsLoading = false;
        state.connectionsFetched = true;
        state.connections = action.payload.connections;
        state.connectionCounts = action.payload.counts;
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.connectionsLoading = false;
        state.message = action.payload;
      })
      .addCase(getConnectionSuggestions.fulfilled, (state, action) => {
        state.connectionSuggestions = action.payload;
      })
      .addCase(getConnectionSuggestions.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(sendConnectionRequest.fulfilled, (state, action) => {
        state.message = action.payload || "";
      })
      .addCase(sendConnectionRequest.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(respondToConnectionRequest.fulfilled, (state, action) => {
        state.message = action.payload || "";
      })
      .addCase(respondToConnectionRequest.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(saveProfileSkill.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(deleteProfileSkill.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(saveProfileProject.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(deleteProfileProject.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(saveProfileExperience.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(deleteProfileExperience.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(uploadResume.pending, (state) => {
        state.profileUpdating = true;
      })
      .addCase(uploadResume.fulfilled, (state, action) => {
        state.profileUpdating = false;
        state.user = action.payload;
        state.message = "Profile details autofilled from resume!";
      })
      .addCase(uploadResume.rejected, (state, action) => {
        state.profileUpdating = false;
        state.message = action.payload;
      });
  }
});

export const {
  reset,
  emptyMessage,
  resetForgotPasswordFlow,
  setTokenIsThere,
  setTokenIsNotThere
} = authSlice.actions;

export default authSlice.reducer;
