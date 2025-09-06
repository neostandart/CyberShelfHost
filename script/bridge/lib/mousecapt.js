class MouseCapture {
    _element;
    _key;
    _objDotNet;
    _strCallbackName;
    _strClosestTest;
    constructor(element, key, objDotNet, strCallbackName, strClosestTest) {
        this._element = element;
        this._key = key;
        this._objDotNet = objDotNet;
        this._strCallbackName = strCallbackName;
        this._strClosestTest = strClosestTest;
        window.addEventListener("click", this.onClick, true);
    }
    dispose() {
        window.removeEventListener("click", this.onClick, true);
    }
    onClick = (ev) => {
        if (this._strClosestTest && ev.target instanceof HTMLElement && (ev.target).closest(this._strClosestTest))
            return;
        if (ev.target instanceof Node && this._element.contains(ev.target))
            return;
        this._objDotNet.invokeMethodAsync(this._strCallbackName, this._key);
    };
}
var mapMouseCaptures = new Map();
export function subOutsideCapture(element, key, objDotNet, strCallbackName, strClosestTest = undefined) {
    if (mapMouseCaptures.has(key)) {
        throw new Error("The HTMLElement with key \"${key}\" has already captured the mouse!");
    }
    else {
        var observer = new MouseCapture(element, key, objDotNet, strCallbackName, strClosestTest);
        mapMouseCaptures.set(key, observer);
    }
}
export function unsubOutsideCapture(key) {
    if (mapMouseCaptures.has(key)) {
        var observer = mapMouseCaptures.get(key);
        observer.dispose();
        mapMouseCaptures.delete(key);
    }
}
//# sourceMappingURL=mousecapt.js.map