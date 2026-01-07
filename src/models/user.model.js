import mongoose from "mongoose";

const userSchema= new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,         //searching field enabled => optimised way
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true,
    },
    avatar:{
        type: String, //cloudinary url
        required:true,

    },
    coverImaqe:{
        type:String, //cloudinary url
    }

},{timestamps:true})


export const User=mongoose.model("User",userSchema)