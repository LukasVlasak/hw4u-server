const express = require("express");
const fs = require("node:fs");
const helmet = require("helmet");
const app = express();
const tasks = require("./src/routes/tasks");
const users = require("./src/routes/users");
const auth = require("./src/routes/auth");
const answers = require("./src/routes/answers");
const { sendAndLog } = require("./src/utils/sendMailAndLog");
const cors = require("cors");

/*
build-in middleware - express.json() - parse req.body to json object
                    - exporess.urlencoded({extended: true}) - parse params send by form to json object
                    - express.static('public') - serve static content (able to reach http://localhost:300/img.png) - vse co dam do public je pristupne - nemusim vytr
                    varet enpoint
helmet - libary for securing requests
*/
app.use(express.json());
app.use(cors());
app.use((error, req, res, next) => {
    // const apiKey = req.headers['api-key'];
    // if (!apiKey || apiKey !== 'lukasjeprosteborec') {
    //     res.send("pico");
    // }else {
    //     next();
    // }
    if (error) {
        sendAndLog(error);
        res.status(500).send({message: error.message});
    }else {
        next();
    }
    
});
app.use("/api/answers", answers);
app.use("/api/auth", auth);
app.use("/api/users", users);
app.use("/api/tasks", tasks);

app.get("/api/data", (req, res) => {
    if (req.query.parameter) {
        fs.readFile("AnimatedTexts/"+req.query.parameter, (err, data) => {
            if (err) {
                sendAndLog(err);
                return res.status(500).send({message: err.message})
            }
            res.status(200).send(data);
        })
    }else {
        res.status(500).send({message: 'Parameter not provided'});
    }
})


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log("listening on port ", PORT));