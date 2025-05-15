const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { review, adminPayment } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const auth = require("../middlewares/auth");
const bcrypt = require("bcrypt");

const createAdminPaymet = async (userId, productId) => {
    await pool.query("INSERT INTO payment (state, admin_payment, app_user_id, product_id) VALUES ($1, $2, $3, $4)", [
        "done", true, userId, productId
    ]);

    await pool.query("INSERT INTO product_app_user (app_user_id, product_id) VALUES ($1, $2)", [
        userId, productId
    ])
}

router.post("/", auth.authUser, async (req, res) => {
  try {
    validate(adminPayment, req.body);
    
    const user = await pool.query("SELECT * from app_user WHERE email = $1", [
      req.body.email,
    ]);
    if (user.rowCount === 0)
      return res.status(400).send({ message: "This email doesnt exist sign up first", type: 'notAdmin', errorCode: 'notAdmin' });
    const result = await bcrypt.compare(
      req.body.password,
      user.rows[0].password
    );
    if (!result) return res.status(400).send({ message: "Bad password", type: "notAdmin", errorCode: "notAdmin" });

    if (user.rows[0].is_admin === false) {
      return res.status(400).send({ message: "You are not an admin", type: "notAdmin", errorCode: "notAdmin" });
    }

    const payments = await pool.query("SELECT * from product_app_user WHERE app_user_id = $1", [
      req.user.app_user_id
    ]);

    if (payments.rowCount > 0) {
      return res.status(400).send({ message: "You already have this product", type: "notAdmin", errorCode: "alreadyHaveProduct" });
    }

    await createAdminPaymet(req.user.app_user_id, req.body.productId);

    return res.status(200).send({ message: "success" });
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = {router};
