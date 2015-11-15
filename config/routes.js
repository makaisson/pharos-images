var env = process.env.NODE_ENV || "development";

// Utility method of setting the cache header on a request
// Used as a piece of Express middleware
var cache = (hours) =>
    (req, res, next) => {
        if (env === "production") {
            res.setHeader("Cache-Control", `public, max-age=${hours * 3600}`);
        }
        next();
    }
};

module.exports = function(app, core) {
    var artists = require("../app/controllers/artists")(core, app);
    var artworks = require("../app/controllers/artworks")(core, app);
    var uploads = require("../app/controllers/uploads")(core, app);
    var sources = require("../app/controllers/sources")(core, app);
    var home = require("../app/controllers/home")(core, app);
    var sitemaps = require("../app/controllers/sitemaps")(core, app);

    app.get("/artists", cache(1), artists.index);
    app.get("/artists/:slug", artists.oldSlugRedirect);
    app.get("/artists/:slug/:artistId", cache(1), artists.show);

    app.param("artistId", artists.load);

    app.get("/search", cache(1), artworks.search);
    app.get("/artworks/:sourceId/:artworkName", artworks.show);

    app.param("artworkName", artworks.load);

    app.get("/uploads/:uploadId", uploads.show);
    app.post("/upload", uploads.searchUpload);

    app.param("uploadId", uploads.load);

    app.get("/sources", cache(1), sources.index);
    app.get("/source/:sourceId", cache(12), sources.show);

    app.param("sourceId", sources.load);

    app.get("/sitemap.xml", sitemaps.index);
    app.get("/sitemap-sources.xml", sitemaps.sources);
    app.get("/sitemap-artists.xml", sitemaps.artists);
    app.get("/sitemap-search-:start.xml", sitemaps.search);

    app.get("/about", cache(1), home.about);
    app.get("/", cache(1), home.index);

    app.use(function(req, res, next) {
        res.status(404).render("404", {
            url: req.originalUrl
        });
    });
};