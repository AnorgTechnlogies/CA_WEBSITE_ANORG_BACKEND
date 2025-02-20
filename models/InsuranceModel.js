// models/insurance.js
import mongoose from "mongoose";

const InsuranceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    document: {
      public_id: String,
      url: String
    },

    seenByAdmin: {type : Boolean, default: false},
    uploadDocumentbyAdmin: {
      public_id: String,
      url: String
    },
    
     grampanchayats: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Grampanchayat",
          required: true, // Add this to ensure the array can't be empty
        },
      ],
  }
);

const InsuranceModel = 
  mongoose.model.Insurance || mongoose.model("Insurance", InsuranceSchema);
export default InsuranceModel;
