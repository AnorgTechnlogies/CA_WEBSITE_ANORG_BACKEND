import jwt from "jsonwebtoken";
import doctorModel from "../models/staffModel.js";
import allDeductionModel from "../models/allDeductionModel.js"
import {
  comparePassword,
  hashPassword,
  hmacProcess,
} from "../utils/hashing.js"; // assuming you have these utility functions
import {
  loginSchema,
  changePasswordSchema,
  sendVerificationCodeSchema,
  acceptCodeSchema,
  addGrampanchayatSchema,
  sendForgotPasswordCodeForStaffSchema,
  acceptFPCodeForStaffSchema,
} from "../middleware/validator.js";

import transport from "../middleware/sendMail.js";
import { updateDoctorSchema } from "../middleware/validator.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

import axios from "axios";
// Doctor Login
const loginStaff = async (req, res) => {
  const { staffEmail, staffPassword } = req.body;

  try {
    // Validate the request body
    const { error } = loginSchema.validate({ staffEmail, staffPassword });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    // Find staff member by email
    const existingStaff = await staffModel
      .findOne({ staffEmail })
      .select("+staffPassword");

    if (!existingStaff) {
      return res.status(401).json({
        success: false,
        message: "You are not registered as a staff member!",
      });
    }

    // Compare password
    const result = await comparePassword(
      staffPassword,
      existingStaff.staffPassword
    );
    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials!" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        staffId: existingStaff._id,
        staffEmail: existingStaff.staffEmail,
        verified: existingStaff.verified,
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
        existingStaff,
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong in staff login",
    });
  }
};

const getStaff = async (req, res) => {
  try {
    // Extract the staffId from the token or session
    const staffId = req.staff.staffId; // Assuming the staffId is attached to the request via authentication middleware

    // Fetch the staff member using the staffId from the database
    const existingStaff = await staffModel.findById(staffId);

    if (!existingStaff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    // Return the staff data as a response
    // The response will include all staff data including staffName, staffEmail,
    // staffMobileNo, and staffImage (if present)
    return res.status(200).json({
      success: true,
      existingStaff,
    });
  } catch (error) {
    // Handle any errors during fetching staff data
    console.error("Error fetching staff data: ", error.message);
    return res.status(500).json({
      success: false,
      message: error.message + " in catch block of getStaff function",
    });
  }
};

const addGrampanchayat = async (req, res) => {
  const {
    gramAdhikariName,
    gstNo,
    gpMobileNumber,
    state,
    district,
    tahsil,
    grampanchayat,
    gpAgreementAmount,
    grampanchayatPassword,
  } = req.body;

  const staffId = req.staff.staffId;

  // Check if grampanchayat already exists with the GST number
  const existingGrampanchayat = await GrampanchayatModel.findOne({ gstNo });

  if (existingGrampanchayat) {
    return res.status(400).json({
      success: false,
      message: "Grampanchayat with this GST number already exists",
    });
  }

  try {
    // Validate incoming data using Joi schema
    const { error, value } = addGrampanchayatSchema.validate({
      gramAdhikariName,
      gstNo,
      gpMobileNumber,
      state,
      district,
      tahsil,
      grampanchayat,
      gpAgreementAmount,
      grampanchayatPassword,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Hash the password
    const hashedPassword = await hashPassword(grampanchayatPassword, 12);

    // Grampanchayat data to be saved
    const grampanchayatData = {
      gramAdhikariName,
      gstNo,
      gpMobileNumber,
      state,
      district,
      tahsil,
      grampanchayat,
      gpAgreementAmount,
      grampanchayatPassword: hashedPassword,
      createdAt: Date.now(),
    };

    // Upload image to Cloudinary if file is present
    if (req.file) {
      const { path: imageTempPath } = req.file;

      if (imageTempPath) {
        try {
          const cloudinaryResponse = await cloudinary.uploader.upload(
            imageTempPath,
            {
              folder: "GRAMPANCHAYAT_IMAGES",
            }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(imageTempPath);
            return res.status(500).json({
              success: false,
              message: "Failed to upload image to Cloudinary",
            });
          }

          grampanchayatData.gpImage = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
          };

          // Remove temporary file from the server
          fs.unlinkSync(imageTempPath);
        } catch (error) {
          fs.unlinkSync(imageTempPath);
          return res.status(500).json({
            success: false,
            message: "Error occurred while uploading the image",
          });
        }
      }
    }

    // Save new grampanchayat to the database
    const newGrampanchayat = new GrampanchayatModel(grampanchayatData);
    await newGrampanchayat.save();

    // Update the staff model with the new grampanchayat ID
    const updatedStaff = await staffModel.findByIdAndUpdate(
      staffId,
      {
        $push: { grampanchayats: newGrampanchayat._id },
      },
      { new: true }
    );

    if (!updatedStaff) {
      // If staff update fails, delete the created grampanchayat to maintain consistency
      await GrampanchayatModel.findByIdAndDelete(newGrampanchayat._id);
      return res.status(500).json({
        success: false,
        message: "Failed to associate grampanchayat with staff member",
      });
    }

    res.status(201).json({
      success: true,
      message: "Grampanchayat Added Successfully",
      data: newGrampanchayat,
    });
  } catch (error) {
    console.error("Error in addGrampanchayat:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getStaffGrampanchayats = async (req, res) => {
  try {
    // Extract the staffId from the token or session
    const staffId = req.staff.staffId;

    // Fetch the staff member and populate the grampanchayats field
    const staffWithGrampanchayats = await staffModel
      .findById(staffId)
      .select("grampanchayats staffName") // Only select necessary fields
      .populate({
        path: "grampanchayats",
        select: "-createdAt -updatedAt", // Exclude timestamp fields from grampanchayats
      });

    if (!staffWithGrampanchayats) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Check if the staff has any assigned grampanchayats
    if (
      !staffWithGrampanchayats.grampanchayats ||
      staffWithGrampanchayats.grampanchayats.length === 0
    ) {
      return res.status(200).json({
        success: true,
        message: "No grampanchayats assigned to this staff member",
        data: {
          staffName: staffWithGrampanchayats.staffName,
          grampanchayats: [],
        },
      });
    }

    // Return the populated grampanchayats data
    return res.status(200).json({
      success: true,
      data: {
        staffName: staffWithGrampanchayats.staffName,
        grampanchayats: staffWithGrampanchayats.grampanchayats,
      },
    });
  } catch (error) {
    console.error("Error fetching staff grampanchayats: ", error.message);
    return res.status(500).json({
      success: false,
      message: `Error fetching grampanchayats: ${error.message}`,
    });
  }
};

const getSingleGrampanchayatById = async (req, res) => {
  try {
    const { gpId } = req.params;
    console.log(req.params, "this is parameter");

    // Check if gpId is provided
    if (!gpId) {
      return res.status(400).json({
        success: false,
        message: "Grampanchayat ID is required",
      });
    }

    console.log(gpId, "this is grampanchayat id ");
    // Fetch grampanchayat from database
    const grampanchayat = await GrampanchayatModel.findById(gpId)
      .select("-__v") // Exclude version key
      .lean(); // Convert to plain JavaScript object

    // Check if grampanchayat exists
    if (!grampanchayat) {
      return res.status(404).json({
        success: false,
        message: "Grampanchayat not found",
      });
    }

    // Return success response with grampanchayat data
    res.status(200).json({
      success: true,
      message: "Grampanchayat retrieved successfully",
      data: grampanchayat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error retrieving grampanchayat: ${error.message}`,
    });
  }
};

const logoutDoctor = async (req, res) => {
  res
    .clearCookie("Authorization")
    .status(200)
    .json({ success: true, message: "Logged out successfully " });
};

const updateDoctorProfile = async (req, res) => {
  const {
    doctorName,
    doctorEmailId,
    doctorSpecialisation,
    doctorQualifications,
    experience,
    about,
    doctorLocation,
    doctorAddress,
    doctorMobileNo,
    doctorWhatsappNo,
    doctorFees,
    doctorMeetLink,
    statusOfDoctorIsOnlineOrOfflineOrBoth,
  } = req.body;
  console.log(req.doctor.doctorId, "this is doctor data from cookies");

  const doctorId = req.doctor.doctorId; // Get doctorId from the token
  try {
    // Fetch the doctor using doctorId
    const existingDoctor = await doctorModel.findById(doctorId);
    if (!existingDoctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    // Validate incoming data
    const { error, value } = updateDoctorSchema.validate({
      doctorName,
      doctorEmailId,
      doctorSpecialisation,
      doctorQualifications,
      experience,
      about,
      doctorLocation,
      doctorAddress,
      doctorMobileNo,
      doctorWhatsappNo,
      doctorFees,
      doctorMeetLink,
      statusOfDoctorIsOnlineOrOfflineOrBoth,
    });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    // Update doctor data
    const doctorData = {
      doctorName,
      doctorEmailId,
      doctorSpecialisation,
      doctorQualifications,
      experience,
      about,
      doctorLocation,
      doctorAddress,
      doctorMobileNo,
      doctorWhatsappNo,
      doctorFees,
      doctorMeetLink,
      statusOfDoctorIsOnlineOrOfflineOrBoth,
      date: Date.now(), // Update date on profile change
    };

    // Handle image upload if there’s a new file
    if (req.file) {
      const { path: imageTempPath } = req.file;
      console.log(req.file, "this is image");
      if (imageTempPath) {
        try {
          console.log("Image temp path: ", imageTempPath);

          // Upload new image to Cloudinary
          const cloudinaryResponse = await cloudinary.uploader.upload(
            imageTempPath,
            {
              folder: "DOCTORS_IMAGES",
            }
          );
          console.log(cloudinaryResponse, "this is cloudinary response");
          if (!cloudinaryResponse || cloudinaryResponse.error) {
            console.log("Cloudinary upload failed: ", cloudinaryResponse.error);
            fs.unlinkSync(imageTempPath); // Remove temp file if upload failed
            return res.json({
              success: false,
              message: "Failed to upload image to Cloudinary",
            });
          }

          // Remove the old image from Cloudinary if it exists
          if (
            existingDoctor.doctorImage &&
            existingDoctor.doctorImage.public_id
          ) {
            console.log(
              "Removing old image from Cloudinary:",
              existingDoctor.doctorImage.public_id
            );
            await cloudinary.uploader.destroy(
              existingDoctor.doctorImage.public_id
            );
          }

          // Update doctorImage with new Cloudinary data
          doctorData.doctorImage = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
          };

          console.log(
            "Image uploaded successfully: ",
            cloudinaryResponse.secure_url
          );

          // Remove temporary file from the server
          fs.unlinkSync(imageTempPath);
        } catch (error) {
          console.error("Error uploading image: ", error.message);
          fs.unlinkSync(imageTempPath); // Remove temp file if an error occurs
          return res.json({
            success: false,
            message: "Error occurred while uploading the image",
          });
        }
      }
    }

    // Update the doctor profile in the database
    const updatedDoctor = await doctorModel.findByIdAndUpdate(
      doctorId,
      doctorData,
      { new: true }
    );

    res.json({
      success: true,
      message: "Doctor profile updated successfully",
      doctor: updatedDoctor,
    });

    // Send Update profile authontication, email notification to the doctor
    try {
      await sendEmailNotification(
        updatedDoctor.doctorEmailId,
        "Welcome to PITAX Pvt. Ltd.",
        `Dear Counsellor ${updatedDoctor.doctorName},\n\n Your account has been Updated Successfully.\n\nBest Regards,\nPITAX Pvt. Ltd.`
      );
    } catch (e) {
      console.log("Error Occured in Node Mailer", e);
    }
  } catch (error) {
    console.error("Error in profile update: ", error.message);
    return res.status(500).json({
      success: false,
      message: error.message + " in catch block of doctor profile update",
    });
  }
};

const sendDoctorVerificationCode = async (req, res) => {
  const { doctorEmailId } = req.body;

  try {
    const { error } = sendVerificationCodeSchema.validate({ doctorEmailId });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    const existingDoctor = await doctorModel.findOne({ doctorEmailId });
    if (!existingDoctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor does not exist! " });
    }
    if (existingDoctor.verified) {
      return res
        .status(400)
        .json({ success: false, message: "Doctor is already verified!" });
    }

    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();

    let info = await transport.sendMail({
      from: process.env.NODdoctorEmailIdER_SENDING_doctorEmailId_ADDRESS,
      to: existingDoctor.doctorEmailId,
      subject: "Verification Code",
      html: `<h1>${codeValue}</h1>`,
    });

    if (info.accepted[0] === existingDoctor.doctorEmailId) {
      const hashedCodeValue = hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      existingDoctor.verificationCode = hashedCodeValue;
      existingDoctor.verificationCodeValidation = Date.now();
      await existingDoctor.save();

      return res
        .status(200)
        .json({ success: true, message: "Code sent successfully!" });
    }

    res.status(500).json({ success: false, message: "Failed to send code!" });
  } catch (error) {
    // console.log(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong in sending verification code!",
    });
  }
};

const verifyDoctorVerificationCode = async (req, res) => {
  const { doctorEmailId, providedCode } = req.body;
  try {
    const { error } = acceptCodeSchema.validate({
      doctorEmailId,
      providedCode,
    });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    const codeValue = providedCode.toString();
    const existingDoctor = await doctorModel
      .findOne({ doctorEmailId })
      .select("+verificationCode +verificationCodeValidation");
    if (!existingDoctor) {
      return res
        .status(401)
        .json({ success: false, message: "Doctor does not exist!" });
    }
    if (existingDoctor.verified) {
      return res
        .status(400)
        .json({ success: false, message: "Doctor is already verified!" });
    }

    if (
      Date.now() - existingDoctor.verificationCodeValidation >
      5 * 60 * 1000
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Code has expired!" });
    }

    const hashedCodeValue = hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    if (hashedCodeValue === existingDoctor.verificationCode) {
      existingDoctor.verified = true;
      existingDoctor.verificationCode = undefined;
      existingDoctor.verificationCodeValidation = undefined;
      await existingDoctor.save();

      return res
        .status(200)
        .json({ success: true, message: "Account verified successfully!" });
    }

    res.status(400).json({ success: false, message: "Invalid code provided!" });
  } catch (error) {
    // console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Error verifying the code!" });
  }
};

const changeDoctorPassword = async (req, res) => {
  const { doctorId, verified } = req.doctor;
  const { oldPassword, newPassword } = req.body;
  try {
    const { error } = changePasswordSchema.validate({
      oldPassword,
      newPassword,
    });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }
    if (!verified) {
      return res
        .status(401)
        .json({ success: false, message: "You are not a verified doctor!" });
    }

    const existingDoctor = await doctorModel
      .findOne({ _id: doctorId })
      .select("+password");
    if (!existingDoctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor does not exist!" });
    }

    const result = await comparePassword(oldPassword, existingDoctor.password);
    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Old password is incorrect!" });
    }

    const hashedPassword = await hashPassword(newPassword, 12);
    existingDoctor.password = hashedPassword;
    await existingDoctor.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    // console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Error changing the password!" });
  }
};

import { authenticator } from "otplib";

const sendForgotPasswordCodeForStaff = async (req, res) => {
  const { staffEmail } = req.body;
  try {
    const { error } = sendForgotPasswordCodeForStaffSchema.validate({
      staffEmail,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const existingStaff = await staffModel.findOne({ staffEmail });
    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff does not exist!",
      });
    }

    // Configure the authenticator to generate a 6-digit OTP
    authenticator.options = { digits: 6 };

    function generateOTP(secret) {
      return authenticator.generate(secret);
    }

    // You can use a unique secret per user or session
    const secret = authenticator.generateSecret();
    const codeValue = generateOTP(secret); // Example output: "749302"

    let info = await transport.sendMail({
      from: process.env.NODEMAILER_SENDING_EMAIL_ADDRESS,
      to: existingStaff.staffEmail,
      subject: "PITAX : Password Reset Code",
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #1c1c1c; color: #f4f4f4;">
          <h2 style="color: #00ccff; text-align: center;">Pitax Private Limited</h2>
          <h3 style="text-align: center;">Password Reset Request</h3>
          <p>Hello ${existingStaff.staffName},</p>
          <p>We received a request to reset your password. Please use the following verification code to proceed with the reset:</p>
          
          <div style="text-align: center; margin: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ff6600;">${codeValue}</span>
          </div>
  
          <p>If you did not request a password reset, please disregard this message. Your account remains secure.</p>
  
          <div style="border-top: 1px solid #eaeaea; margin-top: 20px; padding-top: 10px;">
            <p style="font-size: 12px; text-align: center; color: #999;">
              &copy; ${new Date().getFullYear()} Pitax Private Limited. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    });

    if (info.accepted.includes(existingStaff.staffEmail)) {
      const hashedCodeValue = hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );

      // Fixed field names to match schema
      existingStaff.forgetPasswordCode = hashedCodeValue;
      existingStaff.forgetPasswordCodeValidation = Date.now();
      await existingStaff.save();

      return res.status(200).json({
        success: true,
        message: "Code sent successfully!",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to send code!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error sending forgot password code!",
    });
  }
};

const verifyForgotPasswordCodeForStaff = async (req, res) => {
  const { staffEmail, providedCode, newPassword } = req.body;

  try {
    // Validate the input using schema
    const { error } = acceptFPCodeForStaffSchema.validate({
      staffEmail,
      providedCode,
      newPassword,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find staff by email with the correct field selection
    const existingStaff = await staffModel
      .findOne({ staffEmail })
      .select("+forgetPasswordCode +forgetPasswordCodeValidation");

    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff does not exist!",
      });
    }

    if (
      !existingStaff.forgetPasswordCode ||
      !existingStaff.forgetPasswordCodeValidation
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code!",
      });
    }

    // Check if the code has expired (valid for 5 minutes)
    if (
      Date.now() - existingStaff.forgetPasswordCodeValidation >
      5 * 60 * 1000
    ) {
      // Clear expired codes
      existingStaff.forgetPasswordCode = undefined;
      existingStaff.forgetPasswordCodeValidation = undefined;
      await existingStaff.save();

      return res.status(400).json({
        success: false,
        message: "Code has expired!",
      });
    }

    // Hash the provided code and compare it with the stored hashed code
    const hashedProvidedCode = hmacProcess(
      providedCode,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    // Fixed comparison logic - was comparing existingStaff with itself
    if (hashedProvidedCode === existingStaff.forgetPasswordCode) {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword, 12);

      // Update the password and clear forgot password fields
      existingStaff.staffPassword = hashedPassword;
      existingStaff.forgetPasswordCode = undefined;
      existingStaff.forgetPasswordCodeValidation = undefined;

      // Save the updated staff
      await existingStaff.save();

      return res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid code provided!",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error verifying forgot password code!",
    });
  }
};

import staffModel from "../models/staffModel.js";
import GrampanchayatModel from "../models/grampanchayatModel.js";
import { AgreementStatusModel } from "../models/agreementStatusModel.js";

const addDeduction = async (req, res) => {
  const {
    date,
    gramadhikariName,
    paymentMode,
    gstEntries,
    royaltyEntries,
    itEntries,
    kamgaarEntries,
    insuranceEntries,
    totalAmount,
    checkNo,
    pfmsDate,
    grampanchayats,
  } = req.body;
  
  console.log("Request Body : ", req.body);
  
  try {
    // Validate required fields
    if (!date || !gramadhikariName || !paymentMode || !grampanchayats) {
      return res.status(400).json({
        success: false,
        message: "Date, Gram Adhikari Name, payment mode, and Grampanchayats are required",
      });
    }
    
    // Validate paymentMode
    if (!["online", "cheque"].includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Payment mode must be either 'online' or 'cheque'",
      });
    }
    
    // If paymentMode is cheque, checkNo is required
    if (paymentMode === "cheque" && !checkNo) {
      return res.status(400).json({
        success: false,
        message: "Check number is required for cheque payments",
      });
    }
    
    // Verify if at least one deduction type has entries
    const hasDeductions = (
      (gstEntries && gstEntries.length > 0) ||
      (royaltyEntries && royaltyEntries.length > 0) ||
      (itEntries && itEntries.length > 0) ||
      (kamgaarEntries && kamgaarEntries.length > 0) ||
      (insuranceEntries && insuranceEntries.length > 0)
    );
    
    if (!hasDeductions) {
      return res.status(400).json({
        success: false,
        message: "At least one deduction entry is required",
      });
    }
    
    // Verify if referenced grampanchayats exist
    const grampanchayatExists = await GrampanchayatModel.find({
      '_id': { $in: grampanchayats }
    });
    
    // Handle document upload if present
    let documentData = {};
    if (req.file) {
      try {
        const { path: documentTempPath } = req.file;
        const cloudinaryResponse = await cloudinary.uploader.upload(
          documentTempPath,
          { folder: "DEDUCTION_DOCUMENTS" }
        );
        
        if (!cloudinaryResponse || cloudinaryResponse.error) {
          fs.unlinkSync(documentTempPath);
          return res.status(500).json({
            success: false,
            message: "Failed to upload document to Cloudinary",
          });
        }
        
        documentData = {
          public_id: cloudinaryResponse.public_id,
          url: cloudinaryResponse.secure_url,
        };
        
        fs.unlinkSync(documentTempPath);
      } catch (error) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(500).json({
          success: false,
          message: "Error occurred while uploading the document",
        });
      }
    }
    
    // Prepare deduction data
    const deductionData = {
      date: new Date(date),
      gramadhikariName,
      paymentMode,
      gstEntries: parseDeductionEntries(gstEntries),
      royaltyEntries: parseDeductionEntries(royaltyEntries),
      itEntries: parseDeductionEntries(itEntries),
      kamgaarEntries: parseDeductionEntries(kamgaarEntries),
      insuranceEntries: parseDeductionEntries(insuranceEntries),
      // Fix for totalAmount - use the first value if it's an array or calculate
      totalAmount: Array.isArray(totalAmount) 
        ? parseFloat(totalAmount[0]) 
        : (totalAmount 
            ? parseFloat(totalAmount) 
            : calculateTotalAmount(
                parseDeductionEntries(gstEntries), 
                parseDeductionEntries(royaltyEntries), 
                parseDeductionEntries(itEntries), 
                parseDeductionEntries(kamgaarEntries), 
                parseDeductionEntries(insuranceEntries)
              )
          ),
      checkNo: paymentMode === "cheque" ? checkNo : undefined,
      pfmsDate: pfmsDate ? new Date(pfmsDate) : undefined,
      document: documentData.public_id ? documentData : undefined,
      grampanchayats,
      seenByAdmin: false,
    };
    
    // Create and save new deduction
    const newDeduction = new allDeductionModel(deductionData);
    await newDeduction.save();
    
    res.status(201).json({
      success: true,
      message: "Deduction record added successfully",
      data: newDeduction,
    });
  } catch (error) {
    console.error("Error in addDeduction:", error);
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAllDeductionsByGrampanchayatId = async (req, res) => {
  try {
    // Get grampanchayatId from path parameters
    const { grampanchayatId } = req.params;

    // Get query parameters for filtering
    const { 
      startDate, 
      endDate, 
      gstNo, 
      paymentMode,
      seenByAdmin,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};

    // Add grampanchayatId filter - this is the key change
    if (grampanchayatId) {
      filter.grampanchayats = new mongoose.Types.ObjectId(grampanchayatId);
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }

    // Add GST number filter if provided
    if (gstNo) filter.gstNo = gstNo;

    // Add payment mode filter if provided
    if (paymentMode && ["online", "cheque"].includes(paymentMode)) {
      filter.paymentMode = paymentMode;
    }

    // Add seenByAdmin filter if provided
    if (seenByAdmin !== undefined) {
      filter.seenByAdmin = seenByAdmin === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit);

    // Determine sort direction
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortDirection;

    // Get total count for pagination
    const totalCount = await allDeductionModel.countDocuments(filter);

    // Fetch deductions with pagination and sorting
    const deductions = await allDeductionModel.find(filter)
      .populate('grampanchayats', 'grampanchayat district tahsil state') // Updated field names based on your schema
      .sort(sortOptions)
      .skip(skip)
      .limit(limitValue);

    // Calculate total amounts by deduction type
    const totalAmounts = await allDeductionModel.aggregate([
      { $match: filter },
      { $group: {
          _id: null,
          totalGST: {
            $sum: {
              $reduce: {
                input: "$gstEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalRoyalty: {
            $sum: {
              $reduce: {
                input: "$royaltyEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalIT: {
            $sum: {
              $reduce: {
                input: "$itEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalKamgaar: {
            $sum: {
              $reduce: {
                input: "$kamgaarEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalInsurance: {
            $sum: {
              $reduce: {
                input: "$insuranceEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          grandTotal: { $sum: "$totalAmount" }
        }
      }
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitValue);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Return the response
    res.status(200).json({
      success: true,
      message: "Deductions fetched successfully",
      data: {
        deductions,
        pagination: {
          total: totalCount,
          totalPages,
          currentPage: parseInt(page),
          limit: limitValue,
          hasNextPage,
          hasPrevPage
        },
        summary: totalAmounts.length > 0 ? totalAmounts[0] : {
          totalGST: 0,
          totalRoyalty: 0,
          totalIT: 0,
          totalKamgaar: 0,
          totalInsurance: 0,
          grandTotal: 0
        }
      }
    });
  } catch (error) {
    console.error("Error in getAllDeductions:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

// Helper function to parse deduction entries from FormData
function parseDeductionEntries(entriesData) {
  if (!entriesData) return [];
  
  // If entriesData is already an array (from JSON)
  if (Array.isArray(entriesData)) {
    return entriesData.map(entry => ({
      amount: parseFloat(entry.amount) || 0,
      partyName: entry.partyName,
      pan: entry.pan // Only relevant for IT entries
    }));
  }
  
  // If entriesData is a string (from FormData)
  try {
    const parsedEntries = JSON.parse(entriesData);
    return Array.isArray(parsedEntries) ? parsedEntries.map(entry => ({
      amount: parseFloat(entry.amount) || 0,
      partyName: entry.partyName,
      pan: entry.pan
    })) : [];
  } catch (e) {
    console.error("Error parsing entries:", e);
    return [];
  }
}

// Helper function to calculate total amount
function calculateTotalAmount(gstEntries, royaltyEntries, itEntries, kamgaarEntries, insuranceEntries) {
  let total = 0;
  
  // Sum up all GST entries
  if (gstEntries && Array.isArray(gstEntries)) {
    total += gstEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  }
  
  // Sum up all Royalty entries
  if (royaltyEntries && Array.isArray(royaltyEntries)) {
    total += royaltyEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  }
  
  // Sum up all IT entries
  if (itEntries && Array.isArray(itEntries)) {
    total += itEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  }
  
  // Sum up all Kamgaar entries
  if (kamgaarEntries && Array.isArray(kamgaarEntries)) {
    total += kamgaarEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  }
  
  // Sum up all Insurance entries
  if (insuranceEntries && Array.isArray(insuranceEntries)) {
    total += insuranceEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  }
  
  return total;
}

const getAllDeductions = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { 
      startDate, 
      endDate, 
      gstNo, 
      paymentMode, 
      grampanchayat,
      seenByAdmin,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};

    // Add date range filter if provided
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }

    // Add GST number filter if provided
    if (gstNo) filter.gstNo = gstNo;

    // Add payment mode filter if provided
    if (paymentMode && ["online", "cheque"].includes(paymentMode)) {
      filter.paymentMode = paymentMode;
    }

    // Add grampanchayat filter if provided
    if (grampanchayat) {
      filter.grampanchayats = mongoose.Types.ObjectId(grampanchayat);
    }

    // Add seenByAdmin filter if provided
    if (seenByAdmin !== undefined) {
      filter.seenByAdmin = seenByAdmin === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit);

    // Determine sort direction
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortDirection;

    // Get total count for pagination
    const totalCount = await allDeductionModel.countDocuments(filter);

    // Fetch deductions with pagination and sorting
    const deductions = await allDeductionModel.find(filter)
      .populate('grampanchayats', 'name district taluka') // Populate grampanchayat references
      .sort(sortOptions)
      .skip(skip)
      .limit(limitValue);

    // Calculate total amounts by deduction type
    const totalAmounts = await allDeductionModel.aggregate([
      { $match: filter },
      { $group: {
          _id: null,
          totalGST: {
            $sum: {
              $reduce: {
                input: "$gstEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalRoyalty: {
            $sum: {
              $reduce: {
                input: "$royaltyEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalIT: {
            $sum: {
              $reduce: {
                input: "$itEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalKamgaar: {
            $sum: {
              $reduce: {
                input: "$kamgaarEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          totalInsurance: {
            $sum: {
              $reduce: {
                input: "$insuranceEntries",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] }
              }
            }
          },
          grandTotal: { $sum: "$totalAmount" }
        }
      }
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitValue);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Return the response
    res.status(200).json({
      success: true,
      message: "Deductions fetched successfully",
      data: {
        deductions,
        pagination: {
          total: totalCount,
          totalPages,
          currentPage: parseInt(page),
          limit: limitValue,
          hasNextPage,
          hasPrevPage
        },
        summary: totalAmounts.length > 0 ? totalAmounts[0] : {
          totalGST: 0,
          totalRoyalty: 0,
          totalIT: 0,
          totalKamgaar: 0,
          totalInsurance: 0,
          grandTotal: 0
        }
      }
    });
  } catch (error) {
    console.error("Error in getAllDeductions:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};



const createAgreementStatus = async (req, res) => {
  try {
    const {
      financialYear,
      date,
      oCCopyReceived,
      paymentReceived,
      paymentReceivedDate,
      grampanchayats,
      agreementAmount,
    } = req.body;

    // Validate required fields
    if (!financialYear || !date || !grampanchayats) {
      return res.status(400).json({
        success: false,
        message:
          "Financial year, date, and Grampanchayat ID are required fields",
      });
    }

    // Validate financial year format
    const fyRegex = /^\d{4}-\d{4}$/;
    if (!fyRegex.test(financialYear)) {
      return res.status(400).json({
        success: false,
        message: "Financial year must be in format YYYY-YYYY",
      });
    }

    // Convert date string to Date object
    const agreementDate = new Date(date);

    // Check if an agreement already exists for this financial year
    const existingAgreement = await AgreementStatusModel.findOne({
      financialYear,
      grampanchayats: { $in: [grampanchayats] },
    });

    if (existingAgreement) {
      return res.status(400).json({
        success: false,
        message: `An agreement already exists for the financial year ${financialYear} for this Grampanchayat`,
      });
    }

    // Handle file upload if present
    let uploadedOCCopy = {};
    if (req.file) {
      try {
        // Assuming you have file upload middleware configured
        // Replace with your actual file handling logic
        uploadedOCCopy = {
          public_id: req.file.filename,
          url: req.file.path,
        };
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Error uploading file: ${uploadError.message}`,
        });
      }
    }

    // Create agreement status document
    const agreementStatus = new AgreementStatusModel({
      financialYear,
      date: agreementDate,
      oCCopyReceived: oCCopyReceived === "true" || oCCopyReceived === true,
      paymentReceived: paymentReceived === "true" || paymentReceived === true,
      paymentReceivedDate: paymentReceivedDate
        ? new Date(paymentReceivedDate)
        : undefined,
      agreementAmount: agreementAmount ? Number(agreementAmount) : undefined,
      uploadedOCCopy,
      grampanchayats: [grampanchayats],
    });

    // Save to database
    const savedAgreement = await agreementStatus.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: "Agreement status created successfully",
      data: savedAgreement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error creating agreement status: ${error.message}`,
    });
  }
};

const getAgreementStatus = async (req, res) => {
  try {
    const { gpId } = req.params.grampanchayatId;

    if (!gpId) {
      return res.status(400).json({
        success: false,
        message: "Grampanchayat ID is required",
      });
    }

    const agreements = await AgreementStatusModel.find({
      grampanchayats: gpId,
    }).lean();

    res.status(200).json({
      success: true,
      message: "Agreement status retrieved successfully",
      data: agreements,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error retrieving agreement status: ${error.message}`,
    });
  }
};

const updateAgreementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID is required",
      });
    }

    let uploadedOCCopy = {};

    // Handle new file upload if present
    if (req.files && req.files.uploadedOCCopy) {
      // Get existing document to delete old file if exists
      const existingAgreement = await AgreementStatusModel.findById(id);
      if (existingAgreement?.uploadedOCCopy?.public_id) {
        await cloudinary.uploader.destroy(
          existingAgreement.uploadedOCCopy.public_id
        );
      }

      const result = await cloudinary.uploader.upload(
        req.files.uploadedOCCopy.tempFilePath,
        {
          folder: "agreement_documents",
          resource_type: "auto",
        }
      );

      uploadedOCCopy = {
        public_id: result.public_id,
        url: result.secure_url,
      };
      updateData.uploadedOCCopy = uploadedOCCopy;
    }

    const updatedAgreement = await AgreementStatusModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedAgreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement status not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Agreement status updated successfully",
      data: updatedAgreement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error updating agreement status: ${error.message}`,
    });
  }
};

const deleteAgreementStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID is required",
      });
    }

    const agreement = await AgreementStatusModel.findById(id);

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement status not found",
      });
    }

    // Delete associated file if exists
    if (agreement.uploadedOCCopy?.public_id) {
      await cloudinary.uploader.destroy(agreement.uploadedOCCopy.public_id);
    }

    await AgreementStatusModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Agreement status deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error deleting agreement status: ${error.message}`,
    });
  }
};

export {

  addDeduction,
  getAllDeductions,
  getAllDeductionsByGrampanchayatId,
  

  loginStaff,
  getStaff,
  addGrampanchayat,
  getStaffGrampanchayats,
  getSingleGrampanchayatById,
  logoutDoctor,
  updateDoctorProfile,
  sendDoctorVerificationCode,
  verifyDoctorVerificationCode,
  changeDoctorPassword,
  sendForgotPasswordCodeForStaff,
  verifyForgotPasswordCodeForStaff,
  createAgreementStatus,
  getAgreementStatus,
  updateAgreementStatus,
  deleteAgreementStatus,
};
