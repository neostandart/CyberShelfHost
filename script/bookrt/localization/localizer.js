export class Localizer {
    t;
    constructor(t) {
        this.t = t;
    }
    localizableFields = [
        'label',
        'placeholder',
        'description'
    ];
    localize(semantics, language, localizeAllFields) {
        return this.walkSemanticsRecursive(semantics, language, localizeAllFields);
    }
    walkSemanticsRecursive(semantics, language, localizeAllFields) {
        let copy = Array.isArray(semantics) ? [] : {};
        if (Object.keys(semantics).length === 0) {
            copy = semantics;
        }
        else {
            for (const field in semantics) {
                if (typeof semantics[field] === 'object' &&
                    typeof semantics[field] !== 'string') {
                    copy[field] = this.walkSemanticsRecursive(semantics[field], language, localizeAllFields);
                }
                else if ((this.localizableFields.includes(field) &&
                    typeof semantics[field] === 'string') ||
                    localizeAllFields) {
                    const translated = this.t(semantics[field], language);
                    copy[field] = translated;
                }
                else {
                    copy[field] = semantics[field];
                }
            }
        }
        return copy;
    }
}
//# sourceMappingURL=localizer.js.map