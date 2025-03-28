import { Helper } from "./helper.js";
let _name = undefined;
let _ver = undefined;
let _nRequestCounter = 0;
let _adb = null;
function _onUpgradeAppDB(ev) {
    let request = ev.target;
    let adb = request.result;
    if (ev.oldVersion < 3) {
        __clearDB();
        __createDB();
    }
    else {
    }
    function __createDB() {
        adb.createObjectStore("_system");
        adb.createObjectStore("shared");
        adb.createObjectStore("users");
        adb.createObjectStore("shelves");
        adb.createObjectStore("stuffs");
        adb.createObjectStore("results");
        adb.createObjectStore("suites");
        adb.createObjectStore("packs");
        adb.createObjectStore("packcont");
        adb.createObjectStore("packext");
        const storeWincache = adb.createObjectStore("wincache");
        storeWincache.createIndex("user_idx", "userid");
        storeWincache.createIndex("pack_idx", "packid");
        adb.createObjectStore("libs");
        adb.createObjectStore("libfiles");
    }
    function __clearDB() {
        const listStoreNames = adb.objectStoreNames;
        for (let i = 0; i < listStoreNames.length; i++) {
            adb.deleteObjectStore(listStoreNames[i]);
        }
    }
}
function _processStoreRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = (ev) => {
            if (ev.target instanceof IDBRequest) {
                request = ev.target;
                resolve(request.result);
            }
            else {
                resolve(undefined);
            }
        };
        request.onerror = (ev) => {
            reject(ev);
        };
    });
}
export function useDB() {
    _nRequestCounter++;
    return new Promise((resolve, reject) => {
        if (_adb) {
            resolve(_adb);
        }
        else {
            let request = indexedDB.open(_name, _ver);
            request.onerror = (ev) => {
                let msgError = Helper.extractMessage(ev);
                reject(new Error("AppDB Error: " + msgError));
            };
            request.onblocked = (ev) => {
                let msg = "The application database is blocked";
                reject(new Error("AppDB Failure: " + msg));
            };
            request.onsuccess = (ev) => {
                let request = ev.target;
                _adb = request.result;
                resolve(_adb);
            };
            request.onupgradeneeded = (ev) => {
                _onUpgradeAppDB(ev);
            };
        }
    });
}
export function releaseDB() {
    _nRequestCounter--;
    if (_nRequestCounter < 1) {
        _nRequestCounter = 0;
        if (_adb) {
            _adb.close();
            _adb = null;
        }
        else {
        }
    }
}
export async function get(storename, key) {
    let record;
    try {
        let adb = await useDB();
        let transaction = adb.transaction(storename, "readonly");
        let store = transaction.objectStore(storename);
        record = await _processStoreRequest(store.get(key));
    }
    finally {
        releaseDB();
        return record;
    }
}
export async function getFrom(db, storename, key) {
    let transaction = db.transaction(storename, "readonly");
    let store = transaction.objectStore(storename);
    let record = await _processStoreRequest(store.get(key));
    return record;
}
export async function getByKeys(storename, keys) {
    return new Promise(async (resolve, reject) => {
        const aResult = [];
        let adb = await useDB();
        let transaction = adb.transaction(storename);
        let store = transaction.objectStore(storename);
        let request = store.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (keys.findIndex(value => cursor.key == value) >= 0) {
                    aResult.push(cursor.value);
                }
                cursor.continue();
            }
            else {
                releaseDB();
                resolve(aResult);
            }
        };
        request.onerror = (ev) => {
            releaseDB();
            reject(Helper.extractMessage(ev));
        };
    });
}
export async function getAll(storename) {
    let result;
    try {
        let adb = await useDB();
        let transaction = adb.transaction(storename, "readonly");
        let store = transaction.objectStore(storename);
        result = await _processStoreRequest(store.getAll());
    }
    finally {
        releaseDB();
        return result || [];
    }
}
export async function getAllFrom(db, storename) {
    let result;
    try {
        let transaction = db.transaction(storename, "readonly");
        let store = transaction.objectStore(storename);
        result = await _processStoreRequest(store.getAll());
    }
    finally {
        return result || [];
    }
}
export function getKeysByIndex(storename, indexname, value) {
    return new Promise(async (resolve, reject) => {
        const adb = await useDB();
        const transaction = adb.transaction(storename);
        const wincache = transaction.objectStore(storename);
        const index = wincache.index(indexname);
        const aKeys = [];
        const request = index.openKeyCursor(IDBKeyRange.only(value));
        request.onsuccess = function () {
            var cursor = request.result;
            if (cursor) {
                aKeys.push(cursor.primaryKey);
                cursor.continue();
            }
            else {
                releaseDB();
                resolve(aKeys);
            }
        };
        request.onerror = function (ev) {
            releaseDB();
            reject(ev);
        };
    });
}
export async function put(storename, value, key) {
    try {
        let adb = await useDB();
        let transaction = adb.transaction(storename, "readwrite");
        let store = transaction.objectStore(storename);
        await _processStoreRequest(store.put(value, key));
    }
    finally {
        releaseDB();
    }
}
export async function delObject(storename, key) {
    try {
        let adb = await useDB();
        let transaction = adb.transaction(storename, "readwrite");
        let store = transaction.objectStore(storename);
        let request = store.delete(key);
    }
    finally {
        releaseDB();
    }
}
export async function delUser(userid) {
    return new Promise(async (resolve, reject) => {
        try {
            const aCachedDataKeys = await getKeysByIndex("wincache", "user_idx", userid);
            const database = await useDB();
            const transaction = database.transaction(["users", "shelves", "stuffs", "wincache"], "readwrite");
            const storeUsers = transaction.objectStore("users");
            const storeShelves = transaction.objectStore("shelves");
            const storeStuffs = transaction.objectStore("stuffs");
            const storeWincache = transaction.objectStore("wincache");
            const recUser = await _processStoreRequest(storeUsers.get(userid));
            if (recUser) {
                const deletedUser = recUser;
                storeUsers.delete(userid);
                storeShelves.delete(userid);
                storeStuffs.delete(userid);
                for (const strCachedKey of aCachedDataKeys) {
                    storeWincache.delete(strCachedKey);
                }
                transaction.oncomplete = () => {
                    resolve(deletedUser);
                };
                transaction.onabort = (ev) => {
                    reject(Helper.extractMessage(ev));
                };
                transaction.onerror = (ev) => {
                    reject(Helper.extractMessage(ev));
                };
            }
            else {
                reject("The user being deleted has not been found!");
            }
        }
        catch (err) {
            reject(Helper.extractMessage(err));
        }
        finally {
            releaseDB();
        }
    });
}
export async function getWinCache(userid, packid) {
    const key = userid + "_" + packid;
    const rec = await get("wincache", key);
    return rec ? rec.data : null;
}
export async function setWinCache(userid, packid, data) {
    const key = userid + "_" + packid;
    await put("wincache", { userid: userid, packid: packid, data: data }, key);
}
export function initializeAsync(name, ver) {
    return new Promise((resolve) => {
        _name = name;
        _ver = ver;
        resolve();
    });
}
//# sourceMappingURL=appdb.js.map