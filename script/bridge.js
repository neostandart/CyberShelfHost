import { fetchTextFile } from "./pipe.js";
export { regDragable, unregDragable, regDragLocking, unregDragLocking } from "./utils/drag.js";
const _parser = new DOMParser();
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
export function getAttribute(element, strAttributeName) {
    return (element.hasAttribute(strAttributeName)) ? element.getAttribute(strAttributeName) : null;
}
export function setAttribute(element, strAttributeName, strValue) {
    element.setAttribute(strAttributeName, strValue);
}
export function removeAttribute(element, strAttributeName) {
    element.removeAttribute(strAttributeName);
}
export function getProperty(element, strPropertyName) {
    return element[strPropertyName];
}
export function setProperty(element, strPropName, objValue) {
    element[strPropName] = objValue;
}
export function getPropertyByPath(element, strPropertyPath) {
    const aPath = strPropertyPath.split(".");
    if (aPath.length > 1) {
        for (let i = 0; i < (aPath.length - 1); i++) {
            element = element[aPath[i]];
        }
        strPropertyPath = aPath[aPath.length - 1];
    }
    return element[strPropertyPath];
}
export function setPropertyByPath(element, strPropertyPath, objValue) {
    const aPath = strPropertyPath.split(".");
    if (aPath.length > 1) {
        for (let i = 0; i < (aPath.length - 1); i++) {
            element = element[aPath[i]];
        }
        strPropertyPath = aPath[aPath.length - 1];
    }
    element[strPropertyPath] = objValue;
}
export function addClass(element, strClass) {
    element.classList.add(strClass);
}
export function removeClass(element, strClass) {
    element.classList.remove(strClass);
}
export function hasClass(element, strClass) {
    return element.classList.contains(strClass);
}
export function getCssVariable(element, varname) {
    return element.style.getPropertyValue(varname);
}
export function setCssVariable(element, varname, value) {
    element.style.setProperty(varname, value);
}
export function getStyleProperty(element, propame) {
    return element.style[propame];
}
export function setStyleProperty(element, propname, value) {
    element.style[propname] = value;
}
export function callVoidMethod(element, strMethodName) {
    element[strMethodName]();
}
export function callVoidMethodBySelector(hteContainer, selector, strMethodName) {
    const hteTarget = hteContainer.querySelector(selector);
    if (hteTarget) {
        hteTarget[strMethodName]();
    }
}
export function callVoidMethodFromClosest(hteStart, selector, strMethodName) {
    const hteTarget = hteStart.closest(selector);
    if (hteTarget) {
        hteTarget[strMethodName]();
    }
}
export function callVoidMethodWithinScope(hteStart, selectorScopeRoot, selectorTarget, strMethodName) {
    const hteScopeRoot = hteStart.closest(selectorScopeRoot);
    if (hteScopeRoot) {
        const hteTarget = hteScopeRoot.querySelector(selectorTarget);
        if (hteTarget) {
            hteTarget[strMethodName]();
        }
    }
}
export function getBoundingClientRect(element) {
    return element.getBoundingClientRect();
}
export function queryBoundingClientRect(selector, scope = null) {
    var element = (scope) ? scope.querySelector(selector) : document.querySelector(selector);
    return (element) ? element.getBoundingClientRect() : new DOMRect();
}
export function fetchBoundingClientRects(targets, scope = null) {
    var aResult = [];
    targets.forEach((target) => {
        if (target instanceof HTMLElement) {
            aResult.push(target.getBoundingClientRect());
        }
        else {
            target = (scope) ? scope.querySelector(target) : document.querySelector(target);
            aResult.push(target.getBoundingClientRect());
        }
    });
    return aResult;
}
export function centerElementRelativeTarget(hteCentering, hteTarget, bHorizontal = true) {
    const rcCentering = hteCentering.getBoundingClientRect();
    const rcCenteringParent = hteCentering.offsetParent.getBoundingClientRect();
    const rcTarget = hteTarget.getBoundingClientRect();
    let nLeftNew = rcTarget.left + ((rcTarget.width - rcCentering.width) / 2);
    nLeftNew -= rcCenteringParent.left;
    hteCentering.style.left = (nLeftNew + "px");
}
export function bindPositionTo(element, target, side = "bottom", align = "start", indent = 0, bWithinViewport = false) {
    const rcTarget = target.getBoundingClientRect();
    const rcElement = element.getBoundingClientRect();
    const rcElementParent = element.offsetParent.getBoundingClientRect();
    let nLeftNew = 0;
    let nTopNew = 0;
    let bAlignHorz = false;
    switch (side) {
        case "bottom": {
            bAlignHorz = true;
            nTopNew = (rcTarget.bottom - rcElementParent.y) + indent;
            break;
        }
    }
    switch (align) {
        case "start": {
            if (bAlignHorz) {
                nLeftNew = (rcTarget.left - rcElementParent.x);
                if (bWithinViewport) {
                    const nDiff = (nLeftNew + rcElement.width) - window.innerWidth;
                    if (nDiff > 0) {
                        nLeftNew -= nDiff;
                    }
                }
            }
            else {
            }
            break;
        }
    }
    element.style.top = nTopNew + "px";
    element.style.left = nLeftNew + "px";
}
export function getGlobalObject(strObjectName) {
    return window[strObjectName];
}
export function appendChild(hteParent, hteChild) {
    hteParent.appendChild(hteChild);
}
export function removeChild(hteParent, hteChild) {
    hteParent.removeChild(hteChild);
}
export async function fetchSvgFromFile(path, strId, strClass) {
    const strSvgSource = await fetchTextFile(path);
    const svg = _parser.parseFromString(strSvgSource, "image/svg+xml").firstElementChild;
    if (strId) {
        svg.setAttribute("id", strId);
    }
    if (strClass) {
        svg.classList.add(...strClass.split(" "));
    }
    return svg;
}
export function writeToIFrame(refIFrame, strContent) {
    if (refIFrame instanceof HTMLIFrameElement) {
        const iframeDoc = refIFrame.contentWindow.document;
        if (iframeDoc.documentElement)
            iframeDoc.documentElement.remove();
        iframeDoc.write(strContent);
        iframeDoc.close();
    }
}
export function clickElement(refElement, path) {
    if (refElement instanceof HTMLElement) {
        let hte = refElement;
        if (path) {
            hte = hte.querySelector(path) || hte;
        }
        hte.click();
    }
}
//# sourceMappingURL=bridge.js.map