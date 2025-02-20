import jwt from "jsonwebtoken";

const adminIdentifier = (req, res, next) => {
  let token;
  if (req.headers.client === "not-browser") {
    token = req.headers.authorization;
  } else {
    token = req.cookies["Authorization"];
    // token = req.cookies['Admin'];
  }

  if (!token) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  try {
    const adminToken = token.split(" ")[1];
    const jwtVerified = jwt.verify(adminToken, process.env.TOKEN_SECRET);
    if (jwtVerified) {
      req.admin = jwtVerified;
      next();
    } else {
      throw new Error("error in the token");
    }
  } catch (error) {
    console.log(error);
    return res
      .status(403)
      .json({
        success: false,
        message: "error occured in catch block invalid token",
      });
  }
};

const staffIdentifier = (req, res, next) => {
  let token;
  if (req.headers.client === "not-browser") {
    token = req.headers.authorization;
  } else {
    token = req.cookies["Authorization"];
    // token = req.cookies['Admin'];
  }

  if (!token) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  try {
    const staffToken = token.split(" ")[1];
    const jwtVerified = jwt.verify(staffToken, process.env.TOKEN_SECRET);
    if (jwtVerified) {
      req.staff = jwtVerified;
      next();
    } else {
      throw new Error("error in the token");
    }
  } catch (error) {
    console.log(error);
    return res
      .status(403)
      .json({
        success: false,
        message: "error occured in catch block invalid token",
      });
  }
};

const grampanchayatIdentifier = (req, res, next) => {
  let token;
  if (req.headers.client === "not-browser") {
    token = req.headers.authorization;
  } else {
    token = req.cookies["Authorization"];
    // token = req.cookies['Admin'];
  }

  if (!token) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  try {
    const grampanchayatToken = token.split(" ")[1];
    const jwtVerified = jwt.verify(grampanchayatToken, process.env.TOKEN_SECRET);
    if (jwtVerified) {
      req.Grampanchayat = jwtVerified;
      next();
    } else {
      throw new Error("error in the token");
    }
  } catch (error) {
    console.log(error);
    return res
      .status(403)
      .json({
        success: false,
        message: "error occured in catch block invalid token",
      });
  }
};

export { adminIdentifier, staffIdentifier ,grampanchayatIdentifier};