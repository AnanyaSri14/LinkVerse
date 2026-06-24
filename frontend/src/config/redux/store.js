import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./reducer/authReducer";
import postReducer from "./reducer/postReducer";
import notificationReducer from "./reducer/notificationReducer";

/**
 * STEPS for State Management
 * Submit Action
 * Handle action in it's reducer
 * Register here -> Reducer
 */

export const store = configureStore({
  reducer: {
    auth: authReducer,
    postReducer: postReducer,
    notification: notificationReducer
  }
});
