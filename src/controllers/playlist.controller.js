import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist

    if(!(name && description)) {
        throw new ApiError(400, "Name and Description are required!")
    }

    const playlist = await Playlist.create({
        name, 
        description,
        owner: req.user?._id
    })

    if(!playlist) {
        throw new ApiError(500, "Failed to create playlist. Please try again!")
    }

    return res.staus(200).json(
        new ApiResponse(200, playlist, "Playlist Created Successfully!")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId!")
    }

    const userPlaylist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                videoCount: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                videoCount: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ])

    if(!userPlaylist) {
        throw new ApiError(500, "Failed to Fetch User Playlists. Please try again")
    }

    return res.status(200).json(
        new ApiResponse(200, userPlaylist, "Playlists Fetched Successfully!")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!")
    }

    const playlist = Playlist.findById(playlistId)

    if(!playlist) {
        throw new ApiError(500, "Playlist not found. Please try again!")
    }

    const playlistVideos = Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match: {
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1
                },
                owner: {
                    username: 1,
                    fullname: 1,
                    avatar: 1
                }
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist Fetched Successfully!")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!")
    }

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(500, "Playlist Not Found!")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(500, "Video Not Found!")
    }

    if((playlist.owner.toString() && video.owner.toString()) !== req.user?._id.toString()) {
        throw new ApiError(400, "Unauthorized Access")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        }, {new: true}
    )

    if(!updatedPlaylist) {
        throw new ApiError(500, "Failed to add the video. Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video Added to Playlist Successfully!")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!")
    }

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(500, "Playlist Not Found!")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(500, "Video Not Found!")
    }

    if((playlist.owner.toString() && video.owner.toString()) !== req.user?._id.toString()) {
        throw new ApiError(400, "Unauthorized Access")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        }, {new: true}
    )

    if(!updatedPlaylist) {
        throw new ApiError(500, "Failed to remove the video. Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video Removed from the Playlist Successfully!")
    )

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!")
    }

    const playlist = await Playlist.findById(playlistId)

    if(playlist.owner.toString() !== req.user?._id) {
        throw new ApiError(400, "Unauthorized Access")
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if(!deletedPlaylist) {
        throw new ApiError(500, "Failed to delete the playlist. Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist Deleted Successfully!")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!")
    }

    if(!(name && description)) {
        throw new ApiError(400, "Name and Description are required")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    if(playlist.owner.toString() !== req.user?._id) {
        throw new ApiError(400, "Unauthorized Access")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description
            }
        }, {new: true}
    )

    if(!updatedPlaylist) {
        throw new ApiError(500, "Failed to update playlist details. Please try again!")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Playlist details updated Successfully!")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}