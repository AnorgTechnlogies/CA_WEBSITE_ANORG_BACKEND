import mongoose from "mongoose";

// Create a schema for individual deduction entries
const deductionEntrySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  partyName: { type: String, required: true },
  // Additional fields specific to each type can be added here
  pan: { type: String } // For IT deductions
});

const allDeductionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  gramadhikariName: { type: String, required: true },
  paymentMode: {
    type: String,
    enum: ["online", "cheque"],
    required: true,
  },

  // Multiple entries for each deduction type
  gstEntries: [deductionEntrySchema],
  royaltyEntries: [deductionEntrySchema],
  itEntries: [deductionEntrySchema],
  kamgaarEntries: [deductionEntrySchema],
  insuranceEntries: [deductionEntrySchema],

  totalAmount: { type: Number },

  checkNo: { type: String },
  pfmsDate: { type: Date },
  document: {
    public_id: String,
    url: String
  },
  seenByAdmin: { type: Boolean, default: false },
  uploadDocumentbyAdmin: {
    public_id: String,
    url: String
  },
  
  grampanchayats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Grampanchayat",
    required: true,
  }],
});

const allDeductionModel = mongoose.model.allDeduction || mongoose.model("allDeduction", allDeductionSchema);
export default allDeductionModel;