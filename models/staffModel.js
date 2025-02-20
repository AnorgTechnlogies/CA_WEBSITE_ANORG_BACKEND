import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    staffState: { type: String },
    staffDist: { type: String,},
    staffTahsil: { type: String,  },
    staffName: { type: String, },
    staffEmail: { type: String, },
    staffPassword: { type: String, },
    staffMobileNo: { type: String, },
    
    staffImage: {
      public_id: String,
      url: String,
    },

    verified: {
      type: Boolean,
      select: false,
      default: false
    },
    verificationCode: {
      type: String,
      select: false,
    },
    verificationCodeValidation: {
      type: Number,
      select: false,
    },
    forgetPasswordCode: {
      type: String,
      select: false,
    },
    forgetPasswordCodeValidation: {
      type: Number,
      select: false,
    },

    grampanchayats: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grampanchayat',
      required: true // Add this to ensure the array can't be empty
    }],
  },
  {
    timestamps: true,
  }
);

// Fix the model registration to avoid the "Cannot overwrite" error
const staffModel = mongoose.models.staff || mongoose.model("staff", staffSchema);
export default staffModel;