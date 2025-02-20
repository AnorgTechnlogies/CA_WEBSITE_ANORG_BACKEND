// models/audit.js
import mongoose from "mongoose";

const AuditSchema = new mongoose.Schema(
  {
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date },
    moduleAccess: [{
      moduleName: { type: String, required: true },
      accessTime: { type: Date, required: true }
    }],
    userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType' },
    userType: { type: String, enum: ['Admin', 'Staff'] }
  }
);

const AuditModel = 
  mongoose.model.Audit || mongoose.model("Audit", AuditSchema);
export default AuditModel;