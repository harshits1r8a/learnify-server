 
import jwt from "jsonwebtoken";

import AppError from "../utils/error.util.js";
const isLoggedIn = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return next(new AppError("Unothenticated, Please login again!"));
    }

    const userDetails = await jwt.verify(token, process.env.JWT_SECRET);

    req.user = userDetails;
  } catch (error) {
    return next(new AppError(`Error in isLogedIn middleware : ${error.message} : `, 400))
  }

  next();
};

export { isLoggedIn };
