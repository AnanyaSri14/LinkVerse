import { Router } from "express";
import multer from "multer";
import {
  activeCheck,
  createPost,
  getFeed,
  getAllPosts,
  getPublicPost,
  updatePost,
  deletePost,
  togglePostLike,
  sharePost,
  sharePostToUsers,
  commentPost,
  get_comments_by_post,
  delete_comment_of_user,
  increment_likes,
  repostPost
} from "../controllers/posts.controller.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";

const router=Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });



router.route('/').get(activeCheck);
router.get("/post/public/:postId", getPublicPost);

router.use(verifyAuthToken);

router.post("/post/create", upload.single("media"), createPost);
router.get("/post/feed", getFeed);
router.put("/post/update", upload.single("media"), updatePost);
router.delete("/post/delete", deletePost);
router.put("/post/like", togglePostLike);
router.post("/post/comment", commentPost);
router.post("/post/share", sharePost);
router.post("/post/repost", repostPost);
router.post("/post/share/internal", sharePostToUsers);

router.route("/post").post(upload.single("media"),createPost);
router.get("/posts", getAllPosts);
router.post("/delete_posts", deletePost);

router.post("/comment", commentPost);
router.get("/get_comments", get_comments_by_post);
router.delete("/delete_comment", delete_comment_of_user);
router.post("/increment_post_like", increment_likes);


export default router;
