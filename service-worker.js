/* Manifest version: ixbwvb+C */
/* Standard Blazor PWA Caching Logic */
self.importScripts('./service-worker-assets.js');
self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
const offlineAssetsInclude = [ /\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/ ];
const offlineAssetsExclude = [ /^service-worker\.js$/ ];

async function onInstall(event) {
    console.info('Service worker: Install');
    const assetsRequests = self.assetsManifest.assets
        .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
        .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
        .map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));
    await caches.open(cacheName).then(cache => cache.addAll(assetsRequests));
}

async function onActivate(event) {
    console.info('Service worker: Activate');
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));
}

async function onFetch(event) {
    let cachedResponse = null;
    if (event.request.method === 'GET') {
        const shouldServeIndexHtml = event.request.mode === 'navigate';
        const request = shouldServeIndexHtml ? 'index.html' : event.request;
        const cache = await caches.open(cacheName);
        cachedResponse = await cache.match(request);
    }
    return cachedResponse || fetch(event.request);
}

/* Custom Logic */
new Map([["css","text/css"],["js","application/x-javascript"],["json","application/json"],["docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],["ico","image/x-icon"],["jpeg","image/jpeg"],["jpg","image/jpeg"],["png","image/png"],["svg","image/svg+xml"],["bmp","image/bmp"],["mp3","audio/mpeg"],["mpeg","video/mpeg"],["mpg","video/mpeg"],["wma","audio/x-ms-wma"],["wav","audio/wav"]]);let e=0,t=null;function s(){return e++,new Promise((e,s)=>{if(t)e(t);else{let o=indexedDB.open("AppDB",1);o.onerror=e=>{let t=function(e){let t="";if(e instanceof Event)if(e.target instanceof IDBOpenDBRequest){const t=e.target;t.error&&(e=t.error)}else e.message&&(t=e.message);else if(e instanceof Error){const s=e;t=s.name,t.endsWith(".")||(t+="."),s.message&&(t+=" "+s.message)}else if(e instanceof Response){const o=e;t=s(`Response: ok=${o.ok}; status=${o.status}; statusText=${o.statusText}; type=${o.type}; url=${o.url}.`)}else"string"==typeof e?t=e:(e&&e.name&&(t=s(e.name)),e&&e.status&&(t=s(`status=${e.status}`)),e&&e.statusText&&(t=s(`statusText=${e.statusText}`)));return t;function s(e){return t.length>0?t+=` | ${e}`:e}}(e);s(new Error("AppDB Error: "+t))},o.onblocked=e=>{s(new Error("AppDB Failure: The application database is blocked"))},o.onsuccess=s=>{let o=s.target;t=o.result,e(t)},o.onupgradeneeded=e=>{!function(e){let t=e.target.result;e.oldVersion<3&&(function(){const e=t.objectStoreNames;for(let s=0;s<e.length;s++)t.deleteObjectStore(e[s])}(),function(){t.createObjectStore("_system"),t.createObjectStore("shared"),t.createObjectStore("users"),t.createObjectStore("shelves"),t.createObjectStore("stuffs"),t.createObjectStore("results"),t.createObjectStore("suites"),t.createObjectStore("packs"),t.createObjectStore("packcont"),t.createObjectStore("packext");const e=t.createObjectStore("wincache");e.createIndex("user_idx","userId"),e.createIndex("pack_idx","packId"),t.createObjectStore("libs"),t.createObjectStore("libfiles")}())}(e)}}})}function o(){e--,e<1&&(e=0,t&&(t.close(),t=null))}async function n(e,t,n){try{let o=(await s()).transaction(e,"readwrite").objectStore(e);await(a=o.put(t,n),new Promise((e,t)=>{a.onsuccess=t=>{t.target instanceof IDBRequest?(a=t.target,e(a.result)):e(void 0)},a.onerror=e=>{t(e)}}))}finally{o()}var a}const a=self;function r(e){return e instanceof Error?e.message:"string"==typeof e?e:"Unknown error"}async function i(e){const t=await a.clients.matchAll();for(const s of t)s.postMessage(e)}class c extends Error{attempts;constructor(e){super(`Опрос был отменен после ${e} попыток`),this.attempts=e,this.name="PollingCancelledError"}}class l{_url;_options;_requestOptions;_attempts=0;_isCancelled=!1;constructor(e,t={},s){this._url=e,this._options={interval:5e3,...t},this._requestOptions={headers:{"Content-Type":"application/json",Accept:"application/json",...s.headers},...s}}async makeRequest(){console.log(`makeRequest: ${this._requestOptions.method} url=${this._url}`),console.log("Headers:",this._requestOptions.headers);const e=await fetch(this._url,this._requestOptions);if(!e.ok)throw new Error(`HTTP ${e.status}: ${e.statusText}`);return await e.json()??null}cancel(){this._isCancelled=!0,console.log("makeRequest: canceled")}delay(e){return new Promise(t=>setTimeout(t,e))}getAttemptCount(){return this._attempts}async poll(){for(;!this._isCancelled;){this._attempts++,this._options.onAttempt&&this._options.onAttempt(this._attempts),console.log(`poll: [${(new Date).toISOString()}] Attempt ${this._attempts}`);try{var e=await this.makeRequest();if(this._options.validateResponse&&(null===e||this._options.validateResponse(e)||(e=null)),null!==e)return console.log(`The data was successfully received on the attempt ${this._attempts}`),e}catch(e){const t=e instanceof Error?e:new Error(String(e));console.error(`Error on attempt ${this._attempts}:`,t.message),this._options.onError&&this._options.onError(t)}if(this._isCancelled)break;console.log(`I'm waiting ${this._options.interval/1e3} seconds until the next attempt...`),await this.delay(this._options.interval)}throw new c(this._attempts)}}a.addEventListener("message",async e=>{const t=e.data;console.log("[SW] Received message:",t),"START_POLLING"===t.type&&(await async function(e,t){const a=new l(e,{interval:7e3,validateResponse:e=>!e.email&&!e.cryptoKeyValue||!!e.email&&!!e.cryptoKeyValue},{method:"GET",mode:"cors",headers:{Authorization:t,Accept:"application/json","Content-Type":"application/json"}});console.log(`Начинаю бесконечный опрос сервера (url: ${e})`);try{const e=await a.poll();if("string"==typeof e.cryptoKeyValue){const s={anchor:e.email,apiKey:t,cryptoKey:e.cryptoKeyValue};await n("_system",s,"credential")}else await async function(e){try{(await s()).transaction(e,"readwrite").objectStore(e).delete("credential")}finally{o()}}("_system");i({type:"POLLING_UPDATE",payload:e})}catch(e){console.error("[SW] Polling error:",e),i({type:"POLLING_ERROR",message:r(e)})}}(t.url,t.apiKey),console.log("sw.addEventListener: doRegWaiting completed!"))});