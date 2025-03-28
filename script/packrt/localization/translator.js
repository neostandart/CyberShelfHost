import { Helper } from "../../helper.js";
export class SimpleTranslator {
    _translationStrings;
    constructor(translationStrings) {
        this._translationStrings = {};
        for (const namespace of Object.keys(translationStrings)) {
            this._translationStrings[namespace] = Helper.flatten(translationStrings[namespace]);
        }
    }
    t = (key) => {
        const matches = /^(.+):(.+)$/.exec(key);
        if (matches && matches.length > 0) {
            return this._translationStrings[matches[1]][matches[2]] ?? key;
        }
        return key;
    };
}
//# sourceMappingURL=translator.js.map