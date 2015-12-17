"use strict";

const path = require("path");

const expressCDN = require("express-cdn");

const staticBucket = process.env.S3_STATIC_BUCKET;
const env = process.env.NODE_ENV || "development";
const rootPath = path.resolve(__dirname, "../..");

module.exports = (core, app) => {
    let CDN = (req, res) => (path) => path;

    if (staticBucket) {
        if (!process.env.S3_KEY) {
            throw new Error("ENV S3_KEY is undefined.");
        }

        if (!process.env.S3_SECRET) {
            throw new Error("ENV S3_SECRET is undefined.");
        }

        CDN = expressCDN(app, {
            publicDir: `${rootPath}/public`,
            viewsDir: `${rootPath}/app/views`,
            extensions: [".swig"],
            domain: staticBucket,
            bucket: staticBucket,
            key: process.env.S3_KEY,
            secret: process.env.S3_SECRET,
            ssl: false,
            production: env === "production",
        });
    }

    app.use((req, res, next) => {
        res.locals.CDN = CDN(req, res);
        next();
    });
};
