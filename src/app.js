import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//middlewares
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//import routes
import userRouter from "./routes/user.route.js"
import videoRouter from "./routes/video.route.js"
import subscriptionRouter from "./routes/subscription.route.js"
import commentRouter from "./routes/comments.route.js"
import likesRouter from "./routes/likes.route.js"
import playlistRouter from "./routes/playlist.route.js"
import tweetRouter from "./routes/tweet.route.js"


//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/video", videoRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likesRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/tweet", tweetRouter)

export {app}