const express = require("express");
const { log } = require("node:console");
const fs = require("node:fs");

const app = express();

app.use((req, res, next) => {
    const apiKey = req.headers['api-key'];
    if (!apiKey || apiKey !== 'lukasjeprosteborec') {
        res.send("pico");
    }else {
        next();
    }
});

app.get("/api/data", (req, res) => {
    if (req.query.parameter) {
        fs.readFile("AnimatedTexts/"+req.query.parameter, (err, data) => {
            if (err) console.log(err);
            res.send(data);
        })
    }else {
        log("neco");
    }
})

app.listen(3000, () => console.log("listening"));