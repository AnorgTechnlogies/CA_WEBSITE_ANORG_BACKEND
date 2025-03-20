import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import connectDB from "./config/mongodb.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/staffRoute.js";
import connectCloudinary from "./config/cloudinary.js";
import staffRouter from "./routes/staffRoute.js";
import grampanchayatRouter from "./routes/gramPanchayatRoute.js";
// import appointmentRouter from "./routes/appoinmentRoute.js";

const app = express();
config({ path: "./config/config.env" });

connectDB();
connectCloudinary();

// app.use(cors());
console.log(process.env.FRONTEND_URI, "frontend url");
console.log(process.env.FRONTEND_URI_SECOND, "frontend url second");
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URI,
      process.env.FRONTEND_URI_SECOND,
      process.env.FRONTEND_URI_THIRD,
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// app.use(cors({
//   origin: ['http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'] // Correct format
// }));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/admin", adminRouter);
app.use("/api/staff", staffRouter);
app.use("/api/grampanchayat", grampanchayatRouter);

app.get("/api/testing", (req, res) => {
  try {
    res.status(200).json({ message: "API is working" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`listening... on port ${process.env.PORT}`);
});

config({ path: "./config/config.env" });
