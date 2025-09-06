(function () {
    let ContentPackType;
    (function (ContentPackType) {
        ContentPackType[ContentPackType["Classic"] = 0] = "Classic";
        ContentPackType[ContentPackType["Regular"] = 1] = "Regular";
        ContentPackType[ContentPackType["Managed"] = 2] = "Managed";
    })(ContentPackType || (ContentPackType = {}));
    let DeliverySourceType;
    (function (DeliverySourceType) {
        DeliverySourceType[DeliverySourceType["Local"] = 0] = "Local";
        DeliverySourceType[DeliverySourceType["Storage"] = 1] = "Storage";
        DeliverySourceType[DeliverySourceType["Service"] = 2] = "Service";
        DeliverySourceType[DeliverySourceType["Link"] = 3] = "Link";
    })(DeliverySourceType || (DeliverySourceType = {}));
    let _params;
    let _bookName;
    class Utils {
        static makeLibraryToken(obj) {
            return `${obj.machineName}-${obj.majorVersion}.${obj.minorVersion}`;
        }
        static getVersionFromObject(metadata) {
            return (metadata.patchVersion) ?
                `${metadata.majorVersion}.${metadata.minorVersion}.${metadata.patchVersion}` :
                `${metadata.majorVersion}.${metadata.minorVersion}`;
        }
        static isString(str) {
            return (typeof str === "string");
        }
        static createDynamicID() {
            return Date.now().toString();
        }
        static convertStringToArray(str) {
            const encoder = new TextEncoder();
            return encoder.encode(str);
        }
        static convertDateToTimestamp(date) {
            return date.getTime();
        }
        static extractMessage(errobj) {
            return `${errobj.name || "Error"}: ${errobj.message || "unknown"}`;
        }
        static extractExtension(path) {
            let iIndex = path.lastIndexOf(".");
            return (iIndex > 0) ? path.substring(iIndex + 1) : "";
        }
        static extractFileName(path) {
            const nIndexDot = path.lastIndexOf(".");
            if (nIndexDot < 0)
                return path;
            const nIndexSep = path.lastIndexOf("/");
            return (nIndexDot < nIndexSep) ? path : path.substring(0, nIndexDot);
        }
        static convertBase64ToArrayBuffer(strdata) {
            var binaryString = atob(strdata);
            var bytes = new Uint8Array(binaryString.length);
            for (var i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        static async fileToBlob(file) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                return new Blob([arrayBuffer], { type: file.type });
            }
            catch (error) {
                throw new Error("Error converting File to Blob." + error.message ? ": " + error.message : "");
            }
        }
        static isBaseVersionEqual(strVerTarget, strVerAnother) {
            function parseVersion(strVersion) {
                const VERLENGTH = 4;
                let aVersion = strVersion.split(".").map((item) => parseInt(item));
                while (aVersion.length < VERLENGTH)
                    aVersion.push(0);
                aVersion.length = VERLENGTH;
                return aVersion;
            }
            const aTarget = parseVersion(strVerTarget);
            const aAnother = parseVersion(strVerAnother);
            for (let i = 0; i < 3; i++) {
                if (aTarget[i] !== aAnother[i])
                    return false;
            }
            return true;
        }
    }
    let _db = null;
    async function openAppDB() {
        async function __open() {
            return new Promise((resolve, reject) => {
                const request = self.indexedDB.open(_params.dbName);
                request.onsuccess = (e) => {
                    resolve(request.result);
                };
                request.onblocked = (ev) => {
                    let msg = "The application database is blocked";
                    reject(new Error(`(Install Worker) ${_params.dbname} Failure: ${msg}`));
                };
                request.onerror = (ev) => {
                    let msgError = Utils.extractMessage(ev);
                    reject(new Error(`${_params.dbname} Error: " + ${msgError}`));
                };
            });
        }
        if (!_db) {
            _db = await __open();
        }
    }
    function processDBRequest(request) {
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
    async function getRecord(storename, key) {
        let record;
        try {
            let transaction = _db.transaction(storename, "readonly");
            let store = transaction.objectStore(storename);
            record = await processDBRequest(store.get(key));
        }
        finally {
            return record;
        }
    }
    async function getDataAll(storename) {
        let result;
        let transaction = _db.transaction(storename, "readonly");
        let store = transaction.objectStore(storename);
        return await processDBRequest(store.getAll());
    }
    async function getAll(storename) {
        let result;
        try {
            let transaction = _db.transaction(storename, "readonly");
            let store = transaction.objectStore(storename);
            result = await processDBRequest(store.getAll());
        }
        finally {
            return result || [];
        }
    }
    function getKeysByIndex(storename, indexname, value) {
        return new Promise(async (resolve, reject) => {
            const transaction = _db.transaction(storename);
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
                    resolve(aKeys);
                }
            };
            request.onerror = function (ev) {
                reject(ev);
            };
        });
    }
    function closeAppDB() {
        if (_db)
            _db.close();
        _db = null;
    }
    class BookCase {
        id;
        origId;
        name;
        version;
        isPopup;
        packtype;
        sourceType;
        suiteid;
        filename;
        filesize;
        modified;
        isBroken;
        constructor(stored) {
            this.id = stored.id;
            this.origId = stored.origId;
            this.name = stored.name;
            this.version = stored.version;
            this.isPopup = stored.isPopup;
            this.packtype = stored.packtype || ContentPackType.Classic;
            this.sourceType = stored.sourceType;
            this.suiteid = stored.suiteid;
            this.filename = stored.fileinfo.fullname;
            this.filesize = stored.fileinfo.size;
            this.modified = stored.fileinfo.modified;
            this.isBroken = stored.isBroken;
        }
    }
    async function doUninstall(bookId) {
        function _testOtherRefs(theLibToken) {
            return !!(aAllPacks.find(sp => sp.dependencies.indexOf(theLibToken) >= 0));
        }
        function _onTransComplete(ev) {
            transaction = null;
        }
        function _onTransError(ev) {
            transaction = null;
            let msg = Utils.extractMessage(ev);
            console.error(`uninstall-worker.ts/doUninstall: An transaction error occurred while deinstallation book: ${msg}`);
        }
        const pack = await getRecord("packs", bookId);
        if (!pack) {
            throw new Error(`The package for uninstall (${bookId}) was not found!`);
        }
        const bookCase = new BookCase(pack);
        const aDependencies = pack.dependencies;
        const setBeingDeleted = new Set();
        const aAllPacks = await getAll("packs");
        const nIndex = aAllPacks.findIndex((packCurrent) => packCurrent.id === bookId);
        aAllPacks.splice(nIndex, 1);
        for (const tokenDepLib of aDependencies) {
            const bOtherRefs = _testOtherRefs(tokenDepLib);
            if (!bOtherRefs)
                setBeingDeleted.add(tokenDepLib);
        }
        const aCachedDataKeys = await getKeysByIndex("wincache", "pack_idx", bookId);
        let transaction = null;
        try {
            transaction = _db.transaction(["libs", "libfiles", "packs", "packext", "packcont", "wincache"], "readwrite");
            transaction.onerror = _onTransError;
            transaction.oncomplete = _onTransComplete;
            let storeLibs = transaction.objectStore("libs");
            let storeLibFiles = transaction.objectStore("libfiles");
            for (const tokDelLib of setBeingDeleted) {
                await processDBRequest(storeLibs.delete(tokDelLib));
                await processDBRequest(storeLibFiles.delete(tokDelLib));
            }
            let storePack = transaction.objectStore("packs");
            await processDBRequest(storePack.delete(bookId));
            let storeExt = transaction.objectStore("packext");
            await processDBRequest(storeExt.delete(bookId));
            let storeContent = transaction.objectStore("packcont");
            await processDBRequest(storeContent.delete(bookId));
            const storeWincache = transaction.objectStore("wincache");
            for (const cachedKey of aCachedDataKeys) {
                await processDBRequest(storeWincache.delete(cachedKey));
            }
            return bookCase;
        }
        catch (err) {
            throw err;
        }
    }
    async function doLibUninstall(libBrief) {
        const transaction = _db.transaction(["libs", "libfiles", "_system"], "readwrite");
        const storeSystem = transaction.objectStore("_system");
        const addons = (await processDBRequest(storeSystem.get("addons"))) || {};
        const objkey = Object.keys(addons).find(objkey => addons[objkey].token === libBrief.key);
        if (objkey) {
            delete addons[objkey];
            await processDBRequest(storeSystem.put(addons, "addons"));
        }
        let storeLibs = transaction.objectStore("libs");
        let storeLibFiles = transaction.objectStore("libfiles");
        await processDBRequest(storeLibs.delete(libBrief.key));
        await processDBRequest(storeLibFiles.delete(libBrief.key));
        return libBrief;
    }
    self.addEventListener('message', async (event) => {
        const data = event.data;
        try {
            _params = data.params;
            switch (true) {
                case typeof data.bookId === "string":
                    await openAppDB();
                    const bcase = await doUninstall(data.bookId);
                    self.postMessage({ msgtype: "done", bookCase: bcase });
                    break;
                case typeof data.libBrief !== "undefined":
                    await openAppDB();
                    await doLibUninstall(data.libBrief);
                    self.postMessage({ msgtype: "done", libBrief: data.libBrief });
                    break;
            }
        }
        catch (err) {
            self.postMessage({ msgtype: "error", bookName: data.BookName, message: Utils.extractMessage(err) });
        }
        finally {
            closeAppDB();
        }
    });
})();
//# sourceMappingURL=uninstall-worker.js.map