import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String, 
        required: true,
    },
    coverImage: { // Fixed typo: changed 'coverImaqe' to 'coverImage'
        type: String, 
    },
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
        }
    ],
    password: {
        type: String,
        required: [true, "please enter the password"],
    },
    refreshToken: {
        type: String,
    }
}, { timestamps: true });

// Hash password before saving

// REMOVE 'next' from the parameters
userSchema.pre("save", async function () { 
    // If password isn't modified, just return to stop execution of this hook
    if (!this.isModified("password")) return;

    // Hash the password
    this.password = await bcrypt.hash(this.password, 10);
    
    // No need to call next() in an async function!
    // Mongoose will proceed once this function finishes.
});

// Method to check password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// FIX: Removed 'async' and 'await' so these return STRINGS immediately
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const User = mongoose.model("User", userSchema);