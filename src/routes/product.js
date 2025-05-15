const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { feedback } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const {authUser, authAdmin} = require("../middlewares/auth");

router.get("/", (req, res) => {
  pool
    .query("SELECT * from product")
    .then((response) => {
      res.status(200).send(response.rows);
    })
    .catch((error) => {
      sendAndLog(error);
      res.status(500).send({ message: error.message });
    });
});


router.get("/ui", async (req, res) => {
  try {
    const response = await pool.query("select * from product where active = true");
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);


router.get("/active", authUser, async (req, res) => {
  try {
    const response = await pool.query(
      `
        select pr.*, pu.answered from product_app_user pu left join product pr on pr.product_id = pu.product_id where pu.app_user_id = $1
      `,
      [req.user.app_user_id]
    );

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/by-user", authUser, async (req, res) => {
  try {
    const response = await pool.query("select pu.answered, p.* from product_app_user pu left join product p on p.product_id = pu.product_id where pu.app_user_id = $1", [
      req.user.app_user_id
    ]);
    

    res.status(200).send(response.rows);
    
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const response = await pool.query(
      "Select * from product where product_id = $1",
      [req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});



router.put("/:id", authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "UPDATE product SET name = $1, price = $2 WHERE product_id = $3 RETURNING *",
      [req.body.name, req.body.price, req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "product not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});


router.post("/", authUser, async (req, res) => {
  try {
    const response = await pool.query(
        "INSERT INTO product (name, price, answer_limit) VALUES ($1, $2, $3) RETURNING *",
        [
          req.body.name,
          req.body.price,
          req.body.answer_limit,
        ]
      );
      res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.put("/active/:id", authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "UPDATE product SET active = true WHERE product_id = $1 RETURNING *",
      [req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.delete("/:id", authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "UPDATE product SET active = false WHERE product_id = $1 RETURNING *",
      [req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = {router};
