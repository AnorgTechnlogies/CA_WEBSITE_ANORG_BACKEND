import mongoose from "mongoose";

const KamgarSchema = new mongoose.Schema({
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
});

const KamgarModel =
  mongoose.model.Kamgar || mongoose.model("Kamgar", KamgarSchema);
export default KamgarModel;
