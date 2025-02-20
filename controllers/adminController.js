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

const getAllGSTEntries = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;
    const entries = await GSTModel.find({
      grampanchayats: grampanchayatId,
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching GST entries",
      error: error.message,
    });
  }
};

const getAllInsuranceEntries = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;
    const entries = await InsuranceModel.find({
      grampanchayats: grampanchayatId,
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching insurance entries",
      error: error.message,
    });
  }
};

const getAllKamgarEntries = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;
    const entries = await KamgarModel.find({
      grampanchayats: grampanchayatId,
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching kamgar entries",
      error: error.message,
    });
  }
};

const getAllITEntries = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;
    const entries = await ITModel.find({
      grampanchayats: grampanchayatId,
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching IT entries",
      error: error.message,
    });
  }
};

const getAllRoyaltyEntries = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;
    const entries = await RoyaltyModel.find({
      grampanchayats: grampanchayatId,
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching royalty entries",
      error: error.message,
    });
  }
};

// Update entries
const updateGSTEntry = async (req, res) => {
  try {
    console.log("req.params.id : ", req.params.id);

    const updatedEntry = await GSTModel.findByIdAndUpdate(
      req.params.id,
      { seenByAdmin: req.body.seenByAdmin },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: "GST entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "GST entry status updated successfully",
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating GST entry status",
      error: error.message,
    });
  }
};

const updateInsuranceEntry = async (req, res) => {
  try {
    const updatedEntry = await InsuranceModel.findByIdAndUpdate(
      req.params.id,
      { seenByAdmin: req.body.seenByAdmin },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: "Insurance entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Insurance entry status updated successfully",
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating insurance entry status",
      error: error.message,
    });
  }
};

const updateKamgarEntry = async (req, res) => {
  try {
    const updatedEntry = await KamgarModel.findByIdAndUpdate(
      req.params.id,
      { seenByAdmin: req.body.seenByAdmin },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: "Kamgar entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Kamgar entry status updated successfully",
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating kamgar entry status",
      error: error.message,
    });
  }
};

const updateITEntry = async (req, res) => {
  try {
    const updatedEntry = await ITModel.findByIdAndUpdate(
      req.params.id,
      { seenByAdmin: req.body.seenByAdmin },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: "IT entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "IT entry status updated successfully",
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating IT entry status",
      error: error.message,
    });
  }
};

const updateRoyaltyEntry = async (req, res) => {
  try {
    const updatedEntry = await RoyaltyModel.findByIdAndUpdate(
      req.params.id,
      { seenByAdmin: req.body.seenByAdmin },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: "Royalty entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Royalty entry status updated successfully",
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating Royalty entry status",
      error: error.message,
    });
  }
};



// upload reciept send by admin controllor 
const updateGSTDocumentByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if GST record exists
    const existingGST = await GSTModel.findById(id);
    if (!existingGST) {
      return res.status(404).json({
        success: false,
        message: "GST record not found"
      });
    }

    // Handle document upload if file is provided
    if (req.file) {
      const { path: documentTempPath } = req.file;

      if (documentTempPath) {
        try {
          // Delete existing document from cloudinary if it exists
          if (existingGST.uploadDocumentbyAdmin.public_id) {
            await cloudinary.uploader.destroy(
              existingGST.uploadDocumentbyAdmin.public_id
            );
          }

          // Generate custom filename using GST amount
          const originalExtension = req.file.originalname.split('.').pop();
          const customFileName = `${existingGST.amount}.${originalExtension}`;

          // Upload new document to cloudinary with custom filename
          const cloudinaryResponse = await cloudinary.uploader.upload(
            documentTempPath,
            { 
              folder: "GST_ADMIN_DOCUMENTS",
              public_id: `GST_ADMIN_DOCUMENTS/${customFileName.split('.')[0]}` // Remove extension for public_id
            }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(documentTempPath);
            return res.status(400).json({
              success: false,
              message: "Failed to upload document to Cloudinary"
            });
          }

          // Update GST record with new document details
          existingGST.uploadDocumentbyAdmin = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
          };

          // Clean up temporary file
          fs.unlinkSync(documentTempPath);
        } catch (error) {
          if (fs.existsSync(documentTempPath)) {
            fs.unlinkSync(documentTempPath);
          }
          return res.status(500).json({
            success: false,
            message: "An error occurred while uploading the document",
            error: error.message
          });
        }
      }
    }

    // Update seenByAdmin flag
    existingGST.seenByAdmin = true;

    // Save the updated GST record
    const updatedGST = await existingGST.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully by admin",
      result: updatedGST
    });
  } catch (error) {
    console.error("Error in updateGSTDocumentByAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error updating GST document. Please try again later.",
      error: error.message
    });
  }
};

const updatITDocumentByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if GST record exists
    const existingIT = await ITModel.findById(id);
    if (!existingIT) {
      return res.status(404).json({
        success: false,
        message: "IT record not found"
      });
    }

    // Handle document upload if file is provided
    if (req.file) {
      const { path: documentTempPath } = req.file;

      if (documentTempPath) {
        try {
          // Delete existing document from cloudinary if it exists
          if (existingIT.uploadDocumentbyAdmin.public_id) {
            await cloudinary.uploader.destroy(
              existingIT.uploadDocumentbyAdmin.public_id
            );
          }

          // Generate custom filename using GST amount
          const originalExtension = req.file.originalname.split('.').pop();
          const customFileName = `${existingIT.amount}.${originalExtension}`;

          // Upload new document to cloudinary with custom filename
          const cloudinaryResponse = await cloudinary.uploader.upload(
            documentTempPath,
            { 
              folder: "IT_ADMIN_DOCUMENTS",
              public_id: `IT_ADMIN_DOCUMENTS/${customFileName.split('.')[0]}` // Remove extension for public_id
            }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(documentTempPath);
            return res.status(400).json({
              success: false,
              message: "Failed to upload document to Cloudinary"
            });
          }

          // Update GST record with new document details
          existingIT.uploadDocumentbyAdmin = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
          };

          // Clean up temporary file
          fs.unlinkSync(documentTempPath);
        } catch (error) {
          if (fs.existsSync(documentTempPath)) {
            fs.unlinkSync(documentTempPath);
          }
          return res.status(500).json({
            success: false,
            message: "An error occurred while uploading the document",
            error: error.message
          });
        }
      }
    }

    // Update seenByAdmin flag
    existingIT.seenByAdmin = true;

    // Save the updated GST record
    const updatedIT = await existingIT.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully by admin",
      result: updatedIT
    });
  } catch (error) {
    console.error("Error in updateITDocumentByAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error updating IT document. Please try again later.",
      error: error.message
    });
  }
};

const updateKaamgarDocumentByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if GST record exists
    const existingKaamgar = await KamgarModel.findById(id);
    if (!existingKaamgar) {
      return res.status(404).json({
        success: false,
        message: "Kaamgar record not found"
      });
    }

    // Handle document upload if file is provided
    if (req.file) {
      const { path: documentTempPath } = req.file;

      if (documentTempPath) {
        try {
          // Delete existing document from cloudinary if it exists
          if (existingKaamgar.uploadDocumentbyAdmin.public_id) {
            await cloudinary.uploader.destroy(
              existingKaamgar.uploadDocumentbyAdmin.public_id
            );
          }

          // Generate custom filename using GST amount
          const originalExtension = req.file.originalname.split('.').pop();
          const customFileName = `${existingKaamgar.amount}.${originalExtension}`;

          // Upload new document to cloudinary with custom filename
          const cloudinaryResponse = await cloudinary.uploader.upload(
            documentTempPath,
            { 
              folder: "KAAMGAR_ADMIN_DOCUMENTS",
              public_id: `KAAMGAR_ADMIN_DOCUMENTS/${customFileName.split('.')[0]}` // Remove extension for public_id
            }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(documentTempPath);
            return res.status(400).json({
              success: false,
              message: "Failed to upload document to Cloudinary"
            });
          }

          // Update GST record with new document details
          existingKaamgar.uploadDocumentbyAdmin = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
          };

          // Clean up temporary file
          fs.unlinkSync(documentTempPath);
        } catch (error) {
          if (fs.existsSync(documentTempPath)) {
            fs.unlinkSync(documentTempPath);
          }
          return res.status(500).json({
            success: false,
            message: "An error occurred while uploading the document",
            error: error.message
          });
        }
      }
    }

    // Update seenByAdmin flag
    existingKaamgar.seenByAdmin = true;

    // Save the updated GST record
    const updatedKaamgar = await existingKaamgar.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully by admin",
      result: updatedKaamgar
    });
  } catch (error) {
    console.error("Error in updateKaamgarDocumentByAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error updating Kaamgar document. Please try again later.",
      error: error.message
    });
  }
};

const updateRoyaltyDocumentByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if GST record exists
    const existingRoyalty = await RoyaltyModel.findById(id);
    if (!existingRoyalty) {
      return res.status(404).json({
        success: false,
        message: "GST record not found"
      });
    }

    // Handle document upload if file is provided
    if (req.file) {
      const { path: documentTempPath } = req.file;

      if (documentTempPath) {
        try {
          // Delete existing document from cloudinary if it exists
          if (existingRoyalty.uploadDocumentbyAdmin.public_id) {
            await cloudinary.uploader.destroy(
              existingRoyalty.uploadDocumentbyAdmin.public_id
            );
          }

          // Generate custom filename using GST amount
          const originalExtension = req.file.originalname.split('.').pop();
          const customFileName = `${existingRoyalty.amount}.${originalExtension}`;

          // Upload new document to cloudinary with custom filename
          const cloudinaryResponse = await cloudinary.uploader.upload(
            documentTempPath,
            { 
              folder: "ROYALTY_ADMIN_DOCUMENTS",
              public_id: `ROYALTY_ADMIN_DOCUMENTS/${customFileName.split('.')[0]}` // Remove extension for public_id
            }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(documentTempPath);
            return res.status(400).json({
              success: false,
              message: "Failed to upload document to Cloudinary"
            });
          }

          // Update GST record with new document details
          existingRoyalty.uploadDocumentbyAdmin = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
          };

          // Clean up temporary file
          fs.unlinkSync(documentTempPath);
        } catch (error) {
          if (fs.existsSync(documentTempPath)) {
            fs.unlinkSync(documentTempPath);
          }
          return res.status(500).json({
            success: false,
            message: "An error occurred while uploading the document",
            error: error.message
          });
        }
      }
    }

    // Update seenByAdmin flag
    existingRoyalty.seenByAdmin = true;

    // Save the updated GST record
    const updatedRoyalty = await existingRoyalty.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully by admin",
      result: updatedRoyalty
    });
  } catch (error) {
    console.error("Error in updateRoyaltyDocumentByAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error updating Royalty document. Please try again later.",
      error: error.message
    });
  }
};

const updateInsuranceDocumentByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if GST record exists
    const existingInsurance = await InsuranceModel.findById(id);
    if (!existingInsurance) {
      return res.status(404).json({
        success: false,
        message: "Insuranmce record not found"
      });
    }

    // Handle document upload if file is provided
    if (req.file) {
      const { path: documentTempPath } = req.file;

      if (documentTempPath) {
        try {
          // Delete existing document from cloudinary if it exists
          if (existingInsurance.uploadDocumentbyAdmin.public_id) {
            await cloudinary.uploader.destroy(
              existingInsurance.uploadDocumentbyAdmin.public_id
            );
          }

          // Generate custom filename using GST amount
          const originalExtension = req.file.originalname.split('.').pop();
          const customFileName = `${existingInsurance.amount}.${originalExtension}`;

          // Upload new document to cloudinary with custom filename
          const cloudinaryResponse = await cloudinary.uploader.upload(
            documentTempPath,
            { 
              folder: "INSURANCE_ADMIN_DOCUMENTS",
              public_id: `INSURANCE_ADMIN_DOCUMENTS/${customFileName.split('.')[0]}` // Remove extension for public_id
            }
          );

          if (!cloudinaryResponse || cloudinaryResponse.error) {
            fs.unlinkSync(documentTempPath);
            return res.status(400).json({
              success: false,
              message: "Failed to upload document to Cloudinary"
            });
          }

          // Update GST record with new document details
          existingInsurance.uploadDocumentbyAdmin = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
          };

          // Clean up temporary file
          fs.unlinkSync(documentTempPath);
        } catch (error) {
          if (fs.existsSync(documentTempPath)) {
            fs.unlinkSync(documentTempPath);
          }
          return res.status(500).json({
            success: false,
            message: "An error occurred while uploading the document",
            error: error.message
          });
        }
      }
    }

    // Update seenByAdmin flag
    existingInsurance.seenByAdmin = true;

    // Save the updated GST record
    const updatedInsurance = await existingInsurance.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully by admin",
      result: updatedInsurance
    });

  } catch (error) {
    console.error("Error in updateInsuranceDocumentByAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error updating Insurance document. Please try again later.",
      error: error.message
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
import GSTModel from "../models/GSTSModel.js";
import InsuranceModel from "../models/InsuranceModel.js";
import KamgarModel from "../models/KamgarModel.js";
import { ITModel } from "../models/ITModel.js";
import { RoyaltyModel } from "../models/royaltyModel.js";
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
      subject: "Psycortex: Password Reset Code",
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
              &copy; ${new Date().getFullYear()} Pitax Private Limited. All rights reserved.
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

const getExportAllDeductionData = async (req, res) => {
  try {
    const grampanchayatId = req.params.grampanchayatId;

    // Fetch data from all models
    const [gstData, insuranceData, itData, kamgarData, royaltyData] =
      await Promise.all([
        GSTModel.find({ grampanchayats: grampanchayatId }).sort({ date: -1 }),
        InsuranceModel.find({ grampanchayats: grampanchayatId }).sort({
          date: -1,
        }),
        ITModel.find({ grampanchayats: grampanchayatId }).sort({ date: -1 }),
        KamgarModel.find({ grampanchayats: grampanchayatId }).sort({
          date: -1,
        }),
        RoyaltyModel.find({ grampanchayats: grampanchayatId }).sort({
          date: -1,
        }),
      ]);

    // Format data for each sheet
    const gstSheet = gstData.map((entry) => ({
      Date: entry.date.toLocaleDateString(),
      "GST Number": entry.gstNo,
      Amount: entry.amount,
      "Check Number": entry.checkNo || "",
      "PFMS Date": entry.pfmsDate ? entry.pfmsDate.toLocaleDateString() : "",
      "Party Name": entry.gstPartyName || "",
    }));

    const insuranceSheet = insuranceData.map((entry) => ({
      Date: entry.date.toLocaleDateString(),
      Amount: entry.amount,
      "Insurance Number": entry.insuranceNo,
    }));

    const itSheet = itData.map((entry) => ({
      Date: entry.date.toLocaleDateString(),
      "Party Name": entry.partyName,
      PAN: entry.pan,
      Amount: entry.amount,
    }));

    const kamgarSheet = kamgarData.map((entry) => ({
      Date: entry.date.toLocaleDateString(),
      Amount: entry.amount,
    }));

    const royaltySheet = royaltyData.map((entry) => ({
      Date: entry.date.toLocaleDateString(),
      Amount: entry.amount,
    }));

    // Create workbook and add worksheets
    const workbook = XLSX.utils.book_new();

    const sheets = {
      "GST Deductions": gstSheet,
      "Insurance Deductions": insuranceSheet,
      "IT Deductions": itSheet,
      "Kamgar Deductions": kamgarSheet,
      "Royalty Deductions": royaltySheet,
    };

    // Add each sheet to workbook
    Object.entries(sheets).forEach(([sheetName, data]) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

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
      "attachment; filename=deductions_data.xlsx"
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
  getAllGSTEntries,
  getAllInsuranceEntries,
  getAllKamgarEntries,
  getAllITEntries,
  getAllRoyaltyEntries,
  updateGSTEntry,
  updateInsuranceEntry,
  updateKamgarEntry,
  updateITEntry,
  updateRoyaltyEntry,

  updateGSTDocumentByAdmin,
  updatITDocumentByAdmin,
  updateKaamgarDocumentByAdmin,
  updateRoyaltyDocumentByAdmin,
  updateInsuranceDocumentByAdmin,


  getAgreementsByGrampanchayat,
  sendVerificationCode,
  verifyVerificationCode,
  changePassword,
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  getExportAllDeductionData,
};
