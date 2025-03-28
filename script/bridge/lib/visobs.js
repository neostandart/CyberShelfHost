class VisibilityObserver {
    _element;
    _key;
    _objDotNet;
    _strCallbackName;
    _observer = null;
    _configObserver = { attributes: true, childList: false, subtree: false };
    _origDisplay;
    _origVisibility;
    constructor(element, key, objDotNet, strCallbackName) {
        this._element = element;
        this._key = key;
        this._objDotNet = objDotNet;
        this._strCallbackName = strCallbackName;
        const compStyles = window.getComputedStyle(element);
        this._origDisplay = compStyles.getPropertyValue("display");
        this._origVisibility = compStyles.getPropertyValue("visibility");
        this._observer = new MutationObserver(this.callback);
        this._observer.observe(this._element, this._configObserver);
    }
    dispose() {
        if (this._observer) {
            this._observer.disconnect();
        }
        this._observer = null;
    }
    callback = (mutationList, observer) => {
        let info = null;
        for (const mutation of mutationList) {
            if (mutation.type === "attributes") {
                const compStyles = window.getComputedStyle(this._element);
                const actualDisplay = compStyles.getPropertyValue("display");
                const actualVisibility = compStyles.getPropertyValue("visibility");
                if (actualDisplay !== this._origDisplay || actualVisibility !== this._origVisibility) {
                    info = { isDisplay: (actualDisplay != "none"), visibility: actualVisibility };
                    this._origDisplay = actualDisplay;
                    this._origVisibility = actualVisibility;
                }
                break;
            }
        }
        if (info) {
            this._objDotNet.invokeMethodAsync(this._strCallbackName, this._key, info);
        }
    };
}
var mapVisibilityObservers = new Map();
export function subVisibilityObserve(element, key, objDotNet, strCallbackName) {
    if (mapVisibilityObservers.has(key)) {
        throw new Error("The HTMLElement with key \"${key}\" is already being observed!");
    }
    else {
        var observer = new VisibilityObserver(element, key, objDotNet, strCallbackName);
        mapVisibilityObservers.set(key, observer);
    }
}
export function unsubVisibilityObserve(key) {
    if (mapVisibilityObservers.has(key)) {
        var observer = mapVisibilityObservers.get(key);
        observer.dispose();
        mapVisibilityObservers.delete(key);
    }
}
//# sourceMappingURL=visobs.js.map