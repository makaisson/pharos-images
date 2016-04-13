"use strict";

const fs = require("fs");
const path = require("path");
const async = require("async");

/* istanbul ignore if */
if (process.env.NODE_ENV !== "test") {
    // Load in configuration options
    require("dotenv").load();
}

const core = {};
const models = require("./lib/models")(core);

// Load Libraries
fs.readdirSync("lib").forEach((file) => {
    const name = path.basename(file, ".js");
    core[name] = require(path.resolve(__dirname, "./lib/", file))(core);
});

core.models = {};

// Load Models
fs.readdirSync("schemas").forEach((file) => {
    const name = path.basename(file, ".js");
    core.models[name] = models(name);
});

core.init = (callback) => {
    return new Promise((resolve, reject) => {
        async.series([
            (callback) => core.db.connect(callback),
            (callback) => core.models.Source.cacheSources(callback),
        ], (err) => {
            /* istanbul ignore if */
            if (callback) {
                callback(err);
            }

            /* istanbul ignore if */
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

module.exports = core;
