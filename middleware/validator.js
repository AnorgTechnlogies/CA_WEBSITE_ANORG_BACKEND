import Joi from "joi";

const registerSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  password: Joi.string().required(),
});

const registerSchemaForAdmin = Joi.object({
  adminEmailId: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net", "in"] },
    }),

  adminPassword: Joi.string()
    .min(8)
    .max(30)
    .required()
    .pattern(new RegExp("^[a-zA-Z0-9!@#$%^&*()]{8,30}$"))
    .messages({
      "string.pattern.base":
        "Password must contain only alphanumeric and special characters",
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password cannot exceed 30 characters",
    }),

  adminName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .pattern(new RegExp("^[a-zA-Z ]+$"))
    .messages({
      "string.pattern.base": "Name must contain only letters and spaces",
    }),

  adminLocation: Joi.string().min(3).max(100).required().messages({
    "string.min": "Location must be at least 3 characters long",
    "string.max": "Location cannot exceed 100 characters",
  }),

  adminMobileNo: Joi.string()
    .pattern(new RegExp("^[0-9]{10}$"))
    .required()
    .messages({
      "string.pattern.base": "Mobile number must be exactly 10 digits",
    }),
});

const loginSchema = Joi.object({
  staffEmail: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  staffPassword: Joi.string().required(),
});

const loginGrampanchatSchema = Joi.object({
  gstNo: Joi.string()
    .trim()
    .length(15)
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/)
    .required()
    .messages({
      "string.empty": "GST Number is required.",
      "any.required": "GST Number is required.",
      "string.length": "GST Number must be exactly 15 characters long.",
      "string.pattern.base": "GST Number is invalid.",
    }),

    grampanchayatPassword: Joi.string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/)
    .required()
    .messages({
      "string.empty": "Grampanchayat Password is required.",
      "any.required": "Grampanchayat Password is required.",
      "string.min": "Password must be at least 8 characters long.",
      "string.max": "Password must not exceed 20 characters.",
      "string.pattern.base": "Password must contain at least one uppercase letter, one number, and one special character.",
    }),
});

const loginSchemaForAdmin = Joi.object({
  adminEmailId: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net", "in"] },
    }),
  adminPassword: Joi.string().required(),
});

const addStaffSchema = Joi.object({
  staffState: Joi.string().required().messages({
    "string.empty": "State is required.",
    "any.required": "State is required.",
  }),

  staffDist: Joi.string().required().messages({
    "string.empty": "District is required.",
    "any.required": "District name is required.",
  }),

  staffTahsil: Joi.string().required().messages({
    "string.empty": "Tahsil is required.",
    "any.required": "Tahsil is required.",
  }),
  

  staffName: Joi.string().required().messages({
    "string.empty": "Staff name is required.",
    "any.required": "Staff name is required.",
  }),

  staffEmail: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    })
    .messages({
      "string.email": "Please enter a valid email address.",
      "string.empty": "Email is required.",
      "string.min": "Email must be at least {#limit} characters long.",
      "string.max": "Email cannot exceed {#limit} characters.",
    }),

  staffPassword: Joi.string().required().min(6).max(20).messages({
    "string.empty": "Password is required.",
    "string.min": "Password must be at least {#limit} characters long.",
    "string.max": "Password cannot exceed {#limit} characters.",
  }),

  staffMobileNo: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Mobile number must be a valid 10-digit number starting with 6-9.",
      "string.empty": "Mobile number is required.",
    }),

  // grampanchayats: Joi.array().items(Joi.string()).required(),

  staffImage: Joi.object({
    public_id: Joi.string(),
    url: Joi.string().uri(),
  }).optional(),

  verified: Joi.boolean().optional(),

  verificationCode: Joi.string().optional(),

  verificationCodeValidation: Joi.number().optional(),

  forgetPasswordCode: Joi.string().optional(),

  forgetPasswordCodeValidation: Joi.number().optional(),
});

const addGrampanchayatSchema = Joi.object({
  gramAdhikariName: Joi.string().trim().min(3).max(50).regex(/^[a-zA-Z\s]+$/).required().messages({
    "string.empty": "Gram Adhikari Name is required.",
    "any.required": "Gram Adhikari Name is required.",
    "string.min": "Gram Adhikari Name should have at least 3 characters.",
    "string.max": "Gram Adhikari Name should not exceed 50 characters.",
    "string.pattern.base": "Gram Adhikari Name should contain only alphabets and spaces.",
  }),

  gstNo: Joi.string()
    .trim()
    .length(15)
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/)
    .required()
    .messages({
      "string.empty": "GST Number is required.",
      "any.required": "GST Number is required.",
      "string.length": "GST Number must be exactly 15 characters long.",
      "string.pattern.base": "GST Number is invalid.",
    }),

  gpMobileNumber: Joi.string()
    .trim()
    .length(10)
    .regex(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "Mobile Number is required.",
      "any.required": "Mobile Number is required.",
      "string.length": "Mobile Number must be exactly 10 digits.",
      "string.pattern.base": "Mobile Number must start with 6, 7, 8, or 9 and be 10 digits long.",
    }),

  state: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "State is required.",
    "any.required": "State is required.",
    "string.min": "State name must have at least 2 characters.",
    "string.max": "State name must not exceed 50 characters.",
  }),

  district: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "District is required.",
    "any.required": "District is required.",
    "string.min": "District name must have at least 2 characters.",
    "string.max": "District name must not exceed 50 characters.",
  }),

  tahsil: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Tahsil is required.",
    "any.required": "Tahsil is required.",
    "string.min": "Tahsil name must have at least 2 characters.",
    "string.max": "Tahsil name must not exceed 50 characters.",
  }),

  grampanchayat: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Grampanchayat Name is required.",
    "any.required": "Grampanchayat Name is required.",
    "string.min": "Grampanchayat Name must have at least 2 characters.",
    "string.max": "Grampanchayat Name must not exceed 50 characters.",
  }),

  grampanchayatPassword: Joi.string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/)
    .required()
    .messages({
      "string.empty": "Grampanchayat Password is required.",
      "any.required": "Grampanchayat Password is required.",
      "string.min": "Password must be at least 8 characters long.",
      "string.max": "Password must not exceed 20 characters.",
      "string.pattern.base": "Password must contain at least one uppercase letter, one number, and one special character.",
    }),

  gpAgreementAmount: Joi.number().min(1).required().messages({
    "number.base": "Agreement Amount must be a valid number.",
    "number.min": "Agreement Amount must be at least 1.",
    "any.required": "Agreement Amount is required.",
  }),
});


