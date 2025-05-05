const json = require("jsonwebtoken");
const pool = require("../db/db.js");

const verify = json.verify;
// req.user
// next(new CustomError(...)), the execution of the route /api/auth will stop and the error will be propagated to the next error-handling middleware or the global error handler
const authUser = async (req, res, next) => {
  const token = req.signedCookies["x-auth-token"];
  
  if (!token) {
    res.status(400).send({ message: "No token provided" });
  } else {
    try {
      const decoded = verify(token, process.env.JWT_KEY);
      
      const result = await pool.query("SELECT * from app_user WHERE app_user_id = $1", [decoded.id]);
      
      if (result.rowCount === 1) {
          delete result.rows[0].password;
          req.user = result.rows[0];
          next();
      } else {
        res.clearCookie("x-auth-token");
        res.status(400).send({ message: err.message });
      }
    } catch (err) {
      // smazat token pokud je neplatny
      res.clearCookie("x-auth-token");
      res.status(400).send({ message: err.message });
    }
  }
};

// req.user - full user without passwd
const authAdmin = async (req, res, next) => {
  const token = req.signedCookies["x-auth-token"];
  if (!token) {
    res.status(400).send({ message: "No token provided" });
  } else {
    try {
      const decoded = verify(token, process.env.JWT_KEY);
      const result = await pool.query("SELECT * from app_user WHERE app_user_id = $1", [decoded.id]);
      if (result.rowCount === 1) {
        if (result.rows[0].is_admin === true) {
            delete result.rows[0].password;
            req.user = result.rows[0];
            next();
        } else {
          return res.status(400).send({ message: "No admin permissions" });
        }
      } else {
        res.clearCookie("x-auth-token");
        next(
          new Error("Error - api/adminAuth GET")
        );
      }
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }
};

module.exports = {
  authUser,
  authAdmin,
};
