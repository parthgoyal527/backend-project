import { response } from "express"
import {asyncHandler} from "../utils/asyncHandler.js"
import {upload} from "../middlewares/multer.middleware.js"
import  {APIError} from "../utils/APIError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { APIResponse } from "../utils/APIResponse.js"
import jwt  from "jsonwebtoken"
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        // 1. Generate tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // 2. Save refresh token to DB
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        // IMPORTANT: Log the actual error to your terminal
        console.error("TOKEN GENERATION ERROR:", error); 
        
        throw new APIError(500, `Token generation failed: ${error.message}`);
    }
};


const registerUser=asyncHandler(async (req,res)=>{
    //get data from frontend
    //validation
    //alerady exist:username and email
    //images and avatar
    //upload to cloudinary
    // create user object
    //remove the  password and refresh token field from the response
    //chck for the user creation
    //  return res

    const {fullname, username, email, password}=req.body;
    console.log(fullname,username)
    if([fullname, username,email, password].some((field)=>field?.trim()==="")){
        throw new APIError(400, "all fiels are required")
    }
    const existedUser=await User.findOne({$or:[{username}, {email}]})
    if(existedUser){
        throw new APIError(409,"User with username or email alerady existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(!avatarLocalPath){
        throw new APIError(400,"avatar file is required");
    }
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new APIError(400,"avatar file is required");
    }
    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage.url || '',
        email,
        password,
        username:username.toLowerCase(),

    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken "
    )
    if(!createdUser){
        throw new APIError(500,"something went wrong while registering the user")
    }

    res.status(201).json(
        new APIResponse(201,createdUser, "user registered successfully")
    )
})
const loginUser = asyncHandler(async (req, res) => {
    // 1. Get data from request body
    const { username, email, password } = req.body;

    // 2. Validation
    if (!(username || email)) {
        throw new APIError(400, "email or username required");
    }
    if (!password) {
        throw new APIError(400, "password is required");
    }

    // 3. Find the user in the database
    // We assign it to 'user' for clarity
    const user = await User.findOne({
        $or: [{ username: username }, { email: email }]
    });

    if (!user) {
        throw new APIError(404, "User does not exist");
    }

    // 4. Check if password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new APIError(401, "Invalid user credentials");
    }

    // 5. Generate Access and Refresh tokens
    // We pass user._id to our helper function
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // 6. Get user data without sensitive fields for the response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // 7. Set cookie options
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in production
        sameSite: "None", // Important for cross-site cookie handling in Postman/Browsers
        path: "/"
    };

    // 8. Send response with cookies
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new APIResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        );
});

const logOutUser=asyncHandler(async (req,res)=>{
    const userId=req.user._id;
    await User.findByIdAndUpdate(
        userId,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:"/"
    };
    
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new APIResponse(200,{},"user logged out successfully ")
    )
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
    const incomingrefreshToken=req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingrefreshToken){
        throw new APIError(401,"Unauthorized Request")
    }

    const decodedToken=jwt.verify(incomingrefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user=await User.findById(decodedToken?._id)
    if(!user){
        throw new APIError(401,"invalid refresh Token")
    }
    if(incomingrefreshToken !==user?.refreshToken){
        throw new APIError(401,"refresh token is expired or used")
    }
    const options={
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in production
        sameSite: "None", // Important for cross-site cookie handling in Postman/Browsers
        path: "/"
    }
    const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new APIResponse(
            200,
            {accessToken, refreshToken:newRefreshToken},
            "Access Token refreshed"
        )
    )
})


const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const{oldPassword,newPassword, confirmPassword}=req.body;
    if(newPassword!==confirmPassword){
        throw new APIError(400,"confirm Password do not matched")
    }
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new APIError(400,"Invalid Password")
    }
    user.password=newPassword
    await user.save({validateBeforeSave : false})
    return res.status(200).json(
        new APIResponse(200,{},"password changed successfully")
    )

})

const getCurrentUser=asyncHandler(async(req,res)=>{
    const userId=req.user?._id;
    const user=await User.findById(userId)
    if(!user){
        throw new APIError(400,"User Not found")
    }
    return res.status(200).json(
        new APIResponse(200,user,"fetched successfully")
    )

})

const updateAccountDetail=asyncHandler(async(req,res)=>{
    const {fullname , email}=req.body
    if(!fullname && !email){
        throw new APIError(400,"all fields are required")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id
        ,{
            $set:{
                fullname,
                email,
            }
        }
        ,{new:true}
    ).select("-password")
    return res.status(200).json(
        new APIResponse(200,user,"account details updated successfully")
    )

})


const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new APIError(400,"avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new APIError(400,
            "error while uploading the on avatar"
        )
    }
    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        }
        ,{new:true}
    ).select("-password")
    return res.status(200).json(
        new APIResponse(200,user,"AVATAR updated successfully")
    )
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new APIError(400,"coverImage file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new APIError(400,
            "error while uploading the on coverImage"
        )
    }
    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        }
        ,{new:true}
    ).select("-password")
    return res.status(200).json(
        new APIResponse(200,user,"cover imageupdated successfully")
    )
})

export { 
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUserCoverImage,

}