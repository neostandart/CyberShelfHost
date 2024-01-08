//
export class HtmlStateKeeper {
    //#region Defs & Vars
    _mapTargets;
    _mapHeldElements;
    //#endregion (Defs & Vars)
    constructor() {
        this._mapTargets = new Map();
        this._mapHeldElements = new Map();
    }
    //#region Methods
    hold(strHeldToken, hteTarget) {
        this._mapHeldElements.set(strHeldToken, hteTarget);
    }
    unhold(strHeldToken) {
        this._mapHeldElements.delete(strHeldToken);
    }
    save(key, strHeldToken, strSelector, aProps) {
        let hteTarget = this._mapHeldElements.get(strHeldToken);
        if (!hteTarget) {
            throw new Error(`HtmlStateKeeper.save: The target element not found by HeldToken (${strHeldToken})!`);
        }
        //
        if (strSelector) {
            hteTarget = hteTarget.querySelector(strSelector);
        }
        if (!hteTarget) {
            throw new Error(`HtmlStateKeeper.save: The target element not found by selector (${strSelector})!`);
        }
        //
        let mapValues = this._mapTargets.get(key);
        if (!mapValues) {
            mapValues = new Map();
            this._mapTargets.set(key, mapValues);
        }
        //
        mapValues.clear();
        for (let i = 0; i < aProps.length; i++) {
            const strPropName = aProps[i];
            if (strPropName in hteTarget) {
                mapValues.set(strPropName, hteTarget[strPropName]);
            }
            else {
                throw new Error(`HtmlStateKeeper.save: The saved element does not contain the specified property (strPropName=${strPropName}).`);
            }
        }
    }
    restore(key, strHeldToken, strSelector) {
        let hteTarget = this._mapHeldElements.get(strHeldToken);
        if (!hteTarget) {
            throw new Error(`HtmlStateKeeper.restore: The target element not found by HeldToken (${strHeldToken})!`);
        }
        //
        if (strSelector) {
            hteTarget = hteTarget.querySelector(strSelector);
        }
        if (!hteTarget) {
            throw new Error(`HtmlStateKeeper.restore: The target element not found by selector (${strSelector})!`);
        }
        //
        let mapValues = this._mapTargets.get(key);
        if (mapValues) { // if mapValues is not defined (this is normal), then there has not been a save yet.
            mapValues.forEach((value, strPropName) => {
                if (strPropName in hteTarget) {
                    hteTarget[strPropName] = value;
                }
                else {
                    console.error(`HtmlStateKeeper.restore: A property named '${strPropName}' is missing in the target element!`);
                }
            });
        }
    }
    /*
        ???
    */
    reset() {
        this._mapTargets.clear();
    }
} // class HtmlStateKeeper
// ====================================================================
export function createKeeper() {
    const keeper = new HtmlStateKeeper();
    return keeper;
}
