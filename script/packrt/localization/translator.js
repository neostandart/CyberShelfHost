import { Helper } from "../../helper.js";
export class SimpleTranslator {
    _translationStrings;
    //
    /**
     * @param translationStrings an object containing all relevant translation strings
     * sorted by namespaces
     */
    constructor(translationStrings) {
        this._translationStrings = {};
        for (const namespace of Object.keys(translationStrings)) {
            this._translationStrings[namespace] = Helper.flatten(translationStrings[namespace]);
        }
    }
    /**
     * Translates a string using the key (identified).
     * @params key the key with optional namespace separated by a colon (e.g.
     * namespace:key)
     * @returns the translated string
     * @memberof SimpleTranslator
     */
    t = (key) => {
        const matches = /^(.+):(.+)$/.exec(key);
        if (matches && matches.length > 0) {
            return this._translationStrings[matches[1]][matches[2]] ?? key;
        }
        return key;
    };
} // class SimpleTranslator
//# sourceMappingURL=translator.js.map