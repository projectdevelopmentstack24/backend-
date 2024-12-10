import axios from "axios";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

// Sign-in function (both Google and Email Sign-In)
const signin = async (req, res) => {
  try {
    const { token, email, password, confirmPassword, captchaToken } = req.body;

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
      console.log(jwtToken)

      // Send the JWT and user info back to the frontend
      return res.status(200).json({ message: 'Login successful', token: jwtToken, user });
    }

    // 2. Handle Normal Email & Password Sign-In (for non-Google users)
    if (email && password && confirmPassword) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
      }
           const user = await User.findOne({ email }); // Find user by email in the database

          if (user) {
      // If the email already exists, return an error message
             return res.status(400).json({ message: "Email already in use." });}

      // 3. Verify the Cloudflare captcha (optional, can be skipped for now)
      // const captchaResponse = await axios.post(
      //     'https://www.google.com/recaptcha/api/siteverify',
      //     {},
      //     {
      //         params: {
      //             secret: process.env.CAPTCHA_SECRET_KEY,
      //             response: captchaToken,
      //         },
      //     }
      // );
      // if (!captchaResponse.data.success) {
      //     return res.status(400).json({ message: 'Captcha verification failed.' });
      // }

      // 4. Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 5. Fetch TRX address and private key (optional, if needed)
      const response = await axios.get('https://own5k.in/tron/?type=address');
      const trxAddress = response.data?.address;
      const trxPrivateKey = response.data?.privatekey;

      if (!trxAddress || !trxPrivateKey) {
        throw new Error("TRX details are missing from API response");
      }

      // 6. Create a verification token for email verification
      const verificationToken = Math.random().toString(36).substring(2, 15);

      // 7. Save the new user to the database
      const newUser = new User({
        email,
        password: hashedPassword,
        trxAddress,
        trxPrivateKey,
        isEmailVerified: false, // Initially set as unverified
        verificationToken,
        verificationTokenExpiry: Date.now() + 3600000, // Token expires in 1 hour
      });

      await newUser.save();

      // 8. Send a verification email
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      const verificationUrl = `${process.env.FRONTEND_URL}/api/user/verifyEmail/${verificationToken}`;

      await transporter.sendMail({
        to: email,
        subject: 'Verify your email',
        html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
      });

      // 9. Respond to the client (instruct the user to verify their email)
      return res.status(201).json({ message: 'Signup successful! Please verify your email.' });
    }

    // Handle cases where neither Google token nor email/password is provided
    return res.status(400).json({ message: 'Please provide valid email and password or Google sign-in token.' });
  } catch (error) {
    console.error('Error in signin:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};







// Email Verification Function
const verifyEmail = async (req, res) => {
    const { token } = req.params;
  
    try {
      const user = await User.findOne({ verificationToken: token });
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }
  
      // Check if the token has expired
      if (user.verificationTokenExpiry < Date.now()) {
        return res.status(400).json({ message: 'Token has expired.' });
      }
  
      // Mark the user's email as verified
      user.isEmailVerified = true;
      await user.save();
  
      // Generate a JWT after email verification
      const jwtToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET, 
        { expiresIn: '1h' } 
      );

  
      res.status(200).json({ message: 'Email verified successfully.', token: jwtToken });
    } catch (err) {
      console.error('Error verifying email:', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  };
  
export { signin, verifyEmail };
