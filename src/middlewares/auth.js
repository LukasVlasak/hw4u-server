const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.get("x-auth-token") || req.signedCookies["x-auth-token"];
  if (!token) {
    res.status(400).send({ message: "No token provided" });
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      req.user = decoded; // payload object - mohu pristuopovat pomoci req.user ke current userovi
      next();
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }
};

module.exports = auth;
