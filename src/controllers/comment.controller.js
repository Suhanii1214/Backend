import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import { Video } from "../models/video.model.js";
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Like } from "../models/like.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const commentsAggregate = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        }, 
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$ownerDetails"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    avatar: 1
                },
                isLiked: 1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const comments = Comment.aggregatePaginate({
        commentsAggregate,
        options
    })

    return res.status(200).json(
        new ApiResponse(
            201,
            comments,
            "Comments Fetched Successfully!"
        )
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!")
    }

    if(!content) {
        throw new ApiError(400, "Content is required")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const createComment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if(!createComment) {
        throw new ApiError(400, "Failed to add a comment, Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(201, createComment, "Comment added successfully!")
    )

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId")
    }

    if(!content) {
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.findById(commentId)

    if(comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "Unauthorized access")
    }

    const updatedComment = Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        { new: true}
    )

    if(!updatedComment) {
        throw new ApiError(500, "Failed to update the comment. Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(201, updatedComment, "Comment updated successfully!")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId")
    }

    const comment = await Comment.findById(commentId)

    if(comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Unauthorized Access")
    }

    await Comment.findByIdAndDelete(commentId)

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res.status(200).json(
        new ApiResponse(200, {commentId}, "Comment Deleted Successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}