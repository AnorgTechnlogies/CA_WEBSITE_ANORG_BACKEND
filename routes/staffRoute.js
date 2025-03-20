import express from "express";
import {
  // Authentication & Profile
  loginStaff,
  logoutDoctor,
  getStaff,
  updateDoctorProfile,
  getStaffGrampanchayats,
  getSingleGrampanchayatById,
  addGrampanchayat,

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
import { getAllDeductionsByGrampanchayatId } from "../controllers/adminController.js";

const staffRouter = express.Router();

// Authentication Routes
staffRouter.post("/login", loginStaff);
staffRouter.get("/logout", logoutDoctor);
staffRouter.get("/get-staff", staffIdentifier, getStaff);
staffRouter.post("/add-gramPanchayat", upload.single("gpImage"),staffIdentifier, addGrampanchayat);
staffRouter.get("/getStaffGrampanchayats", staffIdentifier, getStaffGrampanchayats);
staffRouter.get("/getSingleGrampanchayatById/:gpId", getSingleGrampanchayatById);

staffRouter.post("/add-deduction",  upload.single("file"), addDeduction);
staffRouter.get("/getAllDeductions/:grampanchayatId", getAllDeductionsByGrampanchayatId);

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

staffRouter.post("/agreement-status", upload.single("uploadedOCCopy"),createAgreementStatus);
staffRouter.get("/agreement-status/:gpId",staffIdentifier, getAgreementStatus);
staffRouter.put("/agreement-status/:id", updateAgreementStatus);
staffRouter.delete("/agreement-status/:id", deleteAgreementStatus);

export default staffRouter;