import cloudinary from "cloudinary";
import crypto from "crypto";
import emailValidator from "email-validator";
import fs from "fs/promises";

import AppError from "../utils/error.util.js";
import User from "../models/user.model.js";
import sendEmail from "../utils/sendEmail.js";
// import path from "path";

const cookieOptions = {
  maxAge: 24 * 60 * 60 * 1000, //7 days
  httpOnly: true,
  sequre: true,
};

const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return next(new AppError("All feilds are required!", 400));
    }

    const validEmail = emailValidator.validate(email);
    if (!validEmail) {
      return next(new AppError("Please enter valid email!", 400));
    }

    const userExist = await User.findOne({ email });

    if (userExist) {
      return next(new AppError("User already Exsist!", 400));
    }

    // step 1 user create
    const user = await User.create({
      fullName,
      email,
      password,
      // avatar: {
      //   public_id: email,
      //   secure_url: "",
      // },
    });

    //  check user
    if (!user) {
      return next(
        new AppError("User registration failed!, please try again..", 400)
      );
    }

    // step2 profile photo upload
    console.log("FFFFFFF detail:", JSON.stringify(req.file));

    // if (req.file) {
    //   try {
    //     const UPLOAD_PRESET = 'ml_default' || 'uns9s79z'; // Replace with your actual upload preset
    //     const result = await cloudinary.v2.uploader.upload(
    //       req.file.path,
    //       {
    //         upload_preset: UPLOAD_PRESET, // Use the upload preset here
    //         folder: "learnify",
    //         width: 250,
    //         height: 250,
    //         gravity: "faces",
    //         crop: "fill",
    //       }
    //     );
    //     console.log("RESULT : ", result); // Log the result here

    //     if (result && result.public_id && result.secure_url) {
    //       user.avatar.public_id = result.public_id;
    //       user.avatar.secure_url = result.secure_url;
    //     } else {
    //       console.error("Invalid upload result:", result);
    //     }
    //     // Remove file from server
    //     fs.rm(`./uploads/${req.file.filename}`);
    //   } catch (error) {
    //     console.error("Upload error:", error);
    //     return next(new AppError("File not upload, please try again", 500));
    //   }
    // }

    await user.save();

    user.password = undefined;

    // Token to ensure no need to login after registration
    const token = await user.generateJWTToken();

    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      success: true,
      message: "User registerd successfully",
      user,
    });
  } catch (error) {
    return next(
      new AppError(`Error in Registration controller :${error.message} `, 400)
    );
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("All feilds are required!", 400));
    }

    const user = await User.findOne({
      email,
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Password does not match!"));
    }
    const token = await user.generateJWTToken();

    user.password = undefined;

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "User loggedin successfully",
      user,
    });
  } catch (error) {
    return next(
      new AppError(`Error in LogIn controller : ${error.message}`, 400)
    );
  }
};

const logout = (req, res, next) => {
  try {
    res.cookie("token", null, {
      maxAge: 0,
      sequre: true,
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: "User loggedout successfully",
    });
  } catch (error) {
    return next(
      new AppError(`Error in LogOut controller : ${error.message}`, 400)
    );
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      message: "User detail",
      user,
    });
  } catch (error) {
    return next(
      new AppError(`Error in getProfile controller : ${error.message}`, 400)
    );
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  const user = await User.findOne({ email });
  // console.log(user);

  if (!user) {
    return next(new AppError("Email not registered", 400));
  }

  const resetToken = await user.generatePasswordResetToken();

  await user.save();

  // URL
  const resetPasswordURL = `${process.env.FRONTEND_URL}/reset/password/${resetToken}`;
  console.log(resetPasswordURL);

  const subject = "Reset Password";
  const message = `You can reset your password by clicking ${resetPasswordURL} Reset your password</$>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordURL}.\n If you have not requested this, kindly ignore.`;
  // send Email
  try {
    await sendEmail(email, subject, message);

    res.status(200).json({
      success: true,
      message: `Reset password token has been sent to ${email} successfully`,
    });
  } catch (error) {
    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;
    await user.save();
    return next(
      new AppError(`Error in Forgot Password : ${error.message}`, 400)
    );
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken } = req.params;

    const { password } = req.body;

    if (!password) {
      return next(new AppError(`Password is required!`, 400));
    }
    const forgotPasswordToken = await crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      forgotPasswordToken,
      forgotPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new AppError("Token is invalid or expired, please try again", 400)
      );
    }

    user.password = password;
    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;

    await user.save();
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return next(new AppError(`Error in resetPassword ${error.message}`, 500));
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return next(new AppError(`All feilds are required!`, 400));
    }

    const { id } = req.user.id;
    const user = await User.findById(id).select("+password");

    if (!user) {
      return next(
        new AppError(
          `Tocken is invalid or expired ! loggin again : ${error.message}`,
          400
        )
      );
    }

    const isPasswordValiid = await user.comparePassword(oldPassword);

    if (!isPasswordValiid) {
      return next(new AppError(`Please enter valid old password`, 400));
    }

    user.password = newPassword;
    await user.save();

    user.password = undefined;
    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return next(
      new AppError(`Error in changePassword controller : ${error.message}`, 400)
    );
  }
};

const updateUser = async (req, res, next) => {
  const { fullName } = req.body;
  const { id } = req.user.id;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError(`User does not exist : `, 400));
  }

  if (req.fullName) {
    req.fullName = fullName;
  }

  if (req.file) {
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    // if (req.file) {
    //   try {
    //     const UPLOAD_PRESET = 'ml_default' || 'uns9s79z'; // Replace with your actual upload preset
    //     const result = await cloudinary.v2.uploader.upload(
    //       req.file.path,
    //       {
    //         upload_preset: UPLOAD_PRESET, // Use the upload preset here
    //         folder: "learnify",
    //         width: 250,
    //         height: 250,
    //         gravity: "faces",
    //         crop: "fill",
    //       }
    //     );
    //     console.log("RESULT : ", result); // Log the result here

    //     if (result && result.public_id && result.secure_url) {
    //       user.avatar.public_id = result.public_id;
    //       user.avatar.secure_url = result.secure_url;
    //     } else {
    //       console.error("Invalid upload result:", result);
    //     }
    //     // Remove file from server
    //     fs.rm(`./uploads/${req.file.filename}`);
    //   } catch (error) {
    //     console.error("Upload error:", error);
    //     return next(new AppError("File not upload, please try again", 500));
    //   }
    // }
  }

  await user.save()
  res.status(200).json({
    success: true,
    message: "User detail updated successfully",
  });
};

export {
  forgotPassword,
  getProfile,
  login,
  logout,
  register,
  resetPassword,
  changePassword,
  updateUser,
};
