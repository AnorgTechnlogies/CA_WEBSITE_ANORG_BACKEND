import express from "express";
import {
  // Authentication & Profile
  loginStaff,
  logoutDoctor,
  getStaff,
  updateDoctorProfile,
  changeDoctorPassword,
  
  // GST Operations
  createGSTEntry,
  deleteGSTEntry,
  
  // Insurance Operations
  createInsuranceEntry,
  deleteInsuranceEntry,
  
  // Kamgar Operations
  createKamgarEntry,
  deleteKamgarEntry,
  getStaffGrampanchayats,
  getSingleGrampanchayatById,
  addGrampanchayat,
  createITEntry,
  createRoyaltyEntry,
  createAgreementStatus,
  getAgreementStatus,
  updateAgreementStatus,
  deleteAgreementStatus,
  sendForgotPasswordCodeForStaff,
  verifyForgotPasswordCodeForStaff,
  addDeduction
} from "../controllers/staffController.js";

import {staffIdentifier} from "../middleware/adminIdentification.js";
import { upload } from "../middleware/multer.js";

const staffRouter = express.Router();

// Authentication Routes
staffRouter.post("/login", loginStaff);
staffRouter.get("/logout", logoutDoctor);
staffRouter.get("/get-staff", staffIdentifier, getStaff);
staffRouter.post("/add-gramPanchayat", upload.single("gpImage"),staffIdentifier, addGrampanchayat);
staffRouter.get("/getStaffGrampanchayats", staffIdentifier, getStaffGrampanchayats);
staffRouter.get("/getSingleGrampanchayatById/:gpId", getSingleGrampanchayatById);

staffRouter.post("/add-deduction",  upload.single("file"), addDeduction);

// Profile Management Routes
staffRouter.put(
  "/profile-update",
  upload.single("doctorImage"),
  staffIdentifier,
  updateDoctorProfile
);

//for forget password
staffRouter.patch("/send-forgot-password-code-for-staff", sendForgotPasswordCodeForStaff);
staffRouter.patch("/verify-forgot-password-code-for-staff", verifyForgotPasswordCodeForStaff);

// GST Routes
staffRouter.post("/gst", staffIdentifier, createGSTEntry);
staffRouter.post("/gst/:grampanchayatId", upload.single("file"), createGSTEntry);
staffRouter.delete("/gst/:id", staffIdentifier, deleteGSTEntry);

// Insurance Routes
staffRouter.post("/insurance", staffIdentifier, createInsuranceEntry);
staffRouter.post("/insurance/:grampanchayatId", staffIdentifier, upload.single("file"), createInsuranceEntry);
staffRouter.delete("/insurance/:id", staffIdentifier, deleteInsuranceEntry);

// Kamgar Routes
staffRouter.post("/kamgar", staffIdentifier, createKamgarEntry);
staffRouter.post("/kamgar/:grampanchayatId",upload.single("file") ,createKamgarEntry);
staffRouter.delete("/kamgar/:id", staffIdentifier, deleteKamgarEntry);

staffRouter.post("/ITR/:grampanchayatId", staffIdentifier, upload.single("file"), createITEntry);

staffRouter.post("/royalty/:grampanchayatId", staffIdentifier, upload.single("file"), createRoyaltyEntry);

staffRouter.post("/agreement-status", upload.single("uploadedOCCopy"),createAgreementStatus);
staffRouter.get("/agreement-status/:gpId",staffIdentifier, getAgreementStatus);
staffRouter.put("/agreement-status/:id", updateAgreementStatus);
staffRouter.delete("/agreement-status/:id", deleteAgreementStatus);

export default staffRouter;