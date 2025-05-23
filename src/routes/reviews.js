const router = require("express").Router();
const pool = require("../db/db");
const getAllQuery = require("../db/queries");
const { review } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const auth = require("../middlewares/auth");

const deleteReview = async (reviewId) => {
  const response = await pool.query(
    "DELETE FROM review WHERE review_id = $1 RETURNING review_id",
    [reviewId]
  );
  if (response.rowCount === 0) {
    return false;
  }
  return true;
}

// router.get("/", (req, res) => {
//   pool
//     .query(getAllQuery("reviews"))
//     .then((response) => {
//       res.status(200).send(response.rows);
//     })
//     .catch((error) => {
//       sendAndLog(error);
//       res.status(500).send({ message: error.message });
//     });
// });

router.get("/by-user/:id", async (req, res) => {
  try {
    const response = await pool.query(
      "SELECT r.review_id, r.text, r.app_user_id, u.full_name, u.username, r.stars as stars FROM review r left join app_user u on u.app_user_id = r.app_user_id WHERE r.for_app_user_id = $1",
      [req.params.id]
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/", async (req, res) => {
  try {    
    const response = await pool.query(
      "select * from review_with_users"
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);

router.get("/:id", auth.authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "SELECT r.review_id, r.text, r.app_user_id, u.email, uu.email as for_user_email, r.stars FROM review r left join app_user u on u.app_user_id = r.app_user_id left join app_user uu on uu.app_user_id = r.for_app_user_id WHERE r.review_id = $1",
      [req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Review not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.delete("/admin/:id", auth.authAdmin, async (req, res) => {
  try {
    const status = await deleteReview(req.params.id);
    if (status) {
      res.status(200).send({ message: "Review deleted successfully" });
    } else {
      res.status(404).send({ message: "Review not found" });
    }
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.delete("/:id", auth.authUser, async (req, res) => {
  try {
    const response = await pool.query(
      "DELETE FROM review WHERE review_id = $1 AND app_user_id = $2 RETURNING review_id",
      [req.params.id, req.user.app_user_id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Review not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.post("/", auth.authUser, async (req, res) => {
  try {
    validate(review, req.body);
    const response = await pool.query(
        "INSERT INTO review (text, app_user_id, for_app_user_id, stars) VALUES ($1, $2, $3, $4) RETURNING text, created_date",
        [
          req.body.text,
          req.user.app_user_id,
          req.body.for_app_user_id,
          req.body.stars
        ]
      );
      res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = {
  deleteReview,
  router,
};
