import mongoose from "mongoose";

const GrampanchayatSchema = new mongoose.Schema({
  // Grampanchayat fields
    // Location fields merged directly into Grampanchayat
    state: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
  
    tahsil: {
      type: String,
      required: true
    },

    grampanchayat: {
      type: String,
      required: true
    },
  
  gstNo: {
    type: String, 
    required: true, 
    unique: true 
  },
  gpMobileNumber: {
    type: String,
    required: true
  },
  
  gramAdhikariName : {
    type: String,
    required: true
  },

  gpAgreementAmount : {
    type: Number,
    required: true
  },

  grampanchayatPassword: {
    type: String,
    required: true
  },
});

const GrampanchayatModel = mongoose.models.Grampanchayat || mongoose.model("Grampanchayat", GrampanchayatSchema);

export default GrampanchayatModel;