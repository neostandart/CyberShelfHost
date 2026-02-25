/* Manifest version: 2iJ+m5M/ */
/******/ // The require scope
/******/ var __webpack_require__ = {};
/******/ 
/************************************************************************/
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
/*!************************************************************!*\
  !*** ./Scripts/service-worker/service-worker.published.ts ***!
  \************************************************************/
__webpack_require__.r(__webpack_exports__);
/**
 * service-worker.published.ts — Кастомный Service Worker для опубликованного Blazor PWA
 *
 * Содержит в себе:
 *  1. Кастомную логику рассылки (broadcast) и защиты от повторных запросов.
 *  2. Стандартную логику Blazor PWA для оффлайн-кэширования ассетов.
 */
const sw = self;
// Импорт манифеста, который генерируется при публикации
sw.importScripts('./service-worker-assets.js');
// ── Настройки кэширования Blazor PWA ──────────────────────────────────
const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${sw.assetsManifest.version}`;
const offlineAssetsInclude = [/\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/];
const offlineAssetsExclude = [/^service-worker\.js$/, /^service-worker\.published\.js$/];
const base = "/";
//const base = "/CyberShelfHost/";
const baseUrl = new URL(base, sw.origin);
const manifestUrlList = sw.assetsManifest.assets.map(asset => new URL(asset.url, baseUrl).href);
let isBusy = false;
// ── Lifecycle: install ────────────────────────────────────────────────
sw.addEventListener('install', (event) => {
    console.info('[SW] Installing published version...');
    event.waitUntil((async () => {
        // Кэширование ассетов (из Blazor PWA)
        const assetsRequests = sw.assetsManifest.assets
            .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
            .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
            .map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));
        const cache = await caches.open(cacheName);
        await cache.addAll(assetsRequests);
        // Пропускаем ожидание
        await sw.skipWaiting();
    })());
});
// ── Lifecycle: activate ───────────────────────────────────────────────
sw.addEventListener('activate', (event) => {
    console.info('[SW] Activated published version. Claiming clients...');
    event.waitUntil((async () => {
        // Удаление старых кэшей (из Blazor PWA)
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys
            .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
            .map(key => caches.delete(key)));
        // Перехват клиентов
        await sw.clients.claim();
    })());
});
// ── Message handler ───────────────────────────────────────────────────
sw.addEventListener("message", (event) => {
    const data = event.data;
    if (data.type === "FETCH_DATA") {
        if (isBusy) {
            console.warn("[SW] Busy — rejecting FETCH_DATA request.");
            broadcastMessage({ type: "FETCH_REJECTED" });
            return;
        }
        const promise = fetchDataFromServer(data.url);
        if (event.waitUntil) {
            event.waitUntil(promise);
        }
    }
});
// ── Fetch logic (Custom) ──────────────────────────────────────────────
async function fetchDataFromServer(url) {
    isBusy = true;
    console.log(`[SW] Fetching data from: ${url}`);
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Accept": "application/json" },
            cache: "no-cache",
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const payload = await response.json();
        await broadcastMessage({ type: "DATA_RECEIVED", payload });
        console.log("[SW] Data fetched and broadcasted successfully.");
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[SW] Fetch error:", message);
        await broadcastMessage({ type: "FETCH_ERROR", error: message });
    }
    finally {
        isBusy = false;
    }
}
// ── Broadcast helper ──────────────────────────────────────────────────
async function broadcastMessage(message) {
    const allClients = await sw.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
    });
    for (const client of allClients) {
        client.postMessage(message);
    }
}
// ── Fetch event (Blazor PWA Offline Support) ──────────────────────────
sw.addEventListener('fetch', (event) => {
    event.respondWith((async () => {
        let cachedResponse = null;
        if (event.request.method === 'GET') {
            // Если запрос к API (FETCH_DATA или обычный) - не обслуживаем index.html
            // Мы применяем логику обслуживания index.html только к навигационным запросам браузера
            const shouldServeIndexHtml = event.request.mode === 'navigate'
                && !manifestUrlList.some(url => url === event.request.url);
            const request = shouldServeIndexHtml ? 'index.html' : event.request;
            const cache = await caches.open(cacheName);
            cachedResponse = await cache.match(request);
        }
        return cachedResponse || fetch(event.request);
    })());
});



//# sourceMappingURL=service-worker.published.js.map