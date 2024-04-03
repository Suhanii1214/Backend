import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";

const router = Router()

router.use(verifyToken)

router
    .route("/:videoId")
    .get(getVideoComments)
    .post(addComment)
    
router
    .route("/:commentId")
    .delete(deleteComment)
    .patch(updateComment)

export default router