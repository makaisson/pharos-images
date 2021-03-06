"use strict";

const React = require("react");

const FixedStringDisplay = React.createFactory(
    require("../../views/types/view/FixedString.jsx"));

const SimpleString = function(options) {
    this.options = options;
    /*
    name
    searchName
    title(i18n)
    placeholder(i18n)
    multiple: Bool
    recommended: Bool
    */
};

SimpleString.prototype = {
    searchName() {
        return this.options.searchName || this.options.name;
    },

    value(query) {
        return query[this.searchName()];
    },

    fields(value) {
        return {[this.searchName()]: value};
    },

    renderView(value) {
        return FixedStringDisplay({
            name: this.options.name,
            value,
        });
    },

    schema() {
        const type = {
            type: String,
            es_indexed: true,
            recommended: !!this.options.recommended,
        };

        return this.options.multiple ? [type] : type;
    },
};

module.exports = SimpleString;
