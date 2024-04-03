import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import mongoose, {isValidObjectId } from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { ApiResponse } from "../utils/apiResponse.js";


const getAllVideos = asyncHandler( async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    if(userId) {
        if(!isValidObjectId(userId)) {
            throw new ApiError(400, "User does not exists")
        }
    }

    // search videos based on query passed
    const searchedVideos = await Video.aggregate([
        {
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"]  //search only on title, desc
                }
            }
        },
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
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

    if(sortBy && sortType) {
        searchedVideos.push(
            {
                $sort: {
                    [sortBy]: sortType == "asc" ? 1:-1
                }
            }
        )
    } else {
        searchedVideos.push({
            $sort: { createdAt: -1 }
        })
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const  videos = Video.aggregatePaginate(searchedVideos, options)

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos Fetched Successfully"
        )
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(title && description) {
        if(title.trim() == "" && description.trim() == "") {
            throw new ApiError(400, "All Fields are required")
        }
    }

    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!(videoLocalPath && thumbnailLocalPath)) {
        throw new ApiError("Video and Thumbnail are required")
    }

    const video = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!video) {
        throw new ApiError("Video File not found")
    }

    if(!thumbnail) {
        throw new ApiError("Thumbnail not found")
    }

    //create a new video in the database
    const newVideo = await Video.create({
        title,
        description,
        videoFile: video.url,
        thumbnail: thumbnail.url,
        duration: video.duration,
        owner: req.user?._id,
        isPublished: false
    })

    const isUploaded = await Video.findById(newVideo._id)
    if(!isUploaded) {
        throw new ApiError(500, "Failed to upload the video. Please try again!")
    }

    res.status(200).json(
        new ApiResponse(
            200,
            newVideo,
            "Video Published Successfully!"
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    if(!isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = Video.aggregate([
        //find the video through videoId
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        //get the count of likes
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        //get the owner from user model
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    //check whether current user is a subscriber or not
                    {
                        $lookup: {
                            from: "subscribers",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        //add fields for like count
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
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
        //include all the added fields in response as $project
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likeCount: 1,
                isLiked: 1
            }
        }
    ])

    if(!video) {
        throw new ApiError(500, "Failed to fetch the Video")
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    })

    return res.status(200).json(
        new ApiResponse(
            201,
            video[0],
            "Video Details Fetched Successfully!"
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    if(!(title && description)) {
        throw new ApiError(400, "Title and Description are required")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video Not Found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You cannot edit this video as you are not the owner")
    }

    const thumbnailLocalPath = req.file?.path
    if(!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail File is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail.url) {
        throw new ApiError(400, "Error while uploading Thumbnail")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        {new: true}
    )

    if(!updatedVideo) {
        throw new ApiError(500, "Failed to update video. Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(
            201,
            updatedVideo,
            "Video Updated Successfully!"
        )
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if(video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You cannot delete this video as you are not the owner")
    }

    const deletedVideo = Video.findByIdAndDelete(videoId)
    if(!deletedVideo) {
        throw new ApiError(500, "Failed to delete the video. Please try again!")
    }

    await deleteFromCloudinary(video.videoFile)
    await deleteFromCloudinary(video.thumbnail)

    //delete video likes
    await Like.deleteMany({
        video: videoId
    })

    //delete video comments
    await Comment.deleteMany({
        video: videoId
    })
     
    return res.status(200).json(
        new ApiResponse(200, {}, "Video Deleted Successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError("Invalid videoId")
    }

    const video = Video.findById(videoId)
    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    if(videoId.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You cannot toggle publish status as you are not the owner")
    }

    const toggle = Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !(video?.isPublished)
            }
        },
        {new: true}
    )

    if(!toggle) {
        throw new ApiError("Failed to toggle publish status. Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(
            200, 
            { isPublished: toggle.isPublished },
            "Publish Status Toggled!"
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}