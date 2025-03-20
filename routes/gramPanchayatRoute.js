import express from "express";
import { getGrampanchayat, getGrampanchayatDashboardData, loginGrampanchayat, logoutGrampanchayat } from "../controllers/grampanchayatControllor.js";
import { grampanchayatIdentifier } from "../middleware/adminIdentification.js";

const grampanchayatRouter = express.Router();

grampanchayatRouter.post("/login", loginGrampanchayat);

grampanchayatRouter.get("/getGrampanchayat", grampanchayatIdentifier, getGrampanchayat);

grampanchayatRouter.get("/getGrampanchayatData", grampanchayatIdentifier, getGrampanchayatDashboardData);

grampanchayatRouter.get("/logout", grampanchayatIdentifier, logoutGrampanchayat);

export default grampanchayatRouter;