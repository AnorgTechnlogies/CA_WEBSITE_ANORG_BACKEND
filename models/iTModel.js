import mongoose from "mongoose";

const ITSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  partyName: { type: String, required: true },
  pan: { type: String, required: true },
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

export const ITModel = mongoose.models.IT || mongoose.model("IT", ITSchema);
