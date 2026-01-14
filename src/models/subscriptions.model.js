import mongoose from "mongoose";

const subscriptionsSchema=new mongoose.Schema(
    {
        //one who is subscribing
        subscriber:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        channel:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
        },
    },{timestamps:true})

export const Subscription=mongoose.model("Subscription",subscriptionsSchema);