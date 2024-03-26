import express from "express"
import dotenv from 'dotenv/config'
import dbConnect from "./db/database.js"

const app = express()

app.listen(process.env.PORT, () => {
    dbConnect()
    console.log(`Server running on port ${process.env.PORT}`);
})