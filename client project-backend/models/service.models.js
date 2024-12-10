
import mongoose from "mongoose"

const ServerSchema=new mongoose.Schema({
    server:{
        type:String,
        required:true
    },
    price:{
        type:String,
        required:true
    },
    code:{
        type:String,
        required:true
    },
    otp:{
        type:String,
        required:true
    }
},{timestamps:true})

const ServiceSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    server:{
        type:[ServerSchema],
        required:true

    }
},{timestamps:true})
const Server=mongoose.model("Server",ServerSchema)
const Service=mongoose.model("Service",ServiceSchema)
export {Service,Server}

