import { fetchTextFile } from "./pipe.js";
//#region Variables
const _parser = new DOMParser();
class VisibilityObserver {
    _element;
    _key;
    _objDotNet;
    _strCallbackName; // DotNet-level callback function name
    _observer = null;
    _configObserver = { attributes: true, childList: false, subtree: false };
    _origDisplay;
    _origVisibility;
    constructor(element, key, objDotNet, strCallbackName) {
        this._element = element;
        this._key = key;
        //
        this._objDotNet = objDotNet;
        this._strCallbackName = strCallbackName;
        //
        const compStyles = window.getComputedStyle(element);
        this._origDisplay = compStyles.getPropertyValue("display");
        this._origVisibility = compStyles.getPropertyValue("visibility");
        //
        this._observer = new MutationObserver(this.callback);
        this._observer.observe(this._element, this._configObserver);
    }
    dispose() {
        if (this._observer) {
            this._observer.disconnect();
        }
        this._observer = null;
    }
    //
    //
    callback = (mutationList, observer) => {
        let info = null;
        //
        for (const mutation of mutationList) {
            //if (mutation.type === "attributes" && mutation.attributeName === "style") {
            if (mutation.type === "attributes") {
                const compStyles = window.getComputedStyle(this._element);
                const actualDisplay = compStyles.getPropertyValue("display");
                const actualVisibility = compStyles.getPropertyValue("visibility");
                //
                if (actualDisplay !== this._origDisplay || actualVisibility !== this._origVisibility) {
                    info = { isDisplay: (actualDisplay != "none"), visibility: actualVisibility };
                    this._origDisplay = actualDisplay;
                    this._origVisibility = actualVisibility;
                }
                break;
            }
        }
        //
        if (info) {
            this._objDotNet.invokeMethodAsync(this._strCallbackName, this._key, info);
        }
    };
} // class VisibilityObserver
var mapVisibilityObservers = new Map();
export function subVisibilityObserve(element, key, objDotNet, strCallbackName) {
    if (mapVisibilityObservers.has(key)) {
        // this shouldn't be happening!
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
    _strCallbackName; // DotNet-level callback function name
    constructor(element, key, bOutsideOnly, objDotNet, strCallbackName) {
        this._element = element;
        this._key = key;
        this._bOutsideOnly = bOutsideOnly;
        //
        this._objDotNet = objDotNet;
        this._strCallbackName = strCallbackName;
        //
        window.addEventListener("click", this.onClick, true);
    }
    dispose() {
        window.removeEventListener("click", this.onClick, true);
    }
    //
    //
    onClick = (ev) => {
        var bOutsideClick = (ev.target instanceof Node) ? !this._element.contains(ev.target) : true;
        if (this._bOutsideOnly && !bOutsideClick)
            return;
        //
        var info = {
            idTarget: (ev.target instanceof HTMLElement) ? ev.target.id : "",
            idCurrentTarget: (ev.currentTarget instanceof HTMLElement) ? ev.currentTarget.id : "",
            idRelatedTarget: (ev.relatedTarget instanceof HTMLElement) ? ev.relatedTarget.id : "",
            bOutside: bOutsideClick
        };
        //
        this._objDotNet.invokeMethodAsync(this._strCallbackName, this._key, info);
    };
} // class MouseCapture
var mapMouseCaptures = new Map();
export function subMouseCapture(element, key, bOutsideOnly, objDotNet, strCallbackName) {
    if (mapMouseCaptures.has(key)) {
        // this shouldn't be happening!
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
//#endregion (Mouse Capture)
// ***** Attribute *****
export function getAttribute(element, strAttributeName) {
    return (element.hasAttribute(strAttributeName)) ? element.getAttribute(strAttributeName) : null;
}
export function setAttribute(element, strAttributeName, strValue) {
    element.setAttribute(strAttributeName, strValue);
}
export function removeAttribute(element, strAttributeName) {
    element.removeAttribute(strAttributeName);
}
// ***** Property *****
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
    //
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
    //
    element[strPropertyPath] = objValue;
}
// ***** Class *****
export function addClass(element, strClass) {
    element.classList.add(strClass);
}
export function removeClass(element, strClass) {
    element.classList.remove(strClass);
}
export function hasClass(element, strClass) {
    return element.classList.contains(strClass);
}
// ***** CSS *****
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
// ***** Method call *****
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
// ***** Layout & Measurements *****
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
    //
    return aResult;
}
// ***** Position *****
/*
To get the width and height of a viewport, we can use the innerWidth and innerHeight properties of the window object.

Example:
const width = window.innerWidth;
const height = window.innerHeight;
console.log(`The viewport's width is ${width} and the height is ${height}.`);
*/
export function centerElementRelativeTarget(hteCentering, hteTarget, bHorizontal = true) {
    const rcCentering = hteCentering.getBoundingClientRect();
    const rcCenteringParent = hteCentering.offsetParent.getBoundingClientRect();
    const rcTarget = hteTarget.getBoundingClientRect();
    let nLeftNew = rcTarget.left + ((rcTarget.width - rcCentering.width) / 2);
    nLeftNew -= rcCenteringParent.left;
    hteCentering.style.left = (nLeftNew + "px");
}
/**
 *
 * @param side {string}: "top" | "right" | "bottom" | "left"
 * @param align {string}: "start" | "center" | "end"
 * @param indent {number}: the value of the indentation in pixels
 */
export function bindPositionTo(element, target, side = "bottom", align = "start", indent = 0, bWithinViewport = false) {
    const rcTarget = target.getBoundingClientRect();
    //
    const rcElement = element.getBoundingClientRect();
    const rcElementParent = element.offsetParent.getBoundingClientRect();
    //
    let nLeftNew = 0;
    let nTopNew = 0;
    let bAlignHorz = false;
    switch (side) {
        case "bottom": {
            bAlignHorz = true;
            nTopNew = (rcTarget.bottom - rcElementParent.y) + indent;
            //
            break;
        }
        // so far only "bottom"
    } // switch (side)
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
            //
            break;
        }
        // so far only "start"
    } // switch (align)
    element.style.top = nTopNew + "px";
    element.style.left = nLeftNew + "px";
}
//#region DOM tree
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
    //
    if (strId) {
        svg.setAttribute("id", strId);
    }
    if (strClass) {
        svg.classList.add(...strClass.split(" "));
    }
    //
    return svg;
}
export async function loadSvgBox(hteBox, pathSvg, strId, strClass) {
    const strSvgSource = await fetchTextFile(pathSvg);
    const svg = _parser.parseFromString(strSvgSource, "image/svg+xml").rootElement;
    //
    if (strId) {
        svg.setAttribute("id", strId);
    }
    if (strClass) {
        svg.classList.add(...strClass.split(" "));
    }
    //
    hteBox.appendChild(svg);
}
//#endregion (DOM tree)
//#region Dragable
// This code has not been tested yet!
//and _ensureView() is not implemented
var DragStatus;
(function (DragStatus) {
    DragStatus[DragStatus["No"] = 0] = "No";
    DragStatus[DragStatus["Mouse"] = 1] = "Mouse";
    DragStatus[DragStatus["Touch"] = 2] = "Touch";
})(DragStatus || (DragStatus = {}));
class Dragable {
    _hteDragable;
    _hteCaptureZone;
    _hteArea;
    _dragStatus = DragStatus.No;
    _ptLastDragPos = new DOMPoint();
    constructor(hteDragable, hteCaptureZone, hteArea) {
        this._hteDragable = hteDragable;
        this._hteCaptureZone = hteCaptureZone;
        this._hteArea = hteArea || hteDragable.offsetParent;
        //
        this._hteCaptureZone.addEventListener("mousedown", this._onCaptureZoneMouseDown);
        this._hteCaptureZone.addEventListener("touchstart", this._onCaptureZoneTouchStart);
    }
    get element() {
        return this._hteDragable;
    }
    get zone() {
        return this._hteCaptureZone;
    }
    get area() {
        return this._hteArea;
    }
    //
    //
    _ensureView() {
    }
    //
    //
    _onCaptureZoneMouseDown = (ev) => {
        if (ev.target && ev.target.closest("button")) {
            return;
        }
        //
        if (this._dragStatus === DragStatus.No) {
            ev.preventDefault();
            //
            this._dragStatus = DragStatus.Mouse;
            //
            document.addEventListener("mousemove", this._onMouseMove, { capture: true });
            document.addEventListener("mouseup", this._onMouseUp, { capture: true });
            // preventing the loss of messages from the iframe
            //PackagePool.disablePointerEventsAll();
            //
            this._startDrag(ev.clientX, ev.clientY);
        }
    };
    _onCaptureZoneTouchStart = (ev) => {
        if (this._dragStatus === DragStatus.No) {
            //
            this._dragStatus = DragStatus.Touch;
            //
            document.addEventListener("touchmove", this._onTouchMove, { capture: true });
            document.addEventListener("touchend", this._onTouchEnd, { capture: true });
            //
            this._startDrag(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    };
    //
    _onMouseMove = (ev) => {
        if (this._dragStatus === DragStatus.Mouse) {
            ev.preventDefault();
            this._drag(ev.clientX, ev.clientY);
        }
    };
    _onMouseUp = (ev) => {
        if (this._dragStatus === DragStatus.Mouse) {
            ev.preventDefault();
            //
            this._endDrag();
        }
    };
    _onTouchMove = (ev) => {
        if (this._dragStatus === DragStatus.Touch) {
            this._drag(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    };
    _onTouchEnd = (ev) => {
        if (this._dragStatus === DragStatus.Touch) {
            //
            this._endDrag();
        }
    };
    //
    //
    _startDrag(x, y) {
        this._ptLastDragPos.x = x;
        this._ptLastDragPos.y = y;
    }
    _drag(x, y) {
        let nNewX = this._ptLastDragPos.x - x;
        let nNewY = this._ptLastDragPos.y - y;
        //
        this._ptLastDragPos.x = x;
        this._ptLastDragPos.y = y;
        //
        this._hteDragable.style.top = (this._hteDragable.offsetTop - nNewY) + "px";
        this._hteDragable.style.left = (this._hteDragable.offsetLeft - nNewX) + "px";
    }
    _endDrag() {
        if (this._dragStatus !== DragStatus.No) {
            switch (this._dragStatus) {
                case DragStatus.Mouse: {
                    document.removeEventListener("mousemove", this._onMouseMove);
                    document.removeEventListener("mouseup", this._onMouseUp);
                    break;
                }
                case DragStatus.Touch: {
                    document.removeEventListener("touchmove", this._onTouchMove);
                    document.removeEventListener("touchend", this._onTouchEnd);
                    break;
                }
            }
            //
            // restoring event handling in this window
            //PackagePool.enablePointerEventsAll();
            //
            this._ensureView();
            //
            this._dragStatus = DragStatus.No;
        }
    }
} // class Dragable
const _aDragables = [];
function _findDragable(hteDragable) {
    return _aDragables.find(item => item.element === hteDragable);
}
function _findDragableIndex(hteDragable) {
    return _aDragables.findIndex(item => item.element === hteDragable);
}
export function regDragable(hteDragable, hteCaptureZone, hteArea = null) {
    const objExisting = _findDragable(hteDragable);
    if (!objExisting) {
        _aDragables.push(new Dragable(hteDragable, hteCaptureZone, hteArea));
    }
}
export function unregDragable(hteDragable) {
    const nIndex = _findDragableIndex(hteDragable);
    if (nIndex >= 0) {
        _aDragables.splice(nIndex, 1);
    }
}
export class ProgressControl {
    _strAssemblyName;
    _strMethodName;
    //
    _nPercentTotal = 0;
    _nSegment = 100; // percentage of 100 (total)
    _nStepMax = 100;
    _nStepCounter = 0;
    _nSegmentStepValue = 0;
    _nSegmentSeed = 0;
    _nSegmentRatio = 1;
    //
    constructor(strAssemblyName, strMethodName) {
        this._strAssemblyName = strAssemblyName;
        this._strMethodName = strMethodName;
    }
    setSegment(nSegment) {
        this._nSegment = nSegment;
        this._nStepMax = 1;
        this._nStepCounter = 0;
        this._nSegmentSeed = this._nPercentTotal;
        this._nSegmentRatio = nSegment / 100;
    }
    setStepMax(nStepMax) {
        this._nStepMax = nStepMax;
        this._nSegmentStepValue = 100 / nStepMax;
        this._nStepCounter = 0;
    }
    doStep() {
        if (this._nStepCounter < this._nStepMax) {
            this._nStepCounter++;
            let nSegmentPercent = Math.round((this._nStepCounter * this._nSegmentStepValue));
            if (nSegmentPercent > 100)
                nSegmentPercent = 100;
            this._nPercentTotal = this._nSegmentSeed + Math.round(nSegmentPercent * this._nSegmentRatio);
            if (this._nPercentTotal > 100)
                this._nPercentTotal = 100;
            window.requestAnimationFrame((timestamp) => {
                window.DotNet.invokeMethodAsync(this._strAssemblyName, this._strMethodName, this._nPercentTotal);
            });
        }
    }
    done() {
        this._nPercentTotal = 100;
        //
        window.requestAnimationFrame((timestamp) => {
            window.DotNet.invokeMethodAsync(this._strAssemblyName, this._strMethodName, this._nPercentTotal);
        });
    }
} // class ProgressControl
//#endregion (Utilities)
