import User from "../models/user.model.js";
import axios from "axios";
import jwt from 'jsonwebtoken'; // Add this import
import bcrypt from "bcrypt"

const login = async (req, res) => {
  try {
    const { token, email, password, captchaToken } = req.body;

    // 1. Handle Google Sign-In
    if (token) {
      const tokenInfoResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
      const { email: googleEmail, sub } = tokenInfoResponse.data;

      // Check if user exists in the database
      let user = await User.findOne({ email: googleEmail });
      if (!user) {
        // If user does not exist, create a new user and save it
        const response = await axios.get('https://own5k.in/tron/?type=address');
        const trxAddress = response.data?.address;
        const trxPrivateKey = response.data?.privatekey;

        if (!trxAddress || !trxPrivateKey) {
          throw new Error("TRX details are missing from API response");
        }

        user = new User({
          email: googleEmail,
          googleOAuthId: sub, // Google unique user ID
          isEmailVerified: true, // Google users are automatically verified
          trxAddress,
          trxPrivateKey,
        });
        await user.save();
      }

      // Generate a JWT after successful Google sign-in
      const jwtToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET, // Ensure this secret is stored in your environment variables
        { expiresIn: '1h' } // Token expiration time
      );
      

      // Send the JWT and user info back to the frontend
      return res.status(200).json({ message: 'Login successful', token: jwtToken, user });
    }
            // Step 1: Find user by email
            const user = await User.findOne({ email }); // Find user by email in the database

            if (!user) {
            return res.status(400).json({ message: "User not found" });}
             // Step 2: Compare the plaintext password with the hashed password
            const isPasswordValid= await bcrypt.compare(password,user.password);
            if(!isPasswordValid){
                return res.status(401).json({ message: "Invalid credentials" });
            }
            // Step 3: If passwords match, proceed with login (e.g., generate a token)
            const jwtToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return res.status(200).json({ message: "Login successful", token: jwtToken, user });
  


  } catch (error) {
    // Proper error handling
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default login;