const updateDoctorSchema = Joi.object({
  doctorName: Joi.string().required(),

  doctorEmailId: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),

  doctorSpecialisation: Joi.string().required(),

  doctorQualifications: Joi.string().required(),

  experience: Joi.string().required(),

  about: Joi.string().required(),

  doctorLocation: Joi.string().required(),

  doctorFees: Joi.number().required(),

  statusOfDoctorIsOnlineOrOfflineOrBoth: Joi.string().required(),

  doctorAddress: Joi.string().required(),

  // doctorMobileNo:Joi.string()
  // .required(),

  doctorMeetLink: Joi.string().uri().required().messages({
    "string.uri": "Meet link must be a valid URL.",
    "string.empty": "Meet link is required.",
  }),

  doctorMobileNo: Joi.string()
    .pattern(/^[6-9]\d{9}$/) // This regex ensures the number starts with 6, 7, 8, or 9 and has 10 digits
    .required()
    .messages({
      "string.pattern.base":
        "Mobile number must be a valid 10-digit number starting with 6-9.",
      "string.empty": "Mobile number is required.",
    }),

  // doctorWhatsappNo:Joi.string()
  // .required(),

  doctorWhatsappNo: Joi.string()
    .pattern(/^[6-9]\d{9}$/) // This regex ensures the number starts with 6, 7, 8, or 9 and has 10 digits
    .required()
    .messages({
      "string.pattern.base":
        "Whatsapp number must be a valid 10-digit number starting with 6-9.",
      "string.empty": "Whatsapp number is required.",
    }),
});

const sendVerificationCodeSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
});
const acceptCodeSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  providedCode: Joi.string().min(6).max(6).required(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().min(8).max(20),

  newPassword: Joi.string().required().min(8).max(20),
});

const sendForgotPasswordCodeForStaffSchema = Joi.object({
  staffEmail: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
});

const sendForgotPasswordCodeForAdminSchema = Joi.object({
  adminEmailId: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
});

const acceptFPCodeSchema = Joi.object({
  doctorEmailId: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  providedCode: Joi.string().required().min(6).max(6),

  newPassword: Joi.string().required().min(8).max(20),
});

const acceptFPCodeForAdminSchema = Joi.object({
  adminEmailId: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  providedCode: Joi.string().required().min(6).max(6),

  newPassword: Joi.string().required().min(8).max(20),
});

const acceptFPCodeForStaffSchema = Joi.object({
  staffEmail: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  providedCode: Joi.string().required().min(6).max(6),

  newPassword: Joi.string().required().min(8).max(20),
});

const gstSchema = Joi.object({
  date: Joi.date().required(),
  gstNo: Joi.string()
    .pattern(new RegExp('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'))
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid GST number',
    }),
  gstPartyName: Joi.string().min(2).max(100).required(),
  amount: Joi.number().positive().required(),
  checkNo: Joi.string().allow(''),
  pfmsDate: Joi.date().allow(null),
  file: Joi.allow(null),
});

const insuranceSchema = Joi.object({
  date: Joi.date().required(),
  amount: Joi.number().positive().required(),
  file: Joi.allow(null),
});

const kamgarSchema = Joi.object({
  date: Joi.date().required(),
  amount: Joi.number().positive().required(),
  file: Joi.allow(null),
});

const royaltySchema = Joi.object({
  date: Joi.date().required(),
  amount: Joi.number().positive().required(),
  file: Joi.allow(null),
});

const itSchema = Joi.object({
  date: Joi.date().required(),
  partyName: Joi.string().min(2).max(100).required(),
  pan: Joi.string()
    .pattern(new RegExp('^[A-Z]{5}[0-9]{4}[A-Z]{1}$'))
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid PAN number',
    }),
  amount: Joi.number().positive().required(),
  file: Joi.allow(null),
});


export {
  registerSchemaForAdmin,
  loginSchemaForAdmin,
  registerSchema,
  loginSchema,
  addStaffSchema,
  addGrampanchayatSchema,
  updateDoctorSchema,
  sendVerificationCodeSchema,
  acceptCodeSchema,
  changePasswordSchema,
  sendForgotPasswordCodeForStaffSchema,
  acceptFPCodeSchema,
  sendForgotPasswordCodeForAdminSchema,
  acceptFPCodeForAdminSchema,
  acceptFPCodeForStaffSchema,

  loginGrampanchatSchema,


  gstSchema,
  insuranceSchema,
kamgarSchema,
royaltySchema,
itSchema,
};
