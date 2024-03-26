import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const dbConnect = async () => {
    try {
        const connectionInstance = mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB Connection SUCCESSFULL!`);
    } catch (error) {
        console.log(`MongoDB Connection FAILED: ${error}`);
        process.exit(1)
    }
}

export default dbConnect