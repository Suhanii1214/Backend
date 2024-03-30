import { Router } from "express";
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyToken, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyToken, changeCurrentPassword)
router.route("/current-user").get(verifyToken, getCurrentUser)
router.route("update-account").patch(verifyToken, updateAccountDetails)

router.route("/avatar").patch(verifyToken, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyToken, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(verifyToken, getUserChannelProfile)
router.route("/history").get(verifyToken, getWatchHistory)

export default router