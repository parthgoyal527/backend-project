// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import mongoose, { connect } from "mongoose";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:"./env"
})
connectDB()// returns promises
.then(()=>{
    app.listen(process.env.PORT|| 8000,()=>{
        console.log(`server is running at port: ${process.env.PORT}`)
    })
    app.on("error",(error)=>{
        console.log("server connection failed",error);
        throw error
    })
})
.catch((error)=>{
    console.log("db connect failed",error);
})





















/*
import express from "express";
const app=express()
(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("ERROR:",error)
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`app is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERROR:",error)
        throw error
    }
})()

*/