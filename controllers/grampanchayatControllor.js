import jwt from "jsonwebtoken";
import { loginGrampanchatSchema } from "../middleware/validator.js";
// import GSTSModel from "../models/GSTSModel.js";
import KamgarModel from "../models/KamgarModel.js";
import { ITModel } from "../models/iTModel.js";
import  { RoyaltyModel } from "../models/royaltyModel.js";
import InsuranceModel from "../models/InsuranceModel.js";
import GrampanchayatModel from "../models/grampanchayatModel.js";
import {
  comparePassword,
} from "../utils/hashing.js"; // assuming you have these utility functions
import mongoose from "mongoose";
import GSTModel from "../models/GSTSModel.js";

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

const getGrampanchayatDashboardData = async (req, res) => {

  const grampanchayatId = req.Grampanchayat.gpId;

  try {
    // const { grampanchayatId } = req.params;

    // Validate grampanchayatId
    if (!mongoose.Types.ObjectId.isValid(grampanchayatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Grampanchayat ID format"
      });
    }

    // Convert string ID to ObjectId
    const gramPanchayatObjectId = new mongoose.Types.ObjectId(grampanchayatId);

    // Fetch data from all models with the specified conditions
    const [gstRecords, insuranceRecords, itRecords, kamgarRecords, royaltyRecords] = await Promise.all([
      // GST Records
      GSTModel.find({
        grampanchayats: gramPanchayatObjectId,
        seenByAdmin: true,
        'uploadDocumentbyAdmin.url': { $exists: true, $ne: "" }
      }).sort({ date: -1 }),
      
      // Insurance Records
      InsuranceModel.find({
        grampanchayats: gramPanchayatObjectId,
        seenByAdmin: true,
        'uploadDocumentbyAdmin.url': { $exists: true, $ne: "" }
      }).sort({ date: -1 }),
      
      // IT Records
      ITModel.find({
        grampanchayats: gramPanchayatObjectId,
        seenByAdmin: true,
        'uploadDocumentbyAdmin.url': { $exists: true, $ne: "" }
      }).sort({ date: -1 }),
      
      // Kamgar Records
      KamgarModel.find({
        grampanchayats: gramPanchayatObjectId,
        seenByAdmin: true,
        'uploadDocumentbyAdmin.url': { $exists: true, $ne: "" }
      }).sort({ date: -1 }),
      
      // Royalty Records
      RoyaltyModel.find({
        grampanchayats: gramPanchayatObjectId,
        seenByAdmin: true,
        'uploadDocumentbyAdmin.url': { $exists: true, $ne: "" }
      }).sort({ date: -1 })
    ]);

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
};