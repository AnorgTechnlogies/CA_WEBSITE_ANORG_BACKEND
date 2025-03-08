import express from "express";
import {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  sendVerificationCode,
  verifyVerificationCode,
  changePassword,
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  getAdmin,
  addStaffByAdmin,
  addGrampanchayat,
  getAllGrampanchayats,
  getAllStaff,
  getAgreementsByGrampanchayat,
  getAllInsuranceEntries,
  getAllGSTEntries,
  getAllKamgarEntries,
  getAllITEntries,
  getAllRoyaltyEntries,
  updateGSTEntry,
  updateITEntry,
  updateInsuranceEntry,
  updateKamgarEntry,
  updateRoyaltyEntry,
  getExportAllDeductionData,
  updateGSTDocumentByAdmin,
  updatITDocumentByAdmin,
  updateRoyaltyDocumentByAdmin,
  updateInsuranceDocumentByAdmin,
  updateKaamgarDocumentByAdmin,
  getAllDeductionsByGrampanchayatId,
} from "../controllers/adminController.js";
// import upload from '../utils/multer.js';
import { upload } from "../middleware/multer.js";
import { adminIdentifier } from "../middleware/adminIdentification.js";

const adminRouter = express.Router();

adminRouter.post("/register", upload.single("adminImagelink"), registerAdmin);
adminRouter.post("/login", loginAdmin);
adminRouter.get("/get-admin", adminIdentifier, getAdmin);
adminRouter.get("/logout", logoutAdmin);
adminRouter.post("/add-staff", upload.single("staffImage"), addStaffByAdmin);
adminRouter.get("/getAllStaff", getAllStaff);

adminRouter.post("/add-gramPanchayat", upload.single("gpImage"), addGrampanchayat);
adminRouter.get("/allGrampanchayats", getAllGrampanchayats);

adminRouter.get("/getAllDeductions/:grampanchayatId", getAllDeductionsByGrampanchayatId);

adminRouter.get("/gst/:grampanchayatId", adminIdentifier, getAllGSTEntries);
adminRouter.get("/insurance/:grampanchayatId", adminIdentifier, getAllInsuranceEntries);
adminRouter.get("/kamgar/:grampanchayatId", adminIdentifier, getAllKamgarEntries);
adminRouter.get("/iT/:grampanchayatId", adminIdentifier, getAllITEntries);
adminRouter.get("/royalty/:grampanchayatId", adminIdentifier, getAllRoyaltyEntries);

adminRouter.put("/updateGSTEntry/:id", adminIdentifier, updateGSTEntry);
adminRouter.put("/updateITEntry/:id", adminIdentifier, updateITEntry);
adminRouter.put("/updateInsuranceEntry/:id", adminIdentifier, updateInsuranceEntry);
adminRouter.put("/updateKamgarEntry/:id", adminIdentifier, updateKamgarEntry);
adminRouter.put("/updateRoyaltyEntry/:id", adminIdentifier, updateRoyaltyEntry);

adminRouter.patch(
  "/updateGSTDocumentByAdmin/:id",
  upload.single("document"),
  updateGSTDocumentByAdmin
);

adminRouter.patch(
  "/updatITDocumentByAdmin/:id",
  upload.single("document"),
  updatITDocumentByAdmin
);

adminRouter.patch(
  "/updateKaamgarDocumentByAdmin/:id",
  upload.single("document"),
  updateKaamgarDocumentByAdmin
);


adminRouter.patch(
  "/updateRoyaltyDocumentByAdmin/:id",
  upload.single("document"),
  updateRoyaltyDocumentByAdmin
);

adminRouter.patch(
  "/updateInsuranceDocumentByAdmin/:id",
  upload.single("document"),
  updateInsuranceDocumentByAdmin
);




adminRouter.get('/agreements/:grampanchayatId', getAgreementsByGrampanchayat);

//for changing the password of Admin
adminRouter.patch("/change-password", adminIdentifier, changePassword);

//sinding verifiaction code
adminRouter.patch(
  "/send-verification-code",
  adminIdentifier,
  sendVerificationCode
);


adminRouter.patch(
  "/verify-verification-code",
  adminIdentifier,
  verifyVerificationCode
);
//for forget password
adminRouter.patch("/send-forgot-password-code", sendForgotPasswordCode);
adminRouter.patch("/verify-forgot-password-code", verifyForgotPasswordCode);





adminRouter.get("/exportAllDeductionData/:grampanchayatId", getExportAllDeductionData);
export default adminRouter;
