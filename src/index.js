import dotenv from 'dotenv/config'
import dbConnect from "./db/database.js"
import { app } from "./app.js"

dbConnect()
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    })
}).catch((err) => {
    console.log(`MongoDB Connection FAILED! ${err}`);
})