import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!videoId) {
        throw new ApiError(400, "Video not found!")
    }

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!")
    }

    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if(likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)

        return res.status(200).json(
            new ApiResponse(201, { isLiked: false}, "Video like status toggled successfully!")
        )
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res.status(200).json(
        new ApiResponse(201, { isLiked: true}, "Video like status toggled successfully!")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    if(!commentId) {
        throw new ApiError(400, "Comment not found!")
    }

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId!")
    }

    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if(likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)

        return res.status(200).json(
            new ApiResponse(201, { isLiked: false}, "Comment like status toggled successfully!")
        )
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res.status(200).json(
        new ApiResponse(201, { isLiked: true}, "Comment like status toggled successfully!")
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!tweetId) {
        throw new ApiError(400, "Tweet not found!")
    }

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId!")
    }

    const likedAlready = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)

        return res.status(200).json(
            new ApiResponse(201, { isLiked: false}, "Tweet like status toggled successfully!")
        )
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res.status(200).json(
        new ApiResponse(201, { isLiked: true}, "Tweet like status toggled successfully!")
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const videos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                likedVideos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    views: 1,
                    duration: 1,
                    ownerDetails: {
                        username: 1,
                        avatar: 1
                    }
                }
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(201, videos, "Liked Videos Fetched Successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}