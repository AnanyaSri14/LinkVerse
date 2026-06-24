import { createSlice } from "@reduxjs/toolkit";
import {
  fetchNotifications,
  markNotificationsAsRead
} from "@/config/redux/action/notificationAction";

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isError: false,
  message: ""
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    reset: () => initialState,
    addNotification: (state, action) => {
      if (!state.notifications.some((n) => n._id === action.payload._id)) {
        state.notifications = [action.payload, ...state.notifications];
        state.unreadCount += 1;
      }
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(markNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          isRead: true
        }));
        state.unreadCount = 0;
      });
  }
});

export const { reset, addNotification, incrementUnreadCount } = notificationSlice.actions;
export default notificationSlice.reducer;
