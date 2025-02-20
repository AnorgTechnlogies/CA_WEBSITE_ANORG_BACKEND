import mongoose from "mongoose";

// AgreementSchema Model
const AgreementSchema = new mongoose.Schema({
  // Financial year field (e.g., "2023-2024")
  financialYear: {
    type: String,
    required: true,
    unique: true
  },
  date: { type: Date, required: true },
  oCCopyReceived: { type: Boolean, default: false },
  paymentReceived: { type: Boolean, default: false },
  paymentReceivedDate: { type: Date },
  agreementAmount: { type: Number },
  uploadedOCCopy: {
    public_id: String,
    url: String,
  },
  grampanchayats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grampanchayat",
      required: true,
    },
  ],
}, { timestamps: true });

export const AgreementStatusModel =
  mongoose.models.AgreementSatus || mongoose.model("AgreementSatus", AgreementSchema);