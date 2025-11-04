// controllers/AuthController.js
const User = require("../model/User");
const UserProfile = require("../model/UserProfile");
const LoginActivity = require("../model/LoginActivity");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const sendEmail = require("../services/MailService")
// Generate JWT token
const formatDatatoSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id, },
    process.env.JWT_SECRET || "your_jwt_secret",
    { expiresIn: "7d" }
  );

  return {
    access_token,
    profilePhoto: user.profilePhoto,
    username: user.username,
    email: user.email,
    role: user.role,
    permissions: user.permissions || {},
    isVerified: user.isVerified,
  };
};

async function forceLogoutByUserId(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    await LoginActivity.updateMany(
      { userId, status: "active" },
      { $set: { status: "logged_out", logouttime: new Date() } }
    );
    return res.status(200).json({ success: true, message: 'Forced logout (stale sessions closed)' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  // SIGNUP
  async signup(req, res) {
    const { username, email, password } = req.body;
    // 1️⃣ Input validations
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters, include uppercase, lowercase, number, and a special character",
      });
    }

    if (username.length < 3) {
      return res
        .status(400)
        .json({ message: "Username must be at least 3 letters long" });
    }

    try {
      // 2️⃣ Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // 3️⃣ Generate OTP & expiry
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      // 5️⃣ Save user
      const user = new User({
        email: email.toLowerCase(),
        username,
        password,
        verifyOTP: otp,
        otpExpiry,
        isVerified: true, //isVerified : false - changed this to isVerified: true 
      });

      await user.save();
      
      // 🔥 Set restaurantId to user's own _id after user is created
      user.restaurantId = user._id;
      await user.save();
      
      await UserProfile.create({
        userId: user._id,
        email: user.email,
        firstName: "Not set",
        lastName: "Not set",
        restaurantId: user._id,
        phoneNumber: "Not provided",
        address: "Not provided",
        city: "Not provided",
        pinCode: "Not provided",
        gender: "male",
        identity: "Not provided",
        identityNumber: "Not provided",
        fcm: "Not provided",
        facebook: "Not provided",
        instagram: "Not provided",
        whatsapp: "Not provided",
      });
      // 7️⃣ Return response with JWT & user data
      const userData = formatDatatoSend(user);

      return res.status(201).json({
        message: "User registered. OTP sent to email.",
        ...userData,
      });
    } catch (err) {
      console.error("❌ Signup error:", err.stack);
      return res.status(500).json({ message: "Server error during signup" });
    }
  },

  // LOGIN
  async login(req, res) {
    const { email, password } = req.body;

    try {
      // 1. Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not found",
        });
      }

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials (wrong password)",
        });
      }

      // 3. Check if account is verified
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email before logging in",
        });
      }

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      // 4. Find profile (to get restaurantId & categoryId)
      const profile = await UserProfile.findOne({ userId: user._id });
      const profileForOtp = await User.findByIdAndUpdate(user._id, { verifyOTP: otp, otpExpiry }, { new: true });

      // 5. Create JWT
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "7d" }
      );

      //  ye comment kia h sahi chal rha tha
      await sendEmail(
        user.email,
        "Verify Your Account - OTP",
        `Welcome! Your One-Time Password is : ${profileForOtp.verifyOTP} (Valid for only 10 minutes)`
      );

      // 6. Send success response
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          userId: user._id,
          role: user.role,
          permissions: user.permissions || [],
          restaurantId: user.restaurantId || null,
          profileImage: profile?.profileImage || null,
        }
      });

    } catch (error) {
      console.error("❌ Signin error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during signin",
      });
    }
  },

  // VERIFY OTP
  async verifyOtp(req, res) {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      if (user.verifyOTP !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      if (user.otpExpiry < Date.now()) {
        return res.status(400).json({ message: "OTP expired" });
      }

      user.isVerified = true;
      // user.verifyOTP = undefined;
      // user.otpExpiry = undefined;
      await user.save();
      // ✅ FIXED: Return user data directly
      const userData = formatDatatoSend(user);
      return res.status(200).json({
        message: "Account verified successfully",
        ...userData,
      });
    } catch (err) {
      console.error("❌ OTP verification error:", err);
      return res.status(500).json({ message: "Server error during verification" });
    }
  },

  // FORGOT OTP (resend OTP)
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ message: "User not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.resetOTP = otp;
      user.resetOtpExpiry = otpExpiry;
      await user.save();

      // TODO: send OTP via nodemailer here
      // ye comment karr dia h sahi chal rha tha
      await sendEmail(
        user.email,
        "Forgot password - OTP",
        `Welcome! Your One-Time Password is : ${otp} (Valid for only 10 minutes)`
      );
      if (process.env.NODE_ENV !== "production") {
        console.log(`📩 Reset OTP for ${email}: ${otp}`);
      }

      res.json({ message: "Password reset OTP sent to email" });
    } catch (err) {
      console.error("❌ forgotOtp error:", err.stack);
      res.status(500).json({ error: "Server error while sending reset OTP" });
    }
  },
  async resetOtp(req, res) {

    res.json({ message: "Password reset successfully ✅" });
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res
          .status(400)
          .json({ message: "Email, OTP, and new password are required" });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (
        user.resetOTP !== otp ||
        !user.resetOtpExpiry ||
        user.resetOtpExpiry < new Date()
      ) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      user.password = newPassword; // pre-save hook will hash
      user.resetOTP = null;
      user.resetOtpExpiry = null;
      await user.save();

      res.json({ message: "Password reset successfully ✅" });
    } catch (err) {
      console.error("❌ resetOtp error:", err.stack);
      res.status(500).json({ error: "Server error while resetting password" });
    }

  },
  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // find user and exclude password
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // get profile details
      const profile = await UserProfile.findOne({ userId: user._id });

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          isVerified: user.isVerified,
          profilePhoto: user.profilePhoto || null,
        },
        profile: profile || {},
      });
    } catch (err) {
      console.error("❌ getUserProfile error:", err.stack);
      return res.status(500).json({ message: "Server error while fetching profile" });
    }
  },
  async getRestaurantProfile(req, res) {
    try {
      const { restaurantId } = req.params;
      
      console.log("=== RESTAURANT PROFILE REQUEST ===");
      console.log("Requested Restaurant ID:", restaurantId);
      console.log("Restaurant ID type:", typeof restaurantId);
      console.log("Restaurant ID length:", restaurantId ? restaurantId.length : 'N/A');

      if (!restaurantId) {
        console.log("❌ No restaurant ID provided");
        return res.status(400).json({ message: "Restaurant ID is required" });
      }

      // List all restaurants in database for debugging
      const allRestaurants = await UserProfile.find({}, { _id: 1, restaurantId: 1, restaurantName: 1 });
      console.log("All restaurants in database:", allRestaurants.map(r => ({
        _id: r._id,
        restaurantId: r.restaurantId,
        restaurantName: r.restaurantName
      })));

      // Try to find by restaurantId field first
      let restaurant = await UserProfile.findOne({ restaurantId });
      console.log("Search by restaurantId field:", restaurant ? "Found" : "Not found");
      
      // If not found, try to find by _id
      if (!restaurant) {
        console.log("Trying to find by _id...");
        restaurant = await UserProfile.findById(restaurantId);
        console.log("Search by _id:", restaurant ? "Found" : "Not found");
      }

      if (!restaurant) {
        console.log("❌ Restaurant not found in database");
        return res.status(404).json({ message: "Restaurant not found" });
      }

      console.log("✅ Restaurant found:", {
        _id: restaurant._id,
        restaurantId: restaurant.restaurantId,
        restaurantName: restaurant.restaurantName
      });

      return res.status(200).json({
        success: true,
        restaurant,
      });
    } catch (error) {
      console.error("❌ getRestaurantProfile error:", error.stack);
      return res.status(500).json({
        message: "Server error while fetching restaurant profile",
      });
    }
  },
  async getAllUsers(req, res) {
    try {
      const users = await User.find().select("-password");
      res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error("Error fetching users:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error while fetching users",
      });
    }
  },
  async updateUserRole(req, res) {
    try {
      const { role, permissions } = req.body;
      const { id } = req.params; // Get user ID from URL parameter
      const currentUserId = req.userId; // Get current user's ID from middleware
      
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (role) user.role = role;
      if (permissions) {
        // Store permissions as array of strings
        if (Array.isArray(permissions)) {
          user.permissions = permissions;
        } else {
          // Convert object to array if needed
          user.permissions = Object.keys(permissions).filter(key => permissions[key] === true);
        }
      }

      // 🔥 Update restaurantId to current user's _id when role is changed
      // This ensures the user gets access to the same data as the admin who changed their role
      if (role && currentUserId) {
        user.restaurantId = currentUserId;
        console.log(`🔄 Updated user ${user._id} restaurantId to ${currentUserId}`);
      }

      await user.save();
      res.json({
        message: "User updated successfully",
        userId: user._id,
        role: user.role,
        restaurantId: user.restaurantId,
        user,
      });
    } catch (err) {
      console.error("❌ Error updating user role:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // LOGOUT
  async logout(req, res) {
    try {
      const userId = req.actualUserId; // Get actual user ID from middleware
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      console.log('🔍 Logout - User role:', user.role);
      console.log('🔍 Logout - Current restaurantId:', user.restaurantId);
      console.log('🔍 Logout - User _id:', user._id);

      // If user is superadmin, reset restaurantId to their own _id
      if (user.role === 'superadmin') {
        console.log('🔍 Logout - Resetting restaurantId to _id for superadmin');
        user.restaurantId = userId;
        await user.save();
        console.log('🔍 Logout - Updated restaurantId:', user.restaurantId);
      }

      // Update login activity logout time
      try {
        // SABHI active session logout karo - stale session ke liye fix
        await LoginActivity.updateMany({
          userId: userId,
          status: 'active'
        }, {
          $set: { logouttime: new Date(), status: 'logged_out' }
        });
        console.log('🔍 Logout - All active login activities (if any) have been logged out');
      } catch (activityError) {
        console.error('Error updating login activity:', activityError);
        // Don't fail logout if activity update fails
      }

      return res.status(200).json({
        success: true,
        message: "Logout successful",
        data: {
          userId: user._id,
          restaurantId: user.restaurantId,
          role: user.role
        }
      });

    } catch (error) {
      console.error("❌ Logout error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during logout",
      });
    }
  },
  forceLogoutByUserId
};