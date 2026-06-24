import { clientServer } from "@/config";
import { createAsyncThunk } from "@reduxjs/toolkit";

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("token") || "";
};

export const fetchNotifications = createAsyncThunk(
  "notification/fetchNotifications",
  async (payload = {}, thunkAPI) => {
    try {
      const token = payload.token || getStoredToken();
      const response = await clientServer.get("/notifications", {
        params: { token }
      });
      return thunkAPI.fulfillWithValue(response.data.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to fetch notifications"
      );
    }
  }
);

export const markNotificationsAsRead = createAsyncThunk(
  "notification/markNotificationsAsRead",
  async (payload = {}, thunkAPI) => {
    try {
      const token = payload.token || getStoredToken();
      const response = await clientServer.put("/notifications/read/all", { token });
      return thunkAPI.fulfillWithValue(response.data.message);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to mark notifications as read"
      );
    }
  }
);
