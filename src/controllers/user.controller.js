import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        // console.log(accessToken, refreshToken);

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Couldn't generate tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // get user details from frontend
    const { username, email, fullname, password } = req.body

    //checking if fields are empty
    if([username, email, fullname, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    //check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser) {
        throw new ApiError(409, "User already exists")
    }

    console.log(req.files);

    //taking url of images from local server and checking if they exists
    // req.files is a method that we get from express
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLoaclPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage[0].path) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //after checking upload them on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //creating a new user after all checks and creating an entry in the database
    const newUser = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //before sending the response to client remove the password and refreshToken from response
    const createdUser = await User.findById(newUser._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) {
        throw new ApiError(500, "Something went wrong file registering the user")
    }

    // send the response to the client
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!")
    )

})

const loginUser = asyncHandler( async (req, res) => {


    const { username, email, password } = req.body
    console.log(email);

    if( !email ) {
        throw new ApiError(400, "Invalid username or email!")
    }

    // using the mongDB or operator query to find the email or username
    const savedUser = await User.findOne({
        $or: [
            {email},
            {username}
        ]
    })

    if(!savedUser) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await savedUser.isPasswordCorrect(password)
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials")
    }

    // console.log(savedUser);

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(savedUser._id)
    // console.log({accessToken, refreshToken});

    const loggedInUser = await User.findById(savedUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            201,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1  // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(201, {}, "User Logged Out")
    )
})

const refreshAccessToken = asyncHandler( async (req, res) => {

    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken}, 
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid previous password")
    }

    user.password = newPassword
    await user.save(
        {validateBeforeSave: false}
    )

    return res
})

const getCurrentUser = asyncHandler( async (req, res) => {
    const user = User.findById(req.user._id)

    if(!user) {
        throw new ApiError(404, "User Not Found")
    }

    return res.status(200)
    .json(
        201,
        user,
        "Current User Fetched Successfully"
    )
})

const updateAccountDetails = asyncHandler( async (req, res) => {

    const { fullname, email } = req.body

    if(!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const updatedUser = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            updatedUser,
            "Account Details Updated Successfully"
        )
    )
})

const updateUserAvatar = asyncHandler ( async (req, res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar Image Updated Successfully"
        )
    )

})

const updateUserCoverImage = asyncHandler ( async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    )

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Cover Image Updated Successfully"
        )
    )
})

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: $subscribedTo
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
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History Fetched Successfully"
        )
    )
})


export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar,updateUserCoverImage, getWatchHistory, getUserChannelProfile }