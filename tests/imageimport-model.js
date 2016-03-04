"use strict";

const path = require("path");

const tap = require("tap");

const init = require("./lib/init");
const stub = init.stub;
const req = init.req;
const ImageImport = init.ImageImport;

tap.test("getUrl", {autoend: true}, (t) => {
    const batch = init.getBatch();
    t.equal(batch.getUrl(req.lang),
        "http://localhost:3000/source/test/import?images=test/started",
        "Get URL");
});

tap.test("getSource", {autoend: true}, (t) => {
    const batch = init.getBatch();
    const source = init.getSource();
    t.equal(batch.getSource(), source, "Get Source");
});

tap.test("getCurState", {autoend: true}, (t) => {
    const batch = init.getBatch();
    const state = batch.getCurState();
    t.equal(state.id, "started", "Get State ID");
    t.equal(state.name(req), "Uploaded.", "Get State Name");
});

tap.test("getNextState", {autoend: true}, (t) => {
    const batch = init.getBatch();
    const state = batch.getNextState();
    t.equal(state.id, "process.started", "Get State ID");
    t.equal(state.name(req), "Processing...", "Get State Name");
});

tap.test("canAdvance", {autoend: true}, (t) => {
    const batch = init.getBatch();
    t.equal(batch.canAdvance(), true, "Check if state can advance");
});

tap.test("saveState", (t) => {
    const batch = init.getBatch();
    batch.saveState("process.started", () => {
        const state = batch.getCurState();
        t.equal(state.id, "process.started", "Get State ID");
        t.equal(state.name(req), "Processing...", "Get State Name");
        t.end();
    });
});

tap.test("getError", {autoend: true}, (t) => {
    const errors = ["ERROR_READING_ZIP", "ZIP_FILE_EMPTY", "MALFORMED_IMAGE",
        "EMPTY_IMAGE", "NEW_VERSION", "TOO_SMALL", "ERROR_SAVING"];
    for (const error of errors) {
        t.ok(ImageImport.getError(error, req), error);
        t.notEqual(ImageImport.getError(error, req), error, error);
    }
});

tap.test("getFilteredResults", {autoend: true}, (t) => {
    const results = init.getBatches()
        .map((batch) => batch.getFilteredResults());
    t.same(results[0], {
        errors: [],
        models: [],
        warnings: [],
    });
    t.same(results[2], {
        "errors": [
            {
                "_id": "corrupted.jpg",
                "error": "MALFORMED_IMAGE",
                "fileName": "corrupted.jpg",
            },
            {
                "_id": "empty.jpg",
                "error": "EMPTY_IMAGE",
                "fileName": "empty.jpg",
            },
        ],
        "models": [
            {
                "_id": "bar.jpg",
                "fileName": "bar.jpg",
                "model": "test/bar.jpg",
                "warnings": [
                    "NEW_VERSION",
                ],
            },
            {
                "_id": "foo.jpg",
                "fileName": "foo.jpg",
                "model": "test/foo.jpg",
                "warnings": [
                    "NEW_VERSION",
                ],
            },
            {
                "_id": "new1.jpg",
                "fileName": "new1.jpg",
                "model": "test/new1.jpg",
                "warnings": [],
            },
            {
                "_id": "new2.jpg",
                "fileName": "new2.jpg",
                "model": "test/new2.jpg",
                "warnings": [],
            },
            {
                "_id": "small.jpg",
                "fileName": "small.jpg",
                "model": "test/small.jpg",
                "warnings": [
                    "TOO_SMALL",
                ],
            },
            {
                "_id": "new3.jpg",
                "fileName": "new3.jpg",
                "model": "test/new3.jpg",
                "warnings": [],
            },
        ],
        "warnings": [
            {
                "_id": "bar.jpg",
                "fileName": "bar.jpg",
                "model": "test/bar.jpg",
                "warnings": [
                    "NEW_VERSION",
                ],
            },
            {
                "_id": "foo.jpg",
                "fileName": "foo.jpg",
                "model": "test/foo.jpg",
                "warnings": [
                    "NEW_VERSION",
                ],
            },
            {
                "_id": "small.jpg",
                "fileName": "small.jpg",
                "model": "test/small.jpg",
                "warnings": [
                    "TOO_SMALL",
                ],
            },
        ],
    });
    t.same(results[5], {
        errors: [],
        models: [],
        warnings: [],
    });
});

tap.test("validate", (t) => {
    const testZip = path.resolve(process.cwd(), "data", "corrupted.zip");

    const batch = new ImageImport({
        _id: "test/corrupted",
        source: "test",
        zipFile: testZip,
        fileName: "corrupted.zip",
    });

    batch.validate((err) => {
        t.error(err, "Error should be empty.");
        t.equal(batch._id, "test/corrupted", "ID should match");
        t.end();
    });
});

tap.test("validate", (t) => {
    const testZip = path.resolve(process.cwd(), "data", "corrupted.zip");

    const batch = new ImageImport({
        source: "test",
        zipFile: testZip,
        fileName: "corrupted.zip",
    });

    batch.validate((err) => {
        t.error(err, "Error should be empty.");
        t.ok(batch._id, "Should have an ID.");
        t.end();
    });
});

tap.test("processImages", (t) => {
    const batch = init.getBatch();
    batch.processImages((err) => {
        t.error(err, "Error should be empty.");

        const expected = init.getImageResultsData();

        t.equal(batch.results.length, expected.length);
        expected.forEach((item, i) => {
            t.same(batch.results[i], item);
        });

        t.end();
    });
});

tap.test("processImages (Corrupted File)", (t) => {
    const testZip = path.resolve(process.cwd(), "data", "corrupted.zip");

    const batch = new ImageImport({
        _id: "test/started",
        source: "test",
        zipFile: testZip,
        fileName: "corrupted.zip",
    });

    batch.processImages((err) => {
        t.ok(err, "Expecting an error");
        t.equal(err.message, "ERROR_READING_ZIP");
        t.end();
    });
});

tap.test("processImages (Empty File)", (t) => {
    const testZip = path.resolve(process.cwd(), "data", "empty.zip");

    const batch = new ImageImport({
        _id: "test/started",
        source: "test",
        zipFile: testZip,
        fileName: "empty.zip",
    });

    batch.processImages((err) => {
        t.ok(err, "Expecting an error");
        t.equal(err.message, "ZIP_FILE_EMPTY");
        t.end();
    });
});

tap.test("processImages (advance, started)", (t) => {
    const batch = init.getBatch();
    t.equal(batch.getCurState().name(req), "Uploaded.");
    batch.advance((err) => {
        t.error(err, "Error should be empty.");

        const expected = init.getImageResultsData();

        t.equal(batch.results.length, expected.length);
        expected.forEach((item, i) => {
            t.same(batch.results[i], item);
        });

        t.equal(batch.state, "process.completed");

        t.end();
    });
});

tap.test("processImages (advance, process.started)", (t) => {
    const batch = init.getBatches()[1];
    t.equal(batch.getCurState().name(req), "Processing...");
    batch.advance((err) => {
        t.error(err, "Error should be empty.");
        t.equal(batch.results.length, 0);
        t.equal(batch.state, "process.started");
        t.end();
    });
});

tap.test("processImages (advance, process.completed)", (t) => {
    const batch = init.getBatches()[2];
    t.equal(batch.getCurState().name(req), "Processing Completed.");
    batch.advance((err) => {
        t.error(err, "Error should be empty.");

        const expected = init.getImageResultsData();

        t.equal(batch.results.length, expected.length);
        expected.forEach((item, i) => {
            t.same(batch.results[i], item);
        });

        t.equal(batch.state, "completed");

        t.end();
    });
});

tap.test("processImages (advance, completed)", (t) => {
    const batch = init.getBatches()[4];
    t.equal(batch.getCurState().name(req), "Completed.");
    batch.advance((err) => {
        t.error(err, "Error should be empty.");

        const expected = init.getImageResultsData();

        t.equal(batch.results.length, expected.length);
        expected.forEach((item, i) => {
            t.same(batch.results[i], item);
        });

        t.equal(batch.state, "completed");

        t.end();
    });
});

tap.test("processImages (advance, error)", (t) => {
    const batch = init.getBatches()[5];
    t.notOk(batch.getCurState());
    batch.advance((err) => {
        t.error(err, "Error should be empty.");
        t.equal(batch.results.length, 0);
        t.equal(batch.state, "error");
        t.end();
    });
});

tap.test("processImages (advance, Corrupted File)", (t) => {
    const testZip = path.resolve(process.cwd(), "data", "corrupted.zip");

    const batch = new ImageImport({
        _id: "test/started",
        source: "test",
        zipFile: testZip,
        fileName: "corrupted.zip",
    });

    stub(batch, "save", process.nextTick);

    batch.advance((err) => {
        t.error(err, "Error should be empty.");
        t.equal(batch.error, "ERROR_READING_ZIP");
        t.equal(batch.results.length, 0);
        t.equal(batch.state, "error");
        t.end();
    });
});

tap.test("ImageImport.advance", (t) => {
    const checkStates = (batches, states) => {
        t.equal(batches.length, states.length);
        for (const batch of batches) {
            t.equal(batch.state, states.shift());
        }
    };

    ImageImport.find({}, "", (err, batches) => {
        checkStates(batches,
            ["started", "process.started", "process.completed",
                "process.completed"]);

        ImageImport.advance((err) => {
            t.error(err, "Error should be empty.");

            ImageImport.find({}, "", (err, batches) => {
                checkStates(batches, ["process.completed", "process.started"]);

                ImageImport.advance((err) => {
                    t.error(err, "Error should be empty.");

                    ImageImport.find({}, "", (err, batches) => {
                        checkStates(batches, ["process.started"]);

                        // Force all batches to be completed
                        init.getBatches()[1].state = "completed";

                        ImageImport.advance((err) => {
                            t.error(err, "Error should be empty.");

                            ImageImport.find({}, "", (err, batches) => {
                                checkStates(batches, []);
                                t.end();
                            });
                        });
                    });
                });
            });
        });
    });
});
