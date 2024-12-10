import mongoose from "mongoose"
import dotenv from 'dotenv';
dotenv.config();


const URI=process.env.MONGO_URI

const dbConnect=async ()=>{ 
    await mongoose.connect(URI).then(()=>{
    console.log("MongoDB connected successfully")
})
.catch((err)=>{
    console.log("error while connecting to DB",err)
})
}
export default dbConnect;