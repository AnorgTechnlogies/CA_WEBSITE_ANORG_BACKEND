import express from "express";
import { getGrampanchayat, loginGrampanchayat } from "../controllers/grampanchayatControllor.js";
import { grampanchayatIdentifier } from "../middleware/adminIdentification.js";

const grampanchayatRouter = express.Router();

grampanchayatRouter.post("/login", loginGrampanchayat);

grampanchayatRouter.get("/getGrampanchayat", grampanchayatIdentifier, getGrampanchayat);

export default grampanchayatRouter;