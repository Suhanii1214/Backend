import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId")
    }

    const isSubscribed = await Subscription.findById({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed._id)

        return res.status(200).json(
            new ApiResponse(
                201,
                { subscribed: false},
                "User Unsubscribed Successfully!"
            )
        )
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    return res.status(200).json(
        201,
        { subscribed: true},
        "User Subscribed Succesfully!"
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params

    if(!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid channelId!")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $replaceRoot: {
                newRoot: "#subscriber"
            }
        }
    ])

    if(!subscribers) {
        throw new ApiError(400, "Subscribers not found")
    }

    return res.status(200).json(
        new ApiResponse(
            201,
            subscribers,
            "Subscribers Fetched Successfully"
        )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if(!channelId) {
        throw new ApiError(400, "No subscriberId found!")
    }

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid subscriberId!")
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "susbcriber",
                foreignField: "_id",
                as: "channels",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        }
    ])

    if(!channels) {
        throw new ApiError(400, "Channels not found")
    }

    return res.status(200).json(
        new ApiResponse(
            201,
            channels,
            "Channels Fetched Successfully!"
        )
    )

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}