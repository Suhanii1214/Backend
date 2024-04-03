import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    if(!content) {
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if(!tweet) {
        throw new ApiError(500, "Failed to create a tweet. Please try again!")
    }

    res.status(200).json(
        new ApiResponse(200, tweet, "Tweet Created Successfully!")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params

    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId!")
    }

    const tweets = Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [userId, likes.likedBy]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                likes: {
                    likesCount: 1,
                    isLiked: 1
                }
            }
        }
    ])

    if(!tweets) {
        throw new ApiError(500, "Failed to fetch tweets. Please try again!")
    }

    res.status(200).json(
        new ApiResponse(200, tweets, "Tweets Fetched Successfully!")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId")
    }

    const tweet = Tweet.findById(tweetId)
    if(!tweet) {
        throw new ApiError(400, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Unauthorized access")
    }

    const updatedTweet = Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },
        {new: true}
    )

    if(!updatedTweet) {
        throw new ApiError(500, "Failed to update the tweet. Please try again!")
    }

    res.status(200).json(
        new ApiResponse(
            201,
            updatedTweet,
            "Tweet Updated Successfully"
        )
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId")
    }

    const tweet = Tweet.findById(tweetId)
    if(!tweet) {
        throw new ApiError(400, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Unauthorized access")
    }

    const isDeleted  = await Tweet.findByIdAndDelete(tweetId)

    if(!isDeleted) {
        throw new ApiError(500, "Failed to delete the tweet. Please try again")
    }

    res.status(200).json(
        new ApiResponse(201, isDeleted, "Tweet Deleted Successfully!")
    )

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}