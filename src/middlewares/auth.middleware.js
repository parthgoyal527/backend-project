import { User } from "../models/user.model.js"; 
import { APIError } from "../utils/APIError.js"; 
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    // 1. LOG THE INCOMING DATA
    console.log("--- DEBUG START ---");
    console.log("COOKIES:", req.cookies);
    console.log("AUTH HEADER:", req.header("Authorization"));

    try {
        // 2. Extract the token
        let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        console.log("Extracted Token Value:", token);
        console.log("Token Type:", typeof token);
        console.log("--- DEBUG END ---");

        // 3. Validation
        if (!token || typeof token !== "string") {
            throw new APIError(401, "Unauthorized request: No token provided or token is not a string");
        }

        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error("Internal Server Error: JWT Secret is missing in .env");
        }
    
        // 4. Verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        // 5. Find the user
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!user) {
            throw new APIError(401, "Invalid Access Token: User not found");
        }
    
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof APIError) throw error;
        throw new APIError(401, error?.message || "Invalid access token");
    }
});