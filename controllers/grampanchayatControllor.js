import jwt from "jsonwebtoken";
import { loginGrampanchatSchema } from "../middleware/validator.js";
import GrampanchayatModel from "../models/grampanchayatModel.js";
import {
  comparePassword,
} from "../utils/hashing.js"; // assuming you have these utility functions

const loginGrampanchayat = async (req, res) => {
  const { gstNo, grampanchayatPassword } = req.body;
  
  console.log("req.body : ", req.body);
  

  try {
    // Validate the request body
    const { error } = loginGrampanchatSchema.validate({ gstNo, grampanchayatPassword });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    // Find staff member by email
    const existingGrampanchayat = await GrampanchayatModel
      .findOne({ gstNo })
      .select("+grampanchayatPassword");


    if (!existingGrampanchayat) {
      return res.status(401).json({
        success: false,
        message: "You are not registered as a Grampanchayat member!",
      });
    }

    // Compare password
    const result = await comparePassword(
      grampanchayatPassword,
      existingGrampanchayat.grampanchayatPassword
    );
    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials!" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        gpId: existingGrampanchayat._id,
        gstNo: existingGrampanchayat.gstNo,
        verified: existingGrampanchayat.verified,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRE }
    );

    // Set cookie and send response
    res
      .cookie("Authorization", "Bearer " + token, {
        expires: new Date(Date.now() + 8 * 3600000), // 8 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      })
      .json({
        success: true,
        token,
        message: "Logged in successfully",
        existingGrampanchayat,
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong in Grampanchayat login",
    });
  }
};

const getGrampanchayat = async (req, res) => {
  try {
    // Extract the staffId from the token or session
    const gpId = req.Grampanchayat.gpId; // Assuming the staffId is attached to the request via authentication middleware

    // Fetch the staff member using the staffId from the database
    const existingGrampanchayat = await GrampanchayatModel.findById(gpId);

    if (!existingGrampanchayat) {
      return res
        .status(404)
        .json({ success: false, message: "Gram Panchayat not found" });
    }

    // Return the staff data as a response
    // The response will include all staff data including staffName, staffEmail,
    // staffMobileNo, and staffImage (if present)
    return res.status(200).json({
      success: true,
      existingGrampanchayat,
    });
  } catch (error) {
    // Handle any errors during fetching staff data
    console.error("Error fetching GramPanchayat data: ", error.message);
    return res.status(500).json({
      success: false,
      message: error.message + " in catch block of getGrampanchayat function",
    });
  }
};

export {
  loginGrampanchayat,
  getGrampanchayat,
};