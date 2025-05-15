const { authAdmin } = require("../middlewares/auth");
const pool = require("../db/db");
const { sendAndLog } = require("../utils/sendMailAndLog");

const router = require("express").Router();

router.get("/", async (req, res) => {
  try {
    const response = await pool.query("SELECT c.*, cc.name as parent_category_name FROM category c left join category cc on c.parent_category_id = cc.category_id");
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
})

router.get("/parent-id/:id", async (req, res) => {
  try {
    if (req.params.id == -1) {
      
      const response = await pool.query("SELECT * FROM category WHERE parent_category_id is null", []);
    
      res.status(200).send(response.rows);
    } else {
      
      const response = await pool.query("SELECT * FROM category WHERE parent_category_id = $1", [req.params.id]);
      
      res.status(200).send(response.rows);
    }
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);

router.get("/:id", async (req, res) => {
  try {
    const response = await pool.query("SELECT * FROM category WHERE category_id = $1", [req.params.id]);
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Category not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.post("/", authAdmin, async (req, res) => {
  try {
    if (req.body.parent_category_id === "") {
      req.body.parent_category_id = null;
    }
    const response = await pool.query(
      "INSERT INTO category (name, parent_category_id) VALUES ($1, $2) RETURNING *",
      [req.body.name, req.body.parent_category_id]
    );
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);

router.put("/:id", authAdmin, async (req, res) => {
  try {
    const response = await pool.query(
      "UPDATE category SET name = $1, parent_category_id = $2 WHERE category_id = $3 RETURNING *",
      [req.body.name, req.body.parent_category_id, req.params.id]
    );
    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Category not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.delete("/:id", authAdmin, async (req, res) => {
    
  try {
    const response = await pool.query(`
      WITH RECURSIVE subcategories AS (
        SELECT category_id FROM category WHERE category_id = $1
        UNION ALL
        SELECT c.category_id
        FROM category c
        INNER JOIN subcategories sc ON c.parent_category_id = sc.category_id
      )
      DELETE FROM category WHERE category_id IN (SELECT category_id FROM subcategories);
    `, [req.params.id]);

    if (response.rowCount === 0) {
      return res.status(404).send({ message: "Category not found" });
    }
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = {router};
