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
    static makeTokenFromRecord(rec) {
        return { key: rec.key, guid: rec.guid, name: rec.name, version: rec.version, filename: rec.filename, isBroken: rec.isBroken };
    }
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
                        const pack = cursor.value;
                        if (pack.filename === criteria.filename && pack.filesize === criteria.filesize && pack.modified) {
                            const token = { key: pack.key, guid: pack.guid, name: pack.name, version: pack.version, filename: pack.filename, isBroken: pack.isBroken };
                            resolve(token);
                            return;
                        }
                        //
                        cursor.continue();
                    }
                    else {
                        resolve(null);
                    }
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
    static async findPackageRefs(packkey, userkeyExclude = null) {
        const regex = new RegExp(`PackageKey=("|\')${packkey}`);
        //
        const aUserKeys = [];
        var aShelfDataSet = await AppDB.getAll("shelves");
        aShelfDataSet.forEach((recShelf) => {
            if (regex.test(recShelf.data)) {
                aUserKeys.push(recShelf.userid);
            }
        });
        //
        let users = await AppDB.getByKeys("users", aUserKeys);
        //
        return users;
    }
    static deleteUser(userid) {
        return new Promise(async (resolve, reject) => {
            try {
                const database = await this.useDB();
                const transaction = database.transaction(["users", "shelves"], "readwrite");
                const storeUsers = transaction.objectStore("users");
                const storeShelfData = transaction.objectStore("shelves");
                const recUser = await this._processStoreRequest(storeUsers.get(userid));
                if (recUser) {
                    const user = { id: recUser.id, displayName: recUser.displayName, email: recUser.email };
                    //
                    storeUsers.delete(userid);
                    storeShelfData.delete(userid);
                    transaction.oncomplete = () => {
                        resolve(user);
                    };
                    transaction.onabort = () => {
                        resolve(null);
                    };
                    transaction.onerror = () => {
                        resolve(null);
                    };
                }
                else {
                    resolve(null);
                }
            }
            catch (err) {
                resolve(null);
            }
            finally {
                this.releaseDB();
            }
        });
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
            adb.createObjectStore("usermats");
            adb.createObjectStore("results");
            //
            adb.createObjectStore("suites");
            adb.createObjectStore("packages");
            adb.createObjectStore("content");
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
