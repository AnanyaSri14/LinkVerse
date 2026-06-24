import mongoose from "mongoose";

const PostSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    originalPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null
    },
    body: {
      type: String,
      default: ""
    },
    content: {
      type: String,
      default: ""
    },
    likes: {
      type: Number,
      default: 0
    },
    likedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    comments: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Comment",
      default: []
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    sharesCount: {
      type: Number,
      default: 0
    },
    media: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    active: {
      type: Boolean,
      default: true
    },
    fileType: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

PostSchema.pre("validate", function syncLegacyPostFields(next) {
  if (!this.content && this.body) {
    this.content = this.body;
  }

  if (!this.body && this.content) {
    this.body = this.content;
  }

  if (!this.image && this.media) {
    this.image = this.media;
  }

  if (!this.media && this.image) {
    this.media = this.image;
  }

  this.likes = this.likedBy.length;
  this.commentsCount = this.comments.length;

  next();
});

const Post = mongoose.model("Post", PostSchema);

export default Post;
