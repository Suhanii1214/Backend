import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";

const router = Router()

router.route(verifyToken)

router.route("/").post(createPlaylist)

router
    .route("/:playlistId")
    .get(getPlaylistById)
    .delete(deletePlaylist)
    .patch(updatePlaylist)

router.route("/add/:videoId/:playlistLid").post(addVideoToPlaylist)
router.route("/remove/:videoId/:playlistLid").post(removeVideoFromPlaylist)

router.route("/user/:userId").get(getUserPlaylists)

export default router