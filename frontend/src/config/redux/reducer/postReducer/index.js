import { createSlice } from "@reduxjs/toolkit";
import {
  fetchFeed,
  createPost,
  updatePost,
  deletePost,
  togglePostLike,
  sharePost,
  sharePostInternally,
  getAllComments,
  postComment,
  repostPost
} from "@/config/redux/action/postAction";

const replacePostInList = (posts, nextPost) => {
  return posts.map((post) => (post._id === nextPost._id ? nextPost : post));
};

const mergePosts = (currentPosts, nextPosts) => {
  const mergedPosts = [...currentPosts];

  nextPosts.forEach((nextPost) => {
    const existingIndex = mergedPosts.findIndex((post) => post._id === nextPost._id);

    if (existingIndex >= 0) {
      mergedPosts[existingIndex] = nextPost;
    } else {
      mergedPosts.push(nextPost);
    }
  });

  return mergedPosts;
};

const initialState = {
  posts: [],
  isError: false,
  postFetched: false,
  isLoading: false,
  message: "",
  comments: [],
  postId: "",
  feedFilter: "latest",
  page: 1,
  hasMore: true,
  feedLoading: false,
  feedRefreshing: false,
  actionLoading: false
};

const postSlice = createSlice({
  name: "post",
  initialState,
  reducers: {
    reset: () => initialState,
    resetPostId: (state) => {
      state.postId = "";
      state.comments = [];
    },
    setFeedFilter: (state, action) => {
      state.feedFilter = action.payload;
      state.page = 1;
      state.hasMore = true;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state, action) => {
        state.feedLoading = true;
        state.feedRefreshing = !action.meta.arg?.append;
        state.message = "Fetching posts...";
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.feedLoading = false;
        state.feedRefreshing = false;
        state.isLoading = false;
        state.isError = false;
        state.postFetched = true;
        state.feedFilter = action.payload.filter;
        state.page = action.payload.pagination.page;
        state.hasMore = action.payload.pagination.hasMore;
        state.posts = action.payload.append
          ? mergePosts(state.posts, action.payload.posts)
          : action.payload.posts;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.feedLoading = false;
        state.feedRefreshing = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createPost.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.posts = [action.payload, ...state.posts];
        state.message = "Post uploaded";
      })
      .addCase(createPost.rejected, (state, action) => {
        state.actionLoading = false;
        state.message = action.payload;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.posts = replacePostInList(state.posts, action.payload);
        state.message = "Post updated";
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((post) => post._id !== action.payload);
        if (state.postId === action.payload) {
          state.postId = "";
          state.comments = [];
        }
        state.message = "Post deleted";
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(togglePostLike.pending, (state, action) => {
        const postId = action.meta.arg?.postId || action.meta.arg?.post_id;
        const currentUserId = action.meta.arg?.currentUserId;
        const post = state.posts.find((currentPost) => currentPost._id === postId);

        if (!post || !currentUserId) {
          return;
        }

        if (post.likedByCurrentUser) {
          post.likes = Math.max((post.likes || 0) - 1, 0);
        } else {
          post.likes = (post.likes || 0) + 1;
        }

        post.likedByCurrentUser = !post.likedByCurrentUser;
      })
      .addCase(togglePostLike.fulfilled, (state, action) => {
        state.posts = replacePostInList(state.posts, action.payload);
      })
      .addCase(togglePostLike.rejected, (state, action) => {
        const postId = action.meta.arg?.postId || action.meta.arg?.post_id;
        const post = state.posts.find((currentPost) => currentPost._id === postId);

        if (post) {
          if (post.likedByCurrentUser) {
            post.likes = Math.max((post.likes || 0) - 1, 0);
          } else {
            post.likes = (post.likes || 0) + 1;
          }

          post.likedByCurrentUser = !post.likedByCurrentUser;
        }

        state.message = action.payload;
      })
      .addCase(sharePost.fulfilled, (state, action) => {
        state.posts = replacePostInList(state.posts, action.payload);
      })
      .addCase(sharePost.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(sharePostInternally.fulfilled, (state, action) => {
        state.posts = replacePostInList(state.posts, action.payload);
      })
      .addCase(sharePostInternally.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(getAllComments.fulfilled, (state, action) => {
        state.postId = action.payload.postId;
        state.comments = action.payload.comments;
      })
      .addCase(getAllComments.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(postComment.fulfilled, (state, action) => {
        state.comments = state.postId === action.payload.postId
          ? [action.payload.comment, ...state.comments]
          : state.comments;
        state.posts = replacePostInList(state.posts, action.payload.post);
      })
      .addCase(postComment.rejected, (state, action) => {
        state.message = action.payload;
      })
      .addCase(repostPost.fulfilled, (state, action) => {
        state.posts = [action.payload, ...state.posts];
        state.message = "Post reposted successfully";
      })
      .addCase(repostPost.rejected, (state, action) => {
        state.message = action.payload;
      });
  }
});

export const { resetPostId, setFeedFilter } = postSlice.actions;
export default postSlice.reducer;
