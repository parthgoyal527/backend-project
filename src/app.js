import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser" // transaction of cookie between user and server


const app=express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"})) // limit to data to be sent as json default parsing is used in express earlier cookie-parser and multer is used
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


export {app}