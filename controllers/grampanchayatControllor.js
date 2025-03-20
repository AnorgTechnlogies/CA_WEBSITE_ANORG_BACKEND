import jwt from "jsonwebtoken";
import { loginGrampanchatSchema } from "../middleware/validator.js";
import GrampanchayatModel from "../models/grampanchayatModel.js";
import {
  comparePassword,
} from "../utils/hashing.js"; // assuming you have these utility functions
import mongoose from "mongoose";
import allDeductionModel from "../models/allDeductionModel.js";

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

const logoutGrampanchayat = async (req, res) => {
  res
    .clearCookie("Authorization")
    .status(200)
    .json({ success: true, message: "Logged out successfully " });
};

const getGrampanchayatDashboardData = async (req, res) => {
  const grampanchayatId = req.Grampanchayat.gpId;
  
  try {
    // Validate grampanchayatId
    if (!mongoose.Types.ObjectId.isValid(grampanchayatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Grampanchayat ID format"
      });
    }
    
    // Convert string ID to ObjectId
    const gramPanchayatObjectId = new mongoose.Types.ObjectId(grampanchayatId);
    
    // Fetch all deduction records for this grampanchayat
    const allDeductions = await allDeductionModel.find({
      grampanchayats: gramPanchayatObjectId,
      seenByAdmin: true,
      'uploadDocumentbyAdmin.url': { $exists: true, $ne: "" }
    }).sort({ date: -1 });
    
    // Initialize arrays for each deduction type
    const gstRecords = [];
    const insuranceRecords = [];
    const itRecords = [];
    const kamgarRecords = [];
    const royaltyRecords = [];
    
    // Process and categorize records
    allDeductions.forEach(deduction => {
      // Handle GST entries
      if (deduction.gstEntries && deduction.gstEntries.length > 0) {
        deduction.gstEntries.forEach(entry => {
          gstRecords.push({
            ...entry.toObject(),
            date: deduction.date,
            gramadhikariName: deduction.gramadhikariName,
            paymentMode: deduction.paymentMode,
            document: deduction.document,
            uploadDocumentbyAdmin: deduction.uploadDocumentbyAdmin,
            _id: deduction._id
          });
        });
      }
      
      // Handle Insurance entries
      if (deduction.insuranceEntries && deduction.insuranceEntries.length > 0) {
        deduction.insuranceEntries.forEach(entry => {
          insuranceRecords.push({
            ...entry.toObject(),
            date: deduction.date,
            gramadhikariName: deduction.gramadhikariName,
            paymentMode: deduction.paymentMode,
            document: deduction.document,
            uploadDocumentbyAdmin: deduction.uploadDocumentbyAdmin,
            _id: deduction._id
          });
        });
      }
      
      // Handle IT entries
      if (deduction.itEntries && deduction.itEntries.length > 0) {
        deduction.itEntries.forEach(entry => {
          itRecords.push({
            ...entry.toObject(),
            date: deduction.date,
            gramadhikariName: deduction.gramadhikariName,
            paymentMode: deduction.paymentMode,
            document: deduction.document,
            uploadDocumentbyAdmin: deduction.uploadDocumentbyAdmin,
            _id: deduction._id
          });
        });
      }
      
      // Handle Kamgar entries
      if (deduction.kamgaarEntries && deduction.kamgaarEntries.length > 0) {
        deduction.kamgaarEntries.forEach(entry => {
          kamgarRecords.push({
            ...entry.toObject(),
            date: deduction.date,
            gramadhikariName: deduction.gramadhikariName,
            paymentMode: deduction.paymentMode,
            document: deduction.document,
            uploadDocumentbyAdmin: deduction.uploadDocumentbyAdmin,
            _id: deduction._id
          });
        });
      }
      
      // Handle Royalty entries
      if (deduction.royaltyEntries && deduction.royaltyEntries.length > 0) {
        deduction.royaltyEntries.forEach(entry => {
          royaltyRecords.push({
            ...entry.toObject(),
            date: deduction.date,
            gramadhikariName: deduction.gramadhikariName,
            paymentMode: deduction.paymentMode,
            document: deduction.document,
            uploadDocumentbyAdmin: deduction.uploadDocumentbyAdmin,
            _id: deduction._id
          });
        });
      }
    });
    
    // Calculate total amounts for each category
    const totalGST = gstRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalInsurance = insuranceRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalIT = itRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalKamgar = kamgarRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalRoyalty = royaltyRecords.reduce((sum, record) => sum + record.amount, 0);
    const grandTotal = totalGST + totalInsurance + totalIT + totalKamgar + totalRoyalty;
    
    return res.status(200).json({
      success: true,
      data: {
        gst: {
          records: gstRecords,
          totalAmount: totalGST,
          count: gstRecords.length
        },
        insurance: {
          records: insuranceRecords,
          totalAmount: totalInsurance,
          count: insuranceRecords.length
        },
        it: {
          records: itRecords,
          totalAmount: totalIT,
          count: itRecords.length
        },
        kamgar: {
          records: kamgarRecords,
          totalAmount: totalKamgar,
          count: kamgarRecords.length
        },
        royalty: {
          records: royaltyRecords,
          totalAmount: totalRoyalty,
          count: royaltyRecords.length
        },
        summary: {
          totalRecords: gstRecords.length + insuranceRecords.length + itRecords.length +
                        kamgarRecords.length + royaltyRecords.length,
          grandTotal: grandTotal
        }
      }
    });
  } catch (error) {
    console.error("Error fetching Grampanchayat dashboard data: ", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching Grampanchayat dashboard data"
    });
  }
};

export {
  loginGrampanchayat,
  getGrampanchayat,
  getGrampanchayatDashboardData,
  logoutGrampanchayat,
};