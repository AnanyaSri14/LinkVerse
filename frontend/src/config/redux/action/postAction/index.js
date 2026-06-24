import { clientServer } from "@/config";
import { createAsyncThunk } from "@reduxjs/toolkit";

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("token") || "";
};

export const fetchFeed = createAsyncThunk(
  "post/fetchFeed",
  async (payload = {}, thunkAPI) => {
    try {
      const {
        token = getStoredToken(),
        filter = "latest",
        page = 1,
        limit = 5,
        append = false
      } = payload;

      const response = await clientServer.get("/post/feed", {
        params: {
          token,
          filter,
          page,
          limit
        }
      });

      return thunkAPI.fulfillWithValue({
        ...response.data.data,
        append
      });
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to fetch feed"
      );
    }
  }
);

export const getAllPosts = fetchFeed;

export const createPost = createAsyncThunk(
  "post/createPost",
  async (userData, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("token", userData.token || getStoredToken());
      formData.append("content", userData.content || userData.body || "");
      formData.append("body", userData.content || userData.body || "");

      if (userData.file) {
        formData.append("media", userData.file);
      }

      const response = await clientServer.post("/post/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      return thunkAPI.fulfillWithValue(response.data.data.post);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Post not uploaded"
      );
    }
  }
);

export const updatePost = createAsyncThunk(
  "post/updatePost",
  async (payload, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("token", payload.token || getStoredToken());
      formData.append("postId", payload.postId || payload.post_id);
      formData.append("content", payload.content || payload.body || "");
      formData.append("body", payload.content || payload.body || "");
      formData.append("removeMedia", payload.removeMedia ? "true" : "false");

      if (payload.file) {
        formData.append("media", payload.file);
      }

      const response = await clientServer.put("/post/update", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      return thunkAPI.fulfillWithValue(response.data.data.post);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to update post"
      );
    }
  }
);

export const deletePost = createAsyncThunk(
  "post/deletePost",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.delete("/post/delete", {
        data: {
          token: payload.token || getStoredToken(),
          post_id: payload.postId || payload.post_id
        }
      });

      return thunkAPI.fulfillWithValue(response.data.data.postId);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Something went wrong"
      );
    }
  }
);

export const togglePostLike = createAsyncThunk(
  "post/togglePostLike",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.put("/post/like", {
        token: payload.token || getStoredToken(),
        postId: payload.postId || payload.post_id
      });

      return thunkAPI.fulfillWithValue(response.data.data.post);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to update like"
      );
    }
  }
);

export const incrementPostLike = togglePostLike;

export const sharePost = createAsyncThunk(
  "post/sharePost",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.post("/post/share", {
        token: payload.token || getStoredToken(),
        postId: payload.postId || payload.post_id
      });

      return thunkAPI.fulfillWithValue(response.data.data.post);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to share post"
      );
    }
  }
);

export const sharePostInternally = createAsyncThunk(
  "post/sharePostInternally",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.post("/post/share/internal", {
        token: payload.token || getStoredToken(),
        postId: payload.postId || payload.post_id,
        recipientIds: payload.recipientIds || [],
        shareUrl: payload.shareUrl || "",
        shareText: payload.shareText || ""
      });

      return thunkAPI.fulfillWithValue(response.data.data.post);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to share post with LinkVerse users"
      );
    }
  }
);

export const getAllComments = createAsyncThunk(
  "post/getAllComments",
  async (postData, thunkAPI) => {
    try {
      const postId = postData.postId || postData.post_id;
      const response = await clientServer.get("/get_comments", {
        params: {
          post_id: postId
        }
      });

      return thunkAPI.fulfillWithValue({
        comments: response.data,
        postId
      });
    } catch (error) {
      return thunkAPI.rejectWithValue("Something went wrong while loading comments");
    }
  }
);

export const postComment = createAsyncThunk(
  "post/postComment",
  async (commentData, thunkAPI) => {
    try {
      const postId = commentData.postId || commentData.post_id;
      const response = await clientServer.post("/post/comment", {
        token: commentData.token || getStoredToken(),
        postId,
        commentBody: commentData.body
      });

      return thunkAPI.fulfillWithValue({
        postId,
        comment: response.data.data.comment,
        post: response.data.data.post
      });
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Something went wrong"
      );
    }
  }
);

export const repostPost = createAsyncThunk(
  "post/repostPost",
  async (payload, thunkAPI) => {
    try {
      const response = await clientServer.post("/post/repost", {
        token: payload.token || getStoredToken(),
        postId: payload.postId || payload.post_id
      });

      return thunkAPI.fulfillWithValue(response.data.data.post);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Unable to repost post"
      );
    }
  }
);
