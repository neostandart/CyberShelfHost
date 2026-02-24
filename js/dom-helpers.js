/******/ // The require scope
/******/ var __webpack_require__ = {};
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
/*!********************************************!*\
  !*** ./Scripts/dom-helpers/dom-helpers.ts ***!
  \********************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   copyToClipboard: () => (/* binding */ copyToClipboard),
/* harmony export */   focusElement: () => (/* binding */ focusElement),
/* harmony export */   getCssVariable: () => (/* binding */ getCssVariable),
/* harmony export */   getElementBoundingRect: () => (/* binding */ getElementBoundingRect),
/* harmony export */   getLocalStorageItem: () => (/* binding */ getLocalStorageItem),
/* harmony export */   releasePointerCapture: () => (/* binding */ releasePointerCapture),
/* harmony export */   removeLocalStorageItem: () => (/* binding */ removeLocalStorageItem),
/* harmony export */   setCssVariable: () => (/* binding */ setCssVariable),
/* harmony export */   setLocalStorageItem: () => (/* binding */ setLocalStorageItem),
/* harmony export */   setPointerCapture: () => (/* binding */ setPointerCapture)
/* harmony export */ });
/**
 * dom-helpers.ts — Вспомогательные функции Web API для Blazor WebAssembly
 *
 * Этот модуль предоставляет сервисные функции, которые невозможно
 * или неудобно реализовать напрямую из C#/Blazor:
 *   - Pointer Capture API (захват/освобождение указателя)
 *   - Element geometry (getBoundingClientRect)
 *   - LocalStorage доступ
 *   - Динамическая модификация CSS Custom Properties (theming)
 *
 * Импортируется в C# как ES-модуль через IJSRuntime.
 */
// ── Pointer Capture ───────────────────────────────────────────────────
/**
 * Захватывает указатель (мышь/тач) на элементе.
 * Все последующие pointer-события будут направляться на этот элемент,
 * даже если указатель покинул его границы.
 *
 * @param elementId — HTML id элемента.
 * @param pointerId — идентификатор указателя из PointerEvent.pointerId.
 *
 * Сценарий использования: реализация drag-and-drop без потери
 * событий при быстром движении мыши за пределы элемента.
 */
function setPointerCapture(elementId, pointerId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.setPointerCapture(pointerId);
    }
    else {
        console.warn(`[DomHelpers] Element not found: #${elementId}`);
    }
}
/**
 * Освобождает ранее захваченный указатель.
 *
 * @param elementId — HTML id элемента.
 * @param pointerId — идентификатор указателя.
 */
function releasePointerCapture(elementId, pointerId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.releasePointerCapture(pointerId);
    }
    else {
        console.warn(`[DomHelpers] Element not found: #${elementId}`);
    }
}
/**
 * Возвращает размеры и позицию элемента относительно viewport.
 *
 * @param elementId — HTML id элемента.
 * @returns BoundingRect или null, если элемент не найден.
 */
function getElementBoundingRect(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`[DomHelpers] Element not found: #${elementId}`);
        return null;
    }
    const rect = element.getBoundingClientRect();
    // Возвращаем plain object (DOMRect не сериализуется напрямую в JSON)
    return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
    };
}
// ── LocalStorage ──────────────────────────────────────────────────────
/**
 * Сохраняет значение в LocalStorage.
 * Используется для персистентности пользовательских настроек.
 *
 * @param key — ключ.
 * @param value — значение (строка).
 */
function setLocalStorageItem(key, value) {
    try {
        localStorage.setItem(key, value);
    }
    catch (e) {
        // В приватном режиме или при переполнении квоты
        console.error(`[DomHelpers] Failed to write localStorage: ${key}`, e);
    }
}
/**
 * Читает значение из LocalStorage.
 *
 * @param key — ключ.
 * @returns значение или null, если ключ отсутствует.
 */
function getLocalStorageItem(key) {
    try {
        return localStorage.getItem(key);
    }
    catch (e) {
        console.error(`[DomHelpers] Failed to read localStorage: ${key}`, e);
        return null;
    }
}
/**
 * Удаляет значение из LocalStorage.
 *
 * @param key — ключ.
 */
function removeLocalStorageItem(key) {
    try {
        localStorage.removeItem(key);
    }
    catch (e) {
        console.error(`[DomHelpers] Failed to remove localStorage: ${key}`, e);
    }
}
// ── CSS Custom Properties (Theming) ───────────────────────────────────
/**
 * Устанавливает CSS Custom Property на элементе :root.
 * Это позволяет динамически менять тему приложения из C#.
 *
 * @param variableName — имя CSS-переменной (например, "--primary-color").
 * @param value — значение (например, "#6366f1").
 *
 * Принцип работы: все компоненты UI используют var(--primary-color)
 * в стилях. Изменение этой переменной мгновенно обновляет весь UI.
 */
function setCssVariable(variableName, value) {
    document.documentElement.style.setProperty(variableName, value);
}
/**
 * Читает текущее значение CSS Custom Property.
 *
 * @param variableName — имя CSS-переменной.
 * @returns текущее значение или пустая строка.
 */
function getCssVariable(variableName) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(variableName)
        .trim();
}
// ── Focus Management ──────────────────────────────────────────────────
/**
 * Программно устанавливает фокус на элемент.
 * Полезно для accessibility и управления фокусом после навигации.
 *
 * @param elementId — HTML id элемента.
 */
function focusElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.focus();
    }
}
// ── Clipboard ─────────────────────────────────────────────────────────
/**
 * Копирует текст в буфер обмена.
 * Использует современный Clipboard API с fallback.
 *
 * @param text — текст для копирования.
 * @returns true при успехе, false при ошибке.
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch {
        console.warn("[DomHelpers] Clipboard API failed.");
        return false;
    }
}

const __webpack_exports__copyToClipboard = __webpack_exports__.copyToClipboard;
const __webpack_exports__focusElement = __webpack_exports__.focusElement;
const __webpack_exports__getCssVariable = __webpack_exports__.getCssVariable;
const __webpack_exports__getElementBoundingRect = __webpack_exports__.getElementBoundingRect;
const __webpack_exports__getLocalStorageItem = __webpack_exports__.getLocalStorageItem;
const __webpack_exports__releasePointerCapture = __webpack_exports__.releasePointerCapture;
const __webpack_exports__removeLocalStorageItem = __webpack_exports__.removeLocalStorageItem;
const __webpack_exports__setCssVariable = __webpack_exports__.setCssVariable;
const __webpack_exports__setLocalStorageItem = __webpack_exports__.setLocalStorageItem;
const __webpack_exports__setPointerCapture = __webpack_exports__.setPointerCapture;
export { __webpack_exports__copyToClipboard as copyToClipboard, __webpack_exports__focusElement as focusElement, __webpack_exports__getCssVariable as getCssVariable, __webpack_exports__getElementBoundingRect as getElementBoundingRect, __webpack_exports__getLocalStorageItem as getLocalStorageItem, __webpack_exports__releasePointerCapture as releasePointerCapture, __webpack_exports__removeLocalStorageItem as removeLocalStorageItem, __webpack_exports__setCssVariable as setCssVariable, __webpack_exports__setLocalStorageItem as setLocalStorageItem, __webpack_exports__setPointerCapture as setPointerCapture };

//# sourceMappingURL=dom-helpers.js.map