import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";

const router = Router()

router.use(verifyToken)

router
    .route("/c/:channelId")
    .get(getSubscribedChannels)
    .post(toggleSubscription)

router.route("/u/:subscriberId").get(getUserChannelSubscribers)

export default router