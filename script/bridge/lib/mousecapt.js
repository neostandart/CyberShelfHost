class MouseCapture {
    _element;
    _key;
    _bOutsideOnly;
    _objDotNet;
    _strCallbackName;
    constructor(element, key, bOutsideOnly, objDotNet, strCallbackName) {
        this._element = element;
        this._key = key;
        this._bOutsideOnly = bOutsideOnly;
        this._objDotNet = objDotNet;
        this._strCallbackName = strCallbackName;
        window.addEventListener("click", this.onClick, true);
    }
    dispose() {
        window.removeEventListener("click", this.onClick, true);
    }
    onClick = (ev) => {
        var bOutsideClick = (ev.target instanceof Node) ? !this._element.contains(ev.target) : true;
        if (this._bOutsideOnly && !bOutsideClick)
            return;
        var info = {
            idTarget: (ev.target instanceof HTMLElement) ? ev.target.id : "",
            idCurrentTarget: (ev.currentTarget instanceof HTMLElement) ? ev.currentTarget.id : "",
            idRelatedTarget: (ev.relatedTarget instanceof HTMLElement) ? ev.relatedTarget.id : "",
            bOutside: bOutsideClick
        };
        this._objDotNet.invokeMethodAsync(this._strCallbackName, this._key, info);
    };
}
var mapMouseCaptures = new Map();
export function subMouseCapture(element, key, bOutsideOnly, objDotNet, strCallbackName) {
    if (mapMouseCaptures.has(key)) {
        throw new Error("The HTMLElement with key \"${key}\" has already captured the mouse!");
    }
    else {
        var observer = new MouseCapture(element, key, bOutsideOnly, objDotNet, strCallbackName);
        mapMouseCaptures.set(key, observer);
    }
}
export function unsubMouseCapture(key) {
    if (mapMouseCaptures.has(key)) {
        var observer = mapMouseCaptures.get(key);
        observer.dispose();
        mapMouseCaptures.delete(key);
    }
}
//# sourceMappingURL=mousecapt.js.map