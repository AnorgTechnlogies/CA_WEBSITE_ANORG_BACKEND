import jwt from "jsonwebtoken";
import {
  registerSchema,
  loginSchema,
  addStaffSchema,
  sendVerificationCodeSchema,
  acceptCodeSchema,
  acceptFPCodeSchema,
  changePasswordSchema,
  registerSchemaForAdmin,
  loginSchemaForAdmin,
  sendForgotPasswordCodeForAdminSchema,
  acceptFPCodeForAdminSchema,
  updateDoctorSchema,
  addGrampanchayatSchema,
} from "../middleware/validator.js";
import adminModel from "../models/adminModel.js";
import {
  comparePassword,
  hashPassword,
  hmacProcess,
} from "../utils/hashing.js";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/staffModel.js";
import transport from "../middleware/sendMail.js";
import csv from "csvtojson";
import fs from "fs";

import axios from "axios";
import sendEmailNotification from "../middleware/sendEmailNotification.js";

const registerAdmin = async (req, res) => {
  const {
    adminEmailId,
    adminPassword,
    adminName,
    adminLocation,
    adminMobileNo,
  } = req.body;

  try {
    // First check if any admin already exists in the system
    const existingAdminCount = await adminModel.countDocuments();
    if (existingAdminCount > 0) {
      return res.status(403).json({
        success: false,
        message:
          "System already has an admin. Multiple administrators are not allowed.",
      });
    }

    // Validate input data
    const { error, value } = registerSchemaForAdmin.validate({
      adminEmailId,
      adminPassword,
      adminName,
      adminLocation,
      adminMobileNo,
    });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    // Double check specifically for email (extra safety)
    const existingAdmin = await adminModel.findOne({ adminEmailId });
    if (existingAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "Admin already exists!" });
    }

    // Hash the password
    const hashedPassword = await hashPassword(adminPassword, 12);

    const verificationCodeValidation = Date.now() + 24 * 60 * 60 * 1000; // 24 hours validity

    // Prepare the admin object
    const adminData = {
      adminEmailId,
      adminPassword: hashedPassword,
      adminName,
      adminLocation,
      adminMobileNo,
      verified: false,
      verificationCodeValidation,
      adminImagelink: {
        public_id: "",
        url: "",
      },
      isFirstAdmin: true, // Flag to mark this as the primary admin
    };

    // Handle image upload if a file is provided
    if (req.file) {
      const { path: imageTempPath } = req.file;

      if (imageTempPath) {
        try {
          const cloudinaryResponse = await cloudinary.uploader.upload(
            imageTempPath,
            { folder: "ADMIN_IMAGES" }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(imageTempPath);
            return res.json({
              success: false,
              message: "Failed to upload image to Cloudinary",
            });
          }

          adminData.adminImagelink.public_id = cloudinaryResponse.public_id;
          adminData.adminImagelink.url = cloudinaryResponse.secure_url;

          fs.unlinkSync(imageTempPath);
        } catch (error) {
          if (fs.existsSync(imageTempPath)) {
            fs.unlinkSync(imageTempPath);
          }
          return res.json({
            success: false,
            message: "An error occurred while uploading the image",
          });
        }
      }
    }

    // Create and save the new admin
    const admin = new adminModel(adminData);
    const result = await admin.save();

    // Remove sensitive data from response
    result.adminPassword = undefined;
    result.verificationCodeValidation = undefined;

    res.status(201).json({
      success: true,
      message:
        "Admin account created successfully. You are the primary administrator.",
      result,
    });
  } catch (error) {
    console.error("Error in Register admin:", error);
    res.status(500).json({
      success: false,
      message: "Error registering admin. Please try again later.",
    });
  }
};

const loginAdmin = async (req, res) => {
  // console.log(req.body);
  const { adminEmailId, adminPassword } = req.body; // Change email to adminEmailId
  try {
    // Validate input data
    const { error } = loginSchemaForAdmin.validate({
      adminEmailId,
      adminPassword,
    });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    // Check if admin exists
    const existingAdmin = await adminModel
      .findOne({ adminEmailId })
      .select("+adminPassword");
    // console.log(existingAdmin, 'this is existing');

    if (!existingAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "You are not an admin!" });
    }

    // Compare passwords
    const result = await comparePassword(
      adminPassword,
      existingAdmin.adminPassword
    );

    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials!" });
    }

    // Generate token
    const token = jwt.sign(
      {
        adminId: existingAdmin._id,
        adminEmailId: existingAdmin.adminEmailId,
        verified: existingAdmin.verified,
      },
      process.env.TOKEN_SECRET,
      {
        expiresIn: process.env.TOKEN_EXPIRE,
      }
    );

    res
      .cookie("Authorization", "Bearer " + token, {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
      })
      .json({
        success: true,
        token,
        message: "Logged in successfully",
      });
  } catch (error) {
    // console.log(error);
    res.json({
      success: false,
      message: "Something went wrong in login admin",
    });
  }
};

const getAdmin = async (req, res) => {
  try {
    // Extract the userId from the token or session
    const adminId = req.admin.adminId; // Assuming the userId is attached to the request via authentication middleware

    // Fetch the user using the userId from the database
    const existingDoctor = await adminModel.findById(adminId); // Replace `userModel` with the correct model (e.g., doctorModel if it's for doctors)

    if (!existingDoctor) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    // If you need to include image data like in the doctor profile, handle it here
    // You can add any necessary logic to return image data or any other fields

    // Return the user data as a response
    return res.status(200).json({
      success: true,
      existingDoctor, // This will include all user data fetched from the database
    });
  } catch (error) {
    // Handle any errors during fetching user data
    console.error("Error fetching user data: ", error.message);
    return res.status(500).json({
      success: false,
      message: error.message + " in catch block of getUser function",
    });
  }
};

const logoutAdmin = async (req, res) => {
  res.clearCookie("Authorization").status(200).json({
    success: true,
    message: "logged out successfully",
  });
};

const addStaffByAdmin = async (req, res) => {
  const {
    staffState,
    staffDist,
    staffTahsil,
    staffName,
    staffEmail,
    staffPassword,
    staffMobileNo,
  } = req.body;

  // console.log("All GP : ", grampanchayats);

  // Check if staff already exists
  const existingStaff = await staffModel.findOne({ staffEmail });
  if (existingStaff) {
    return res.json({ success: false, message: "Email already exists" });
  }

  try {
    // Validate incoming data using Joi schema
    const { error, value } = addStaffSchema.validate({
      staffState,
      staffDist,
      staffTahsil,
      staffName,
      staffEmail,
      staffPassword,
      staffMobileNo,
    });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    // Hash the password before saving
    const hashedPassword = await hashPassword(staffPassword, 12);

    // Staff data to be saved
    const staffData = {
      staffState,
      staffDist,
      staffTahsil,
      staffName,
      staffEmail,
      staffPassword: hashedPassword,
      staffMobileNo,
      date: Date.now(),
      // Ensure grampanchayats is an array of ObjectIds
      // grampanchayats: Array.isArray(grampanchayats) ? grampanchayats : [],
    };

    // Upload image to Cloudinary if file is present
    if (req.file) {
      const { path: imageTempPath } = req.file;

      if (imageTempPath) {
        try {
          const cloudinaryResponse = await cloudinary.uploader.upload(
            imageTempPath,
            {
              folder: "STAFF_IMAGES",
            }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(imageTempPath);
            return res.json({
              success: false,
              message: "Failed to upload image to Cloudinary",
            });
          }

          staffData.staffImage = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
          };

          // Remove temporary file from the server
          fs.unlinkSync(imageTempPath);
        } catch (error) {
          if (fs.existsSync(imageTempPath)) {
            fs.unlinkSync(imageTempPath);
          }
          return res.json({
            success: false,
            message: "Error occurred while uploading the image",
          });
        }
      }
    }

    console.log("New Staff RECIEVED");

    // Save new staff to the database
    const newStaff = new staffModel(staffData);
    await newStaff.save();

    console.log("New Staff : ", newStaff);

    // Populate grampanchayat details for the response
    const populatedStaff = await staffModel
      .findById(newStaff._id)
      .populate("grampanchayats", "name")
      .select("-staffPassword -verificationCode -verificationCodeValidation");

    res.json({
      success: true,
      message: "Staff Added Successfully",
      data: populatedStaff,
    });
    console.log("populatedStaff : ", populatedStaff);
  } catch (error) {
    // Remove uploaded image if staff creation fails
    if (staffData?.staffImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(staffData.staffImage.public_id);
      } catch (cloudinaryError) {
        console.error("Error deleting image from Cloudinary:", cloudinaryError);
      }
    }

    return res.json({
      success: false,
      message: error.message + " in catch block of staff addition",
    });
  }
};

const addGrampanchayat = async (req, res) => {
  const {
    name,
    gstNo,
    gpMobileNumber,
    state,
    district,
    tahsil,
    village,
    grampanchayat,
  } = req.body;

  // Check if grampanchayat already exists with the GST number
  const existingGrampanchayat = await GrampanchayatModel.findOne({ gstNo });

  if (existingGrampanchayat) {
    return res.json({
      success: false,
      message: "Grampanchayat with this GST number already exists",
    });
  }

  try {
    // Validate incoming data using Joi schema
    const { error, value } = addGrampanchayatSchema.validate({
      name,
      gstNo,
      gpMobileNumber,
      state,
      district,
      tahsil,
      village,
      grampanchayat,
    });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    // Grampanchayat data to be saved
    const grampanchayatData = {
      name,
      gstNo,
      gpMobileNumber,
      state,
      district,
      tahsil,
      village,
      grampanchayat,
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
            return res.json({
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
          return res.json({
            success: false,
            message: "Error occurred while uploading the image",
          });
        }
      }
    }

    // Save new grampanchayat to the database
    const newGrampanchayat = new GrampanchayatModel(grampanchayatData);
    await newGrampanchayat.save();

    res.json({
      success: true,
      message: "Grampanchayat Added Successfully",
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message + " in catch block of grampanchayat addition",
    });
  }
};

const getAllGrampanchayats = async (req, res) => {
  try {
    // Fetch all grampanchayats from the database
    const grampanchayats = await GrampanchayatModel.find({})
      .select("-__v") // Exclude version key
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

    // Check if any grampanchayats exist
    if (!grampanchayats || grampanchayats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No grampanchayats found",
      });
    }

    // Return success response with grampanchayats data
    res.status(200).json({
      success: true,
      message: "Grampanchayats retrieved successfully",
      data: grampanchayats,
      total: grampanchayats.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error retrieving grampanchayats: ${error.message}`,
    });
  }
};

const getAllStaff = async (req, res) => {
  try {
    // Fetch all staff from the database with their associated grampanchayats
    const staff = await staffModel
      .find({})
      .select(
        "-__v -staffPassword -verified -verificationCode -verificationCodeValidation -forgetPasswordCode -forgetPasswordCodeValidation"
      ) // Exclude sensitive fields
      .populate({
        path: "grampanchayats",
        select: "-__v", // Exclude version key from populated grampanchayats
      })
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

    // Check if any staff exist
    if (!staff || staff.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No staff found",
      });
    }

    // Return success response with staff data
    res.status(200).json({
      success: true,
      message: "Staff retrieved successfully",
      data: staff,
      total: staff.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error retrieving staff: ${error.message}`,
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

const updateDeductionByAdmin = async (req, res) => {
  const { deductionId } = req.params;
  const { seenByAdmin } = req.body;

  console.log("deductionId : :", deductionId,  "seenByAdmin : ", seenByAdmin, );
  
  
  try {
    // Check if deduction ID is provided
    if (!deductionId) {
      return res.status(400).json({
        success: false,
        message: "Deduction ID is required",
      });
    }
    
    // Find the deduction record
    const deduction = await allDeductionModel.findById(deductionId);
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: "Deduction record not found",
      });
    }
    
    // Prepare update data
    const updateData = {};
    
    // Update seenByAdmin if provided
    if (seenByAdmin !== undefined) {
      updateData.seenByAdmin = seenByAdmin;
    }
    
    // Handle document upload if present
    if (req.file) {
      try {
        // If there's an existing document, delete it from Cloudinary
        if (deduction.uploadDocumentbyAdmin && deduction.uploadDocumentbyAdmin.public_id) {
          await cloudinary.uploader.destroy(deduction.uploadDocumentbyAdmin.public_id);
        }
        
        const { path: documentTempPath } = req.file;
        const cloudinaryResponse = await cloudinary.uploader.upload(
          documentTempPath,
          { folder: "ADMIN_DEDUCTION_DOCUMENTS" }
        );
        
        if (!cloudinaryResponse || cloudinaryResponse.error) {
          fs.unlinkSync(documentTempPath);
          return res.status(500).json({
            success: false,
            message: "Failed to upload document to Cloudinary",
          });
        }
        
        updateData.uploadDocumentbyAdmin = {
          public_id: cloudinaryResponse.public_id,
          url: cloudinaryResponse.secure_url,
        };
        
        fs.unlinkSync(documentTempPath);
      } catch (error) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(500).json({
          success: false,
          message: "Error occurred while uploading the document",
          error: error.message,
        });
      }
    }
    
    // If no updates provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No update data provided",
      });
    }
    
    // Update the deduction record
    const updatedDeduction = await allDeductionModel.findByIdAndUpdate(
      deductionId,
      updateData,
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      message: "Deduction record updated successfully",
      data: updatedDeduction,
    });
  } catch (error) {
    console.error("Error in updateDeductionByAdmin:", error);
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAgreementsByGrampanchayat = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;

    console.log("These is grampanchayatId : ", grampanchayatId);

    // Find all agreements that include the specified grampanchayat ID
    const agreements = await AgreementStatusModel.find({
      grampanchayats: grampanchayatId,
    })
      .sort({ date: -1 }) // Sort by date in descending order
      .populate("grampanchayats", "name"); // Optionally populate grampanchayat details

    res.status(200).json({
      success: true,
      count: agreements.length,
      data: agreements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching agreement status data",
      error: error.message,
    });
  }
};

const sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const { error, value } = sendVerificationCodeSchema.validate({ email });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    const existingAdmin = await adminModel.findOne({ email });
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin does not exists!",
      });
    }
    if (existingAdmin.verified) {
      return res
        .status(400)
        .json({ success: false, message: "you are already verified" });
    }
    //dont use this method in production any one can think this codevalue
    const codeValue = Math.floor(Math.random() * 1000000).toString();

    let info = await transport.sendMail({
      from: process.env.NODEMAILER_SENDING_EMAIL_ADDRESS,
      to: existingAdmin.email,
      subject: "verification code",
      html: "<h1>" + codeValue + "</h1>",
    });
    if (info.accepted[0] === existingAdmin.email) {
      const hashedCodeValue = hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      existingAdmin.verificationCode = hashedCodeValue;
      existingAdmin.verificationCodeValidation = Date.now();
      await existingAdmin.save();
      return res.status(200).json({ success: true, message: "Code Sent!" });
    }
    return res
      .status(400)
      .json({ success: false, message: `${error}Code sent failed` });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      message: `${error} error in last Code sent failed`,
    });
  }
};

const verifyVerificationCode = async (req, res) => {
  const { email, providedCode } = req.body;
  console.log(email, "this is emai and code", providedCode);
  try {
    const { error, value } = acceptCodeSchema.validate({ email, providedCode });
    if (error) {
      return res.status(401).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const codeValue = providedCode.toString();
    const existingAdmin = await adminModel
      .findOne({ email })
      .select("+verificationCode +verificationCodeValidation");

    if (!existingAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "admin does not exists" });
    }

    if (existingAdmin.verified) {
      return res
        .status(400)
        .json({ success: false, message: "you are already verified" });
    }

    if (
      !existingAdmin.verificationCode ||
      !existingAdmin.verificationCodeValidation
    ) {
      return res
        .status(400)
        .json({ success: false, message: "something is wrong with the code!" });
    }

    if (Date.now() - existingAdmin.verificationCodeValidation > 5 * 60 * 1000) {
      return res
        .status(400)
        .json({ success: false, message: "code has been expired" });
    }

    const hashedCodeValue = hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    if (hashedCodeValue == existingAdmin.verificationCode) {
      existingAdmin.verified = true;
      existingAdmin.verificationCode = undefined;
      existingAdmin.verificationCodeValidation = undefined;
      await existingAdmin.save();
      return res
        .status(200)
        .json({ success: true, message: "your account has been verified" });
    }
    return res
      .status(400)
      .json({ success: false, message: "unexpected occured !!" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      message: `${error} error in last Code verification failed`,
    });
  }
};

const changePassword = async (req, res) => {
  const { adminId, verified } = req.admin;
  console.log(verified);
  const { oldPassword, newPassword } = req.body;
  try {
    const { error, value } = changePasswordSchema.validate({
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
        .json({ success: false, message: "You are not verified admin!" });
    }
    const existingAdmin = await adminModel
      .findOne({ _id: adminId })
      .select("+password");
    if (!existingAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "Admin does not exists!" });
    }
    const result = await comparePassword(oldPassword, existingAdmin.password);
    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials!" });
    }
    const hashedPassword = await hashPassword(newPassword, 12);
    existingAdmin.password = hashedPassword;
    await existingAdmin.save();
    return res
      .status(200)
      .json({ success: true, message: "Password updated!!" });
  } catch (error) {
    console.log(error);
  }
};

import { authenticator } from "otplib";
import staffModel from "../models/staffModel.js";
import GrampanchayatModel from "../models/grampanchayatModel.js";
import { AgreementStatusModel } from "../models/agreementStatusModel.js";
const sendForgotPasswordCode = async (req, res) => {
  const { adminEmailId } = req.body;
  try {
    const { error } = sendForgotPasswordCodeForAdminSchema.validate({
      adminEmailId,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const existingAdmin = await adminModel.findOne({ adminEmailId });
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin does not exist!",
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
      to: existingAdmin.adminEmailId,
      subject: "PITAX : Password Reset Code",
      html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #1c1c1c; color: #f4f4f4;">
          <h2 style="color: #00ccff; text-align: center;">Pitax Private Limited</h2>
          <h3 style="text-align: center;">Password Reset Request</h3>
          <p>Hello ${existingAdmin.adminName},</p>
          <p>We received a request to reset your password. Please use the following verification code to proceed with the reset:</p>
          
          <div style="text-align: center; margin: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #ff6600;">${codeValue}</span>
          </div>
  
          <p>If you did not request a password reset, please disregard this message. Your account remains secure.</p>
  
          <div style="border-top: 1px solid #eaeaea; margin-top: 20px; padding-top: 10px;">
            <p style="font-size: 12px; text-align: center; color: #999;">
              &copy; ${new Date().getFullYear()} ANORG Technologies Private Limited. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    });

    if (info.accepted.includes(existingAdmin.adminEmailId)) {
      const hashedCodeValue = hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      existingAdmin.forgotPasswordCode = hashedCodeValue;
      existingAdmin.forgotPasswordCodeValidation = Date.now();
      await existingAdmin.save();

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

const verifyForgotPasswordCode = async (req, res) => {
  const { adminEmailId, providedCode, newPassword } = req.body;

  try {
    // Validate the input using schema
    const { error } = acceptFPCodeForAdminSchema.validate({
      adminEmailId,
      providedCode,
      newPassword,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find admin by email
    const existingAdmin = await adminModel
      .findOne({ adminEmailId })
      .select("+forgotPasswordCode +forgotPasswordCodeValidation");

    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin does not exist!",
      });
    }

    if (
      !existingAdmin.forgotPasswordCode ||
      !existingAdmin.forgotPasswordCodeValidation
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code!",
      });
    }

    // Check if the code has expired (valid for 5 minutes)
    if (
      Date.now() - existingAdmin.forgotPasswordCodeValidation >
      5 * 60 * 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Code has expired!",
      });
    }

    // Hash the provided code and compare it with the stored hashed code
    const hashedCodeValue = hmacProcess(
      providedCode,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    if (hashedCodeValue === existingAdmin.forgotPasswordCode) {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword, 12);

      // Update the password and clear forgot password fields
      existingAdmin.adminPassword = hashedPassword;
      existingAdmin.forgotPasswordCode = undefined;
      existingAdmin.forgotPasswordCodeValidation = undefined;

      // Save the updated admin
      await existingAdmin.save();

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

import XLSX from "xlsx";
import allDeductionModel from "../models/allDeductionModel.js";
import mongoose from "mongoose";

const getExportAllDeductionData = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;
    
    // Fetch data from the combined model
    const deductionData = await allDeductionModel
      .find({ grampanchayats: grampanchayatId })
      .sort({ date: -1 });
    
    // Format data for a single comprehensive sheet
    const allDeductionsSheet = deductionData.map(record => {
      // Calculate totals for each type of entry
      const gstTotal = record.gstEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const royaltyTotal = record.royaltyEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const itTotal = record.itEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const kamgaarTotal = record.kamgaarEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const insuranceTotal = record.insuranceEntries.reduce((sum, entry) => sum + entry.amount, 0);
      
      // Count entries for each type
      const gstCount = record.gstEntries.length;
      const royaltyCount = record.royaltyEntries.length;
      const itCount = record.itEntries.length;
      const kamgaarCount = record.kamgaarEntries.length;
      const insuranceCount = record.insuranceEntries.length;
      
      return {
        Date: record.date.toLocaleDateString(),
        "Gramadhikari Name": record.gramadhikariName,
        "Payment Mode": record.paymentMode,
        "Total Amount": record.totalAmount,
        "Check Number": record.checkNo || "",
        "PFMS Date": record.pfmsDate ? record.pfmsDate.toLocaleDateString() : "",
        
        // GST Information
        "GST Entries Count": gstCount,
        "GST Total Amount": gstTotal,
        
        // Royalty Information
        "Royalty Entries Count": royaltyCount,
        "Royalty Total Amount": royaltyTotal,
        
        // IT Information
        "IT Entries Count": itCount,
        "IT Total Amount": itTotal,
        
        // Kamgaar Information
        "Kamgaar Entries Count": kamgaarCount,
        "Kamgaar Total Amount": kamgaarTotal,
        
        // Insurance Information
        "Insurance Entries Count": insuranceCount,
        "Insurance Total Amount": insuranceTotal,
        
        "Admin Reviewed": record.seenByAdmin ? "Yes" : "No",
        "Document URL": record.document?.url || "",
        "Admin Document URL": record.uploadDocumentbyAdmin?.url || ""
      };
    });
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Add the single sheet to workbook
    const worksheet = XLSX.utils.json_to_sheet(allDeductionsSheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Deductions");
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    
    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=all_deductions.xlsx"
    );
    
    // Send file
    res.status(200).send(excelBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error exporting deduction data",
      error: error.message,
    });
  }
};

export {
  registerAdmin,
  loginAdmin,
  getAdmin,
  logoutAdmin,
  addStaffByAdmin,
  addGrampanchayat,
  getAllGrampanchayats,
  getAllStaff,
  getAllDeductionsByGrampanchayatId,
  updateDeductionByAdmin,
  getAgreementsByGrampanchayat,
  sendVerificationCode,
  verifyVerificationCode,
  changePassword,
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  getExportAllDeductionData,
};
