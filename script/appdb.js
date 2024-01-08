import { Helper } from "./helper.js";
export class AppDB {
    //#region Values
    static _name;
    static _ver;
    //
    static _nRequestCounter = 0;
    static _adb = null;
    static _autokeys = null;
    //#endregion (Values)
    static async initializeAsync(name, ver) {
        this._name = name;
        this._ver = ver;
        this._autokeys = await this.get("_system", "autokeys");
        if (!this._autokeys) {
            this._autokeys = { packages: 0 };
            await this.put("_system", this._autokeys, "autokeys");
        }
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
    static async getNextAutoKey(storename) {
        let numkey = (this._autokeys[storename]) + 1;
        this._autokeys[storename] = numkey;
        await this.put("_system", this._autokeys, "autokeys");
        return numkey;
    }
    static async putNew(storename, value, gen) {
        let key = "";
        try {
            // new logic (dec-2023)
            if (this._autokeys[storename] === undefined) {
                throw new Error(`Auto-generation of the key for the object storage "${storename}" is not provided!`);
            }
            //
            let numkey = (this._autokeys[storename]) + 1;
            this._autokeys[storename] = numkey;
            await this.put("_system", this._autokeys, "autokeys");
            //
            key = (gen) ? gen(numkey.toString()) : numkey.toString();
            // if the saved object has the "key" field, then we initialize it with the current value.
            const valueAny = value;
            if (valueAny["key"] === undefined) {
                valueAny["key"] = key;
            }
            //
            let adb = await this._useDB();
            let transaction = adb.transaction(storename, "readwrite");
            let store = transaction.objectStore(storename);
            //
            await this._processStoreRequest(store.add(value, key));
        }
        finally {
            this._releaseDB();
            return key;
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
    static async findPackageByFile(criteria) {
        return new Promise(async (resolve, reject) => {
            try {
                let adb = await this._useDB();
                let transaction = adb.transaction("packages", "readonly");
                let store = transaction.objectStore("packages");
                //
                store.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        let packCurrent = cursor.value;
                        if (packCurrent.filename === criteria.filename && packCurrent.filesize === criteria.filesize && packCurrent.lastModified) {
                            const refPack = { key: packCurrent.key, name: packCurrent.name, filename: packCurrent.filename, guid: packCurrent.bookGUID, version: packCurrent.version };
                            resolve(refPack);
                            return;
                        }
                        //
                        cursor.continue();
                    }
                    else {
                        resolve(null);
                        return;
                    }
                };
            }
            catch (err) {
                reject(err); // it is necessary to test...
            }
            finally {
                this._releaseDB();
            }
        });
    }
    //#endregion (Specialize Methods)
    //#region Internals
    static _onUpgradeAppDB(ev) {
        if (ev.oldVersion === 0) {
            let request = ev.target;
            let adb = request.result;
            //
            adb.createObjectStore("_system");
            //
            adb.createObjectStore("users");
            adb.createObjectStore("catalogs");
            adb.createObjectStore("results");
            //
            adb.createObjectStore("data");
            //
            adb.createObjectStore("packages");
            adb.createObjectStore("libs");
            adb.createObjectStore("libfiles");
            adb.createObjectStore("content");
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
