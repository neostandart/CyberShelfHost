import { Helper } from "./helper.js";
//
export class AppDB {
    //#region Values
    static _name;
    static _ver;
    //
    static _nRequestCounter = 0;
    static _adb = null;
    //#endregion (Values)
    static async initializeAsync(name, ver) {
        this._name = name;
        this._ver = ver;
    }
    //#region Common Public Members
    static async useDB() {
        return this._useDB();
    }
    static releaseDB() {
        this._releaseDB();
    }
    static async put(storename, value, key) {
        try {
            let adb = await this._useDB();
            let transaction = adb.transaction(storename, "readwrite");
            let store = transaction.objectStore(storename);
            //
            await this._processStoreRequest(store.put(value, key));
        }
        finally {
            this._releaseDB();
        }
    }
    static async get(storename, key) {
        let record;
        try {
            let adb = await this._useDB();
            let transaction = adb.transaction(storename, "readonly");
            let store = transaction.objectStore(storename);
            //
            record = await this._processStoreRequest(store.get(key));
        }
        finally {
            this._releaseDB();
            return record;
        }
    }
    // it is not fully debugged !!!
    static async getByKeys(storename, keys) {
        return new Promise(async (resolve, reject) => {
            try {
                const aResult = [];
                let adb = await this._useDB();
                let transaction = adb.transaction(storename);
                let store = transaction.objectStore(storename);
                let request = store.openCursor();
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        //
                        if (keys.findIndex(value => cursor.key == value) >= 0) {
                            aResult.push(cursor.value);
                        }
                        //
                        cursor.continue();
                    }
                    else {
                        resolve(aResult);
                    }
                };
                request.onerror = (event) => {
                    throw new Error(request.error.message || "error of the cursor"); // ???
                };
            }
            catch (err) {
                reject(err);
            }
            finally {
                AppDB.releaseDB();
            }
        });
    }
    static async getAll(storename) {
        let result;
        try {
            let adb = await this._useDB();
            let transaction = adb.transaction(storename, "readonly");
            let store = transaction.objectStore(storename);
            //
            result = await this._processStoreRequest(store.getAll());
        }
        finally {
            this._releaseDB();
            return result || [];
        }
    }
    static async getKeysByIndex(storename, indexname, value) {
        return new Promise(async (resolve, reject) => {
            const adb = await AppDB.useDB();
            //
            const transaction = adb.transaction(storename);
            const wincache = transaction.objectStore(storename);
            const index = wincache.index(indexname);
            //
            const aKeys = [];
            //
            const request = index.openKeyCursor(IDBKeyRange.only(value));
            request.onsuccess = function () {
                var cursor = request.result;
                if (cursor) {
                    aKeys.push(cursor.primaryKey); // we assume that string type
                    cursor.continue();
                }
                else {
                    AppDB.releaseDB();
                    resolve(aKeys);
                }
            };
            request.onerror = function (ev) {
                AppDB.releaseDB();
                reject(ev);
            };
        });
    }
    static async delete(storename, key) {
        try {
            let adb = await this._useDB();
            let transaction = adb.transaction(storename, "readwrite");
            let store = transaction.objectStore(storename);
            let request = store.delete(key);
        }
        finally {
            this._releaseDB();
        }
    }
    //#endregion (Common Public Members)
    //#region Specialize Methods
    static deleteUser(userid) {
        return new Promise(async (resolve, reject) => {
            try {
                // since "await" is used, we need to get this data before the transaction starts
                const aCachedDataKeys = await AppDB.getKeysByIndex("wincache", "user_idx", userid);
                const database = await this.useDB();
                const transaction = database.transaction(["users", "shelves", "stuffs", "wincache"], "readwrite");
                const storeUsers = transaction.objectStore("users");
                const storeShelves = transaction.objectStore("shelves");
                const storeStuffs = transaction.objectStore("stuffs");
                const storeWincache = transaction.objectStore("wincache");
                const recUser = await this._processStoreRequest(storeUsers.get(userid));
                if (recUser) {
                    const deletedUser = { id: recUser.id, displayName: recUser.displayName, email: recUser.email };
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
                this.releaseDB();
            }
        });
    }
    //
    static async getWinCache(userid, packid) {
        const key = userid + "_" + packid;
        const rec = await this.get("wincache", key);
        return rec ? rec.data : null;
    }
    static async setWinCache(userid, packid, data) {
        const key = userid + "_" + packid;
        await this.put("wincache", { userid: userid, packid: packid, data: data }, key);
    }
    /**
     * @description This function is not used yet (see: uninstallPackage and deleteUser)
     */
    static async delWinCacheAll(indexname, value) {
        const adb = await AppDB.useDB();
        //
        const transaction = adb.transaction("wincache", "readwrite");
        const wincache = transaction.objectStore("wincache");
        const index = wincache.index(indexname);
        //
        const request = index.openKeyCursor(IDBKeyRange.only(value));
        request.onsuccess = function () {
            var cursor = request.result;
            if (cursor) {
                wincache.delete(cursor.primaryKey);
                cursor.continue();
            }
            else {
                AppDB.releaseDB();
            }
        };
    }
    //#endregion (Specialize Methods)
    //#region Internals
    static _onUpgradeAppDB(ev) {
        let request = ev.target;
        let adb = request.result;
        if (ev.oldVersion < 3) {
            __clearDB();
            __createDB();
        }
        else {
            // if version 3 and higher, we are not doing anything yet.
        }
        // inline
        function __createDB() {
            adb.createObjectStore("_system");
            //
            adb.createObjectStore("shared");
            //
            adb.createObjectStore("users");
            adb.createObjectStore("shelves");
            adb.createObjectStore("stuffs"); // user stuffs 
            adb.createObjectStore("results");
            //
            adb.createObjectStore("suites");
            adb.createObjectStore("packages");
            adb.createObjectStore("content");
            const storeWincache = adb.createObjectStore("wincache");
            storeWincache.createIndex("user_idx", "userid");
            storeWincache.createIndex("pack_idx", "packid");
            //
            adb.createObjectStore("libs");
            adb.createObjectStore("libfiles");
        }
        function __clearDB() {
            const listStoreNames = adb.objectStoreNames;
            for (const strStoreName of listStoreNames) {
                adb.deleteObjectStore(strStoreName);
            }
        }
    }
    static _useDB() {
        this._nRequestCounter++;
        //
        return new Promise((resolve, reject) => {
            if (this._adb) {
                resolve(this._adb);
            }
            else {
                let request = indexedDB.open(this._name, this._ver);
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
                    this._adb = request.result;
                    resolve(this._adb);
                };
                request.onupgradeneeded = (ev) => {
                    this._onUpgradeAppDB(ev);
                };
            }
        });
    }
    static _releaseDB() {
        this._nRequestCounter--;
        if (this._nRequestCounter < 1) {
            this._nRequestCounter = 0;
            if (this._adb) {
                this._adb.close();
                this._adb = null;
            }
            else {
                // this is an abnormal situation, but we are not processing it yet...
            }
        }
    }
    static _processStoreRequest(request) {
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
            //
            request.onerror = (ev) => {
                reject(ev);
            };
        });
    }
} // class AppDB
//# sourceMappingURL=appdb.js.map