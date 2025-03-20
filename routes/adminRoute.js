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
  getExportAllDeductionData,
  getAllDeductionsByGrampanchayatId,
  updateDeductionByAdmin,
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
adminRouter.put("/updateDeductionByAdmin/:deductionId",upload.single("recieptByAdmin"), updateDeductionByAdmin);

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
