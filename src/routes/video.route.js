import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.use(verifyToken)

router.route("/").get(getAllVideos)

router.route("/publish-video").post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAVideo
)

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo)

router.route("/toggle/publish/:videoId").patch(togglePublishStatus)


export default router