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
/*!**************************************!*\
  !*** ./Scripts/sw-agent/sw-agent.ts ***!
  \**************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   dispose: () => (/* binding */ dispose),
/* harmony export */   initSwAgent: () => (/* binding */ initSwAgent),
/* harmony export */   requestDataFromServer: () => (/* binding */ requestDataFromServer)
/* harmony export */ });
/**
 * sw-agent.ts — Модуль-посредник между C# (Blazor) и Service Worker
 *
 * Этот модуль экспортируется как ES-модуль и импортируется в C# через
 * IJSRuntime.InvokeAsync<IJSObjectReference>("import", "./js/sw-agent.js").
 *
 * Архитектура взаимодействия:
 *   C# (SwAgentInterop) → sw-agent.ts → Service Worker → sw-agent.ts → C#
 *
 * Модуль хранит ссылку на .NET DotNetObjectReference для обратных вызовов
 * (callback) при получении данных от Service Worker.
 */
// ── Состояние модуля ──────────────────────────────────────────────────
// Ссылка на .NET-объект; устанавливается при инициализации.
let dotNetRef = null;
// ── Инициализация ─────────────────────────────────────────────────────
/**
 * Инициализирует модуль-посредник.
 * Вызывается из C# при старте приложения.
 *
 * @param ref — DotNetObjectReference для обратных вызовов в C#.
 *
 * ВАЖНО: Подписка на navigator.serviceWorker.onmessage устанавливается
 * один раз. Повторный вызов initSwAgent обновляет dotNetRef,
 * но не создаёт дублирующую подписку.
 */
function initSwAgent(ref) {
    dotNetRef = ref;
    // Подписываемся на сообщения от Service Worker.
    // Используем addEventListener вместо onmessage для возможности
    // добавления нескольких слушателей в будущем.
    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener("message", handleSwMessage);
        console.log("[SwAgent] Initialized. Listening for SW messages.");
    }
    else {
        console.warn("[SwAgent] Service Worker API not available.");
    }
}
// ── Запрос данных ─────────────────────────────────────────────────────
/**
 * Отправляет команду Service Worker на выполнение HTTP-запроса.
 * Вызывается из C# (SwAgentInterop.RequestDataAsync).
 *
 * @param url — URL для GET-запроса к серверу.
 *
 * ВАЖНО: Если SW ещё не зарегистрирован или не активен,
 * функция выбрасывает ошибку. C# код должен обработать исключение.
 */
async function requestDataFromServer(url) {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration?.active) {
        throw new Error("[SwAgent] No active Service Worker found.");
    }
    // Отправляем команду FETCH_DATA в Service Worker
    registration.active.postMessage({
        type: "FETCH_DATA",
        url,
    });
    console.log(`[SwAgent] Sent FETCH_DATA command. URL: ${url}`);
}
// ── Обработчик сообщений от SW ────────────────────────────────────────
/**
 * Обрабатывает входящие сообщения от Service Worker и перенаправляет
 * их в C# через DotNetObjectReference.
 *
 * Маппинг сообщений на C# методы:
 *   DATA_RECEIVED  → OnDataReceived(json)
 *   FETCH_REJECTED → OnFetchRejected()
 *   FETCH_ERROR    → OnFetchError(message)
 */
function handleSwMessage(event) {
    const { type, payload, error } = event.data;
    if (!dotNetRef) {
        console.warn("[SwAgent] No .NET reference — cannot forward SW message.");
        return;
    }
    switch (type) {
        case "DATA_RECEIVED":
            // Сериализуем payload в JSON-строку для передачи в C#.
            // C# десериализует строку обратно в типизированный объект.
            dotNetRef.invokeMethodAsync("OnDataReceived", JSON.stringify(payload));
            break;
        case "FETCH_REJECTED":
            dotNetRef.invokeMethodAsync("OnFetchRejected");
            break;
        case "FETCH_ERROR":
            dotNetRef.invokeMethodAsync("OnFetchError", error ?? "Unknown error");
            break;
        default:
            console.warn(`[SwAgent] Unknown SW message type: ${type}`);
    }
}
// ── Очистка ───────────────────────────────────────────────────────────
/**
 * Освобождает ресурсы модуля.
 * Вызывается из C# при DisposeAsync() SwAgentInterop.
 */
function dispose() {
    if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    }
    dotNetRef = null;
    console.log("[SwAgent] Disposed.");
}

const __webpack_exports__dispose = __webpack_exports__.dispose;
const __webpack_exports__initSwAgent = __webpack_exports__.initSwAgent;
const __webpack_exports__requestDataFromServer = __webpack_exports__.requestDataFromServer;
export { __webpack_exports__dispose as dispose, __webpack_exports__initSwAgent as initSwAgent, __webpack_exports__requestDataFromServer as requestDataFromServer };

//# sourceMappingURL=sw-agent.js.map