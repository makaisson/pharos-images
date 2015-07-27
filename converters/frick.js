var csv = require("csv-streamify");
var yr = require("yearrange");
var pd = require("parse-dimensions");
var mongoose = require("mongoose");

require("../models/ExtractedArtwork.js")();

var ExtractedArtwork = mongoose.model("ExtractedArtwork");

/*
 * ID (WORK ID)
 * Title (TITLE)
 * Date (WORK DATE)
 * Category (FRICK CLASSIFICATION)
 * Material (MATERIAL)
 * Artist (CREATOR)
 * Artist Dates (CREATOR DATES)
 * Artist School (SCHOOL)
 * ??? (VARIANT ARTIST)
 * Dimensions (MEASUREMENTS)
 * Collection (COLLECTION)
 * Collection Location (COLLECTION CITY)
 * Sources (SOURCES)
 */

/*
 * Image ID (BIBLIOGRAPHIC RECORD NUMBER)
 * PATH
 */

var propMap = {
    id: "WORK ID",
    title: "TITLE",
    dateCreateds: ["WORK DATE", function(date, data) {
        return yr.parse(date || data["CREATOR DATES"]);
    }],
    categories: "FRICK CLASSIFICATION",
    objectType: "MATERIAL",
    // material?
    artists: {
        name: "CREATOR",
        dates: ["CREATOR DATES", function(date) {
            return yr.parse(date);
        }],
        school: "SCHOOL"
    },
    // VARIANT ARTIST ???
    dimensions: ["MEASUREMENTS", function(dimension) {
        if (dimension) {
            return pd.parseDimensions(dimension);
        } else {
            return [];
        }
    }],
    collections: {
        location: "COLLECTION CITY",
        name: "COLLECTION"
    },
    images: {
        id: "BIBLIOGRAPHIC RECORD NUMBER",
        fileName: ["PATH", function(path) {
            return /([^\/]*)$/.exec(path.replace(/\.tif$/, ""))[0];
        }]
    }
};

var searchByProps = function(row, propMap) {
    var results = {};

    for (var propName in propMap) {
        var searchValue = propMap[propName];

        if (typeof searchValue === "string") {
            var value = row[searchValue];
            if (value) {
                results[propName] = value;
            }

        } else if (Array.isArray(searchValue)) {
            var value = row[searchValue[0]];
            results[propName] = searchValue[1](value, row);

        } else if (typeof searchValue === "object") {
            results[propName] = searchByProps(row, searchValue);
        }
    }

    return results;
};

var cluster = function(rows, id, toCluster) {
    var map = {};

    return rows.map(function(row) {
        if (row[id] in map) {
            var base = map[row[id]];

            toCluster.forEach(function(clustered) {
                if (Array.isArray(row[clustered])) {
                    base[clustered] = base[clustered].concat(
                        row[clustered]);
                } else {
                    base[clustered].push(row[clustered]);
                }
            });

        } else {
            map[row[id]] = row;

            toCluster.forEach(function(clustered) {
                if (!Array.isArray(row[clustered])) {
                    row[clustered] = [row[clustered]];
                }
            });

            return row;
        }
    }).filter(function(row) {
        return !!row;
    });
};

var results = [];

process.stdin
    .pipe(csv({
        objectMode: true,
        delimiter: "\t",
        columns: true
    }))
    .on("data", function(data) {
        var result = searchByProps(data, propMap);
        if (result.id) {
            results.push(result);
        }
    })
    .on("end", function() {
        var filtered = cluster(results, "id", ["images"]);
        var models = filtered.map(function(result) {
            result._id = "frick/" + result.id;
            result.lang = "en";
            result.source = "frick";
            //result.artists = [result.artist];
            var model = new ExtractedArtwork(result);
            console.log(model);
            return model;
        });
        console.log("DONE:", filtered.length);
    });