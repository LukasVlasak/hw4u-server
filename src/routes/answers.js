const router = require("express").Router();
const { authUser } = require("../middlewares/auth");
const pool = require("../db/db");
const path = require("path");
const getAllQuery = require("../db/queries");
const auth = require("../middlewares/auth");
const checkPermissions = require("../middlewares/permissions");
const { answer } = require("../services/validation");
const { sendAndLog, validate } = require("../utils/sendMailAndLog");
const upload = require("../services/multer");

const { deleteDocument } = require("./documents");

const deleteAnswer = async (answerId) => {

    const documents = await pool.query(
        "SELECT document_id from document WHERE answer_id = $1",
        [answerId]
    );

    if (documents.rowCount > 0) {
        for (let i = 0; i < documents.rowCount; i++) {
            
            await deleteDocument(documents.rows[i].document_id);
            
        }
    }

    await pool.query("delete from answer_app_user where answer_id = $1", [
        answerId
    ]);

    const response = await pool.query(
        "DELETE FROM answer WHERE answer_id = $1",
        [answerId]
    );
    if (response.rowCount === 0) {
        return false;
    }

    return true;
}

router.get("/", auth.authAdmin, async (req, res) => {
  try {
    const response = await pool.query(`
      select a.*, u.email as app_user_email_answer from answer a left join app_user u on a.app_user_id = u.app_user_id
    `);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);

router.get("/full-answer/:id", authUser, async (req, res) => {
  try {
    if (isNaN(parseInt(req.params.id))) {
      return res.status(500).send({message: "Not a number"});
    }

    const check = await pool.query("select * from answer_app_user where answer_id = $1 and app_user_id = $2 and confirmed = true and paid = true", [req.params.id, req.user.app_user_id]);
    const check2 = await pool.query("select * from answer where answer_id = $1 and app_user_id = $2", [req.params.id, req.user.app_user_id]);

    if ((check.rowCount !== 0 || check2.rowCount !== 0) || req.user.is_admin === true) {
      const response = await pool.query(`
      SELECT a.*, json_agg(
        json_build_object(
          'document_id', d.document_id,
          'filename', d.filename
        )
      ) as documents
      FROM answer a
      LEFT JOIN document d ON a.answer_id = d.answer_id and d.is_preview = false
      WHERE a.answer_id = $1
      GROUP BY a.answer_id
    `, [req.params.id]);

    if (response.rowCount === 0) {
      return res.status(500).send({message: "This answer does not exists"});
    }
    res.status(200).send(response.rows);
    } else {
      return res.status(500).send({message: "You have to buy this answer first"});
    }
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);

router.get("/bought", authUser, async (req, res) => {
  try {
    const response = await pool.query(`
      select au.*, a.title, a.answer_id, a.task_id from answer_app_user au left join answer a on a.answer_id = au.answer_id where au.app_user_id = $1
    `, [req.user.app_user_id]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/provided", authUser, async (req, res) => {
  try {
    const response = await pool.query(`
      select au.*, a.title, a.answer_id, a.task_id from answer_app_user au left join answer a on a.answer_id = au.answer_id where a.app_user_id = $1
    `, [req.user.app_user_id]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.put("/paid/:id", authUser, async (req, res) => {
  try {
    if (isNaN(parseInt(req.params.id))) {
      return res.status(500).send({message: "Not a number"});
    }

    await pool.query("UPDATE answer_app_user SET paid = true WHERE answer_id = $1 and app_user_id = $2", [req.params.id, req.user.app_user_id]);
    res.status(200).send({message: "Success"});
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);

router.put("/confirm/:id", authUser, async (req, res) => {
  try {
    if (isNaN(parseInt(req.params.id))) {
      return res.status(500).send({message: "Not a number"});
    }

    await pool.query(`
      UPDATE answer_app_user au
      SET confirmed = true
      FROM answer a
      WHERE au.answer_id = $1
        AND a.app_user_id = $2
        AND a.answer_id = au.answer_id;
      `, [req.params.id, req.user.app_user_id]);
    res.status(200).send({message: "Success"});
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
}
);

router.put("/buy/:id", authUser, async (req, res) => {
  try {
    if (isNaN(parseInt(req.params.id))) {
      return res.status(500).send({message: "Not a number"});
    }

    const answer = await pool.query("SELECT * from answer_app_user WHERE answer_id = $1 and app_user_id = $2", [req.params.id, req.user.app_user_id]);
    if (answer.rowCount > 0) {
      return res.status(400).send({message: "You already bought this answer"});
    }

    const response = await pool.query(
      "INSERT INTO answer_app_user (app_user_id, answer_id) VALUES ($1, $2)",
      [req.user.app_user_id, req.params.id]
    );

    res.status(200).send({ message: "Success" });
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

router.get("/by-user/:id", authUser, async (req, res) => {
  try {

    if (isNaN(parseInt(req.params.id))) {
      return res.status(500).send({message: "Not a number"});
    }

    const response = await pool.query(`
    SELECT 
        a.answer_id,
        a.task_id,
        a.title,
        a.preview,
        a.created_date,
        u.*,
        json_agg(
            json_build_object(
                'document_id', d.document_id,
                'filename', d.filename,
                'is_preview', d.is_preview
            )
        ) as documents
    from answer a
    left join document d on a.answer_id = d.answer_id and d.is_preview = true
    left join app_user u on a.app_user_id = u.app_user_id
    where a.app_user_id = $1
    group by a.answer_id, u.app_user_id, a.task_id, a.title, a.preview, a.created_date
  `, [req.params.id]);

    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }

});

router.delete("/:id", authUser, async (req, res) => {
    try {
        if (isNaN(parseInt(req.params.id))) {
            return res.status(500).send({message: "Not a number"});
        }

        const answer = await pool.query("SELECT * from answer WHERE answer_id = $1", [req.params.id]);
        if (answer.rowCount === 0) {
            return res.status(500).send({message: "This answer does not exists"});
        }

        if (answer.rows[0].app_user_id !== req.user.app_user_id || req.user.is_admin === false) {
            return res.status(500).send({message: "No authorized"})
        }

        await deleteAnswer(req.params.id);
        res.status(200).send({message: "Success"});
    } catch (err) {
        sendAndLog(err);
        res.status(500).send({ message: err.message });
    }
  
});

router.get("/:id", auth.authAdmin, async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(500).send({message: "Not a number"});
  }

  pool.query(`SELECT a.*, u.email as app_user_email_answer, json_agg(json_build_object(
    'document_id', d.document_id,
    'filename', d.filename,
    'is_preview', d.is_preview
  )) as documents
   from answer a left join document d on d.answer_id = a.answer_id left join app_user u on u.app_user_id = a.app_user_id WHERE a.answer_id = $1 group by a.answer_id, u.email`, [req.params.id]).then((response) => {
    const answer = response.rows;
    if (answer.length > 0) {
      res.status(200).send(answer);
    }else {
      res.status(500).send({message: "This answer does not exists"});
    }
  }).catch((err) => {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  });
});


// router.get("/by-task/:id", auth, async (req, res) => {
//   try {
//     const response = await pool.query(`
//     SELECT a.*, (
//       SELECT json_agg(json_build_object('name', u.name, 'email', u.email))
//       FROM users u
//       WHERE u.id = a.user_id
//     ) AS for_user, (
//       SELECT json_agg(json_build_object('filename', d.filename))
//       FROM documents d
//       WHERE d.answer_id = a.id
//     ) AS documents, (
//       SELECT json_build_object('title', t.title, 'id', t.id)
//       FROM tasks t
//       WHERE t.id = a.task_id
//     ) AS tasks
//     FROM answers a
//     where task_id = $1
//   `, [req.params.id]);

//     res.status(200).send(response.rows);
//   } catch (err) {
//     sendAndLog(err);
//     res.status(500).send({ message: err.message });
//   }

// });

router.post("/", authUser, upload, async (req, res) => {
  try {
    validate(answer, req.body);

    const check = await pool.query("select pu.answered, p.answer_limit from product_app_user pu left join product p on p.product_id = pu.product_id where pu.app_user_id = $1", [
      req.user.app_user_id
    ]);

    if (check.rowCount === 0) {
      return res.status(500).send({message: "You have to buy a product first"});
    }
    if (check.rows[0].answered >= check.rows[0].answer_limit) {
      return res.status(500).send({message: "You have reached the limit of answers"});
    }

    const response = await pool.query(
      "INSERT INTO answer (task_id, app_user_id, preview, full_answer, title) VALUES ($1, $2, $3, $4, $5) returning answer_id",
      [req.body.task_id, req.user.app_user_id, req.body.preview, req.body.full_answer, req.body.title]
    );

    const files = req.files["files"] || [];
    const previews = req.files["previews"] || [];

    await files.forEach(async file => {
    await pool.query(
        "INSERT INTO document (filename, answer_id, is_preview) VALUES ($1, $2, $3)",
        [file.filename, response.rows[0].answer_id, false]
    );
    });

    await previews.forEach(async file => {
    await pool.query(
        "INSERT INTO document (filename, answer_id, is_preview) VALUES ($1, $2, $3)",
        [file.filename, response.rows[0].answer_id, true]
    );
    });

    await pool.query("UPDATE product_app_user SET answered = answered + 1 WHERE app_user_id = $1", [
      req.user.app_user_id
    ]);

    const answers = await pool.query("select pu.answered, p.answer_limit from product_app_user pu left join product p on p.product_id = pu.product_id where pu.app_user_id = $1", [req.user.app_user_id]);
    if (answers.rowCount > 0) {
      if (answers.rows[0].answered >= answers.rows[0].answer_limit) {
        await pool.query("delete from product_app_user WHERE app_user_id = $1", [
          req.user.app_user_id
        ]);
      }
    }
    
    res.status(200).send(response.rows);
  } catch (err) {
    sendAndLog(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = {
    router,
    deleteAnswer
};
