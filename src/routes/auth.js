import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const router = express.Router();

// ============================
// Passport Session Setup
// ============================
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ============================
// Google OAuth Strategy
// ============================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
        scope: ["profile", "email"],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value.toLowerCase();

          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            user = await User.findOne({ email });

            if (user) {
              user.googleId = profile.id;
              if (!user.username && profile.displayName) {
                user.username = profile.displayName;
              }
              if (!user.avatar && profile.photos && profile.photos[0].value) {
                user.avatar = profile.photos[0].value;
              }
              await user.save();
            } else {
              user = new User({
                googleId: profile.id,
                username: profile.displayName || email.split("@")[0],
                email,
                password: "",
                avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : "",
              });
              await user.save();
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

// ============================
// Auth Routes
// ============================

// Initiate Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/index.html?error=google_auth_failed",
    session: false,
  }),
  async (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign(
        { userId: user._id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
      );

      // Redirect to frontend with token in URL hash
      res.redirect(`http://localhost:${process.env.PORT || 8000}/index.html#token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(`http://localhost:${process.env.PORT || 8000}/index.html?error=server_error`);
    }
  }
);

// Logout route
router.get("/logout", (req, res) => {
  res.redirect("/index.html");
});

export default router;