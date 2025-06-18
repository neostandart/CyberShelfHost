import { fetchTextFile } from "../_shared/pipe.js";
export { regDragable, unregDragable, regDragLocking, unregDragLocking } from "./lib/drag.js";
export { subVisibilityObserve, unsubVisibilityObserve } from "./lib/visobs.js";
export { subMouseCapture, unsubMouseCapture } from "./lib/mousecapt.js";
const _parser = new DOMParser();
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
export async function calcRelativeWidth(hteContainer, hteTarget, options) {
    let result = 0;
    if (hteContainer && hteTarget) {
        const nContainerWidth = hteContainer?.clientWidth || 0;
        if (nContainerWidth > 0) {
            if (Number.isInteger(options.min) && nContainerWidth <= options.min) {
                result = nContainerWidth;
            }
            else {
                const nTargetWish = Number(options.wish);
                result = Number.isInteger(nTargetWish) ? (Math.round((nContainerWidth / 100) * nTargetWish)) : nContainerWidth;
                if (Number.isInteger(options.max) && result > options.max)
                    result = options.max;
            }
        }
    }
    return result;
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
const _aEventNotifyListeners = [];
export function subEventNotify(eventSource, query, eventName, listener, callbackName) {
    let emitter = (query) ? eventSource?.querySelector(query) : eventSource;
    if (emitter && listener) {
        const item = {
            target: emitter,
            eventName: eventName,
            listener: listener,
            handler: (ev) => {
                listener.invokeMethodAsync(callbackName);
            }
        };
        item.target.addEventListener(eventName, item.handler);
        _aEventNotifyListeners.push(item);
    }
}
export function unsubEventNotify(eventSource, query, eventName, listener) {
    let emitter = (query) ? eventSource?.querySelector(query) : eventSource;
    if (emitter && listener) {
        const iIndex = _aEventNotifyListeners.findIndex(item => item.target === emitter &&
            item.eventName === eventName &&
            item.listener._id === listener._id);
        if (iIndex >= 0) {
            const theItem = _aEventNotifyListeners[iIndex];
            theItem.target.removeEventListener(theItem.eventName, theItem.handler);
            _aEventNotifyListeners.splice(iIndex, 1);
        }
    }
}
const _aTransitionEndListeners = [];
export function subTransitionEnd(eventSource, query, propertyName, listener, callbackName) {
    let emitter = (query) ? eventSource?.querySelector(query) : eventSource;
    if (emitter && listener) {
        const item = {
            emitter: emitter,
            propertyName: propertyName,
            listener: listener,
            handler: function (ev) {
                if (ev.propertyName == this.propertyName)
                    listener.invokeMethodAsync(callbackName);
            }
        };
        item.emitter.addEventListener("transitionend", item.handler.bind(item));
        _aTransitionEndListeners.push(item);
    }
}
export function unsubTransitionEnd(eventSource, query, listener) {
    let emitter = (query) ? eventSource?.querySelector(query) : eventSource;
    if (emitter && listener) {
        const iIndex = _aTransitionEndListeners.findIndex(item => item.emitter === emitter && item.listener._id === listener._id);
        if (iIndex >= 0) {
            const theItem = _aTransitionEndListeners[iIndex];
            theItem.emitter.removeEventListener("transitionend", theItem.handler);
            _aTransitionEndListeners.splice(iIndex, 1);
        }
    }
}
function hasProtocol(path) {
    return path ? path.match(/^[a-z0-9]+:\/\//i) !== null : false;
}
;
export function fillFrameDoc(refIFrame, strContent) {
    return new Promise((resolve) => {
        if (refIFrame instanceof HTMLIFrameElement) {
            refIFrame.srcdoc = strContent;
        }
        setTimeout(() => {
            resolve();
        }, 0);
    });
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
//# sourceMappingURL=utils.js.map