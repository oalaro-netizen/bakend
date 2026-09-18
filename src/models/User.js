import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email address"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "user", "moderator"],
      required: true,
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
