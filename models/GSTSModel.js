import mongoose from "mongoose";

const GSTSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  gstNo: { type: String, required: true },
  amount: { type: Number, required: true },
  checkNo: { type: String },
  pfmsDate: { type: Date },
  gstPartyName: { type: String },
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

const GSTModel = mongoose.model.GST || mongoose.model("GST", GSTSchema);
export default GSTModel;