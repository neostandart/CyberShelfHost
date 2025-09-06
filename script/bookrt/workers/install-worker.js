(function () {
    self.importScripts("../../../vendor/zip/zip-fs.min.js");
    let InstallPhase;
    (function (InstallPhase) {
        InstallPhase[InstallPhase["Undef"] = 0] = "Undef";
        InstallPhase[InstallPhase["Start"] = 1] = "Start";
        InstallPhase[InstallPhase["Download"] = 2] = "Download";
        InstallPhase[InstallPhase["Parsing"] = 3] = "Parsing";
        InstallPhase[InstallPhase["Integration"] = 4] = "Integration";
        InstallPhase[InstallPhase["Finish"] = 5] = "Finish";
        InstallPhase[InstallPhase["Error"] = 6] = "Error";
    })(InstallPhase || (InstallPhase = {}));
    let PreprocType;
    (function (PreprocType) {
        PreprocType[PreprocType["None"] = 0] = "None";
        PreprocType[PreprocType["CssUrl"] = 1] = "CssUrl";
    })(PreprocType || (PreprocType = {}));
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
    let EntryStatus;
    (function (EntryStatus) {
        EntryStatus[EntryStatus["Undef"] = 0] = "Undef";
        EntryStatus[EntryStatus["Ignore"] = 1] = "Ignore";
        EntryStatus[EntryStatus["Directory"] = 2] = "Directory";
        EntryStatus[EntryStatus["RootFile"] = 3] = "RootFile";
        EntryStatus[EntryStatus["ContentPart"] = 4] = "ContentPart";
        EntryStatus[EntryStatus["LibraryPart"] = 5] = "LibraryPart";
    })(EntryStatus || (EntryStatus = {}));
    class KnownNames {
        static PackageMain = "h5p.json";
        static ContentFolder = "content";
        static ContentEntry = "content/content.json";
        static ContentFile = "content.json";
        static LibraryFile = "library.json";
        static UpgradesFile = "upgrades.js";
        static PresaveFile = "presave.js";
        static EditorLibPrefix = "H5PEditor";
    }
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
            return `${errobj.name || "Error"}: ${errobj.message || "(unknown)"}`;
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
        static VERLENGTH = 4;
        static parseVersion(strVersion) {
            let aVersion = strVersion.split(".").map((item) => parseInt(item));
            while (aVersion.length < this.VERLENGTH)
                aVersion.push(0);
            aVersion.length = this.VERLENGTH;
            return aVersion;
        }
        static compareVersion(strVerTarget, strVerAnother) {
            const aTarget = this.parseVersion(strVerTarget);
            const aAnother = this.parseVersion(strVerAnother);
            for (let i = 0; i < this.VERLENGTH; i++) {
                if (aTarget[i] === aAnother[i])
                    continue;
                return (aTarget[i] < aAnother[i]) ? -1 : 1;
            }
            return 0;
        }
    }
    class ProgressControl {
        static _totalSteps;
        static _countSteps;
        static _progress;
        static _prev;
        static _percVal;
        static _cbProgress;
        static reset(totalSteps, cbProgress) {
            this._cbProgress = cbProgress;
            this._totalSteps = totalSteps;
            this._countSteps = 0;
            this._progress = 0;
            this._prev = 0;
            this._percVal = 100 / this._totalSteps;
        }
        static step(value = 1) {
            this._countSteps += value;
            if (this._countSteps > this._totalSteps)
                this._countSteps = this._totalSteps;
            this._progress = this._countSteps * this._percVal;
            if ((this._progress - this._prev) >= 1) {
                this._prev = this._progress;
                this._cbProgress(Math.round(this._progress));
            }
        }
        static complete() {
            this.step(this._totalSteps - this._countSteps);
        }
    }
    let _apiKey = undefined;
    let _cryptoKey = undefined;
    async function decrypt(iv, data) {
        if (!_cryptoKey)
            throw new Error("The decryption key is missing!");
        const algorithm = { name: "AES-CBC", iv };
        return await window.crypto.subtle.decrypt(algorithm, _cryptoKey, data);
    }
    let _params;
    const CorrectRootFiles = new Set([KnownNames.PackageMain]);
    let _db = null;
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
    async function getDataAll(storename) {
        let result;
        let transaction = _db.transaction(storename, "readonly");
        let store = transaction.objectStore(storename);
        return await processDBRequest(store.getAll());
    }
    async function openAppDB() {
        async function __open() {
            return new Promise((resolve, reject) => {
                const request = self.indexedDB.open(_params.dbName);
                request.onsuccess = (e) => {
                    resolve(request.result);
                };
                request.onblocked = (ev) => {
                    let msg = "The application database is blocked";
                    reject(new Error(`(Install Worker) ${_params.dbName} Failure: ${msg}`));
                };
                request.onerror = (ev) => {
                    let msgError = Utils.extractMessage(ev);
                    reject(new Error(`${_params.dbName} Error: " + ${msgError}`));
                };
            });
        }
        if (!_db) {
            _db = await __open();
        }
    }
    function closeAppDB() {
        if (_db)
            _db.close();
        _db = null;
    }
    class CodeAdapt {
        static checkCssUrl(content) {
            return content.indexOf("url(") >= 0;
        }
        static setDataContent(content, lfile) {
            lfile.data = Utils.convertStringToArray(content);
            lfile.text = null;
            lfile.preproc = PreprocType.None;
        }
        static setTextContent(content, lfile, preproc) {
            lfile.data = null;
            lfile.text = content;
            lfile.preproc = preproc;
        }
        static adaptH5P_InteractiveBook(content, lfile) {
            switch (lfile.extension) {
                case "css":
                    if (this.checkCssUrl(content))
                        this.setTextContent(content, lfile, PreprocType.CssUrl);
                    else
                        this.setDataContent(content, lfile);
                    break;
                case "js":
                    if (lfile.name === "h5p-interactive-book") {
                        content = content.replace("addHashListener(top)", "addHashListener(window)");
                    }
                    this.setDataContent(content, lfile);
                    break;
                default:
                    this.setDataContent(content, lfile);
                    break;
            }
        }
        static adaptH5P_SingleChoiceSet(content, lfile, lib) {
            if (lfile.name === "sound-effects") {
                const newCode = `SoundEffects.types.forEach(async function (type) { const player = new Audio(); const extension = player.canPlayType('audio/ogg') ? 'ogg' : 'mp3'; const lib = window.ActivePackage.getActiveLibrary("${lib.token}"); if (lib) { const data = lib.getObjectURLFlex(type + '.' + extension); if (data) { player.src = data; players[type] = player; } } });`;
                const regex = /SoundEffects\.types\.forEach(.[\s\S]+?)}\);/g;
                content = content.replace(regex, newCode);
                this.setDataContent(content, lfile);
            }
            else {
                this.setDataContent(content, lfile);
            }
        }
        static adaptH5P_SoundJS(content, lfile) {
            if (lfile.name.startsWith("soundjs") && lfile.extension === "js") {
                content = `class SoundJS_Proxy{_mapSounds=new Map;constructor(){}initializeDefaultPlugins(){return!0}registerSound(e,t){let n=window.ActivePackage;if(n){let i=e.indexOf("/");if(i>0){let s=e.substring(0,i);e=e.substring(i+1);let r=n.getActiveLibrary(s);if(r){let u=r.getObjectURL(e);u&&this._mapSounds.set(t,new Audio(u))}}}}get INTERRUPT_NONE(){return"none"}play(e,t,n){let i=this._mapSounds.get(e);i&&(n>0?setTimeout(e=>{e.play()},n,i):i.play())}}window.H5P.SoundJS=new SoundJS_Proxy;`;
                this.setDataContent(content, lfile);
            }
            else {
                this.setDataContent(content, lfile);
            }
        }
        static processCodeLibFile(content, lfile, lib) {
            switch (true) {
                case lib.token.startsWith("H5P.InteractiveBook"):
                    this.adaptH5P_InteractiveBook(content, lfile);
                    break;
                case lib.token.startsWith("H5P.SingleChoiceSet"):
                    this.adaptH5P_SingleChoiceSet(content, lfile, lib);
                    break;
                case lib.token.startsWith("H5P.SoundJS"):
                    this.adaptH5P_SoundJS(content, lfile);
                    break;
                default:
                    if (lfile.extension === "css") {
                        if (this.checkCssUrl(content)) {
                            this.setTextContent(content, lfile, PreprocType.CssUrl);
                        }
                        else {
                            this.setDataContent(content, lfile);
                        }
                    }
                    else {
                        this.setDataContent(content, lfile);
                    }
                    break;
            }
        }
    }
    async function fetchBinaryFromEntry(entry) {
        const writer = new zip.Uint8ArrayWriter();
        await entry.getData(writer);
        return await writer.getData();
    }
    async function fetchTextFromEntry(entry) {
        const writer = new zip.TextWriter();
        await entry.getData(writer);
        return await writer.getData();
    }
    async function fetchJSONFromEntry(entry) {
        const writer = new zip.TextWriter();
        await entry.getData(writer);
        const text = await writer.getData();
        return JSON.parse(text);
    }
    async function makeLinkedFile(parse, lib = undefined) {
        async function __writeData(parse, lfile) {
            var writer = new zip.Uint8ArrayWriter();
            await parse.entry.getData(writer);
            lfile.data = await writer.getData();
            lfile.text = null;
        }
        const lfile = { name: parse.name, extension: parse.extension, path: parse.localpath, preproc: PreprocType.None };
        switch (parse.status) {
            case EntryStatus.ContentPart: {
                await __writeData(parse, lfile);
                break;
            }
            case EntryStatus.LibraryPart: {
                switch (true) {
                    case ((parse.extension === "css" || parse.extension === "js") && !!lib):
                        var writerText = new zip.TextWriter();
                        await parse.entry.getData(writerText);
                        const strFileContent = await writerText.getData();
                        CodeAdapt.processCodeLibFile(strFileContent, lfile, lib);
                        break;
                    default:
                        await __writeData(parse, lfile);
                        break;
                }
                break;
            }
        }
        return lfile;
    }
    async function makeVmbLinkedFile(basepath, entry) {
        const lfile = { preproc: PreprocType.None };
        lfile.path = basepath + "/" + entry.filename;
        lfile.extension = Utils.extractExtension(entry.filename);
        var writer = new zip.Uint8ArrayWriter();
        await entry.getData(writer);
        lfile.data = await writer.getData();
        lfile.text = null;
        return lfile;
    }
    function parseEntry(entry) {
        function __getFileNameParts(filename) {
            const res = ["", ""];
            const nIndex = filename.lastIndexOf(".");
            if (nIndex <= 0 || nIndex === (filename.length - 1))
                return ["", ""];
            return [filename.substring(0, nIndex), filename.substring(nIndex + 1)];
        }
        const res = { status: EntryStatus.Undef, entry: entry };
        if (entry.directory) {
            res.status = EntryStatus.Directory;
            res.localpath = res.filename;
        }
        else {
            const aPath = entry.filename.split("/");
            if (aPath.length !== 0) {
                if (aPath.length == 1) {
                    res.filename = aPath[0];
                    res.localpath = res.filename;
                    if (CorrectRootFiles.has(res.filename)) {
                        const nameparts = __getFileNameParts(res.filename);
                        res.name = nameparts[0];
                        res.extension = nameparts[1];
                        res.rootParent = "";
                        res.status = EntryStatus.RootFile;
                    }
                }
                else {
                    res.filename = aPath[aPath.length - 1];
                    res.localpath = aPath.slice(1).join("/");
                    const nameparts = __getFileNameParts(res.filename);
                    if (nameparts[0].length > 0) {
                        res.name = nameparts[0];
                        res.extension = nameparts[1];
                        res.rootParent = aPath[0];
                        if (res.rootParent == KnownNames.ContentFolder) {
                            res.status = (res.filename == KnownNames.ContentFile) ? EntryStatus.Ignore : EntryStatus.ContentPart;
                        }
                        else {
                            res.status = res.rootParent.startsWith(KnownNames.EditorLibPrefix) ? EntryStatus.Ignore : EntryStatus.LibraryPart;
                        }
                    }
                }
            }
        }
        return res;
    }
    function prepareVmbContentMap(content, mapVmbContentEntries) {
        function __processEntry(entry) {
            const objEntry = JSON.parse(entry);
            const objVmbraw = objEntry.vmbraw;
            if (objVmbraw.path) {
                mapVmbContentEntries.set(objVmbraw.path, objEntry);
            }
            else {
                console.error("CyberShelf Parser: Incorrect \"wmbraw \" format!");
            }
        }
        let nPosStart = content.indexOf("\"vmbraw\"");
        let nPosNow = nPosStart;
        while (nPosNow > 0) {
            let bIgnore = false;
            let nOpeningCurlys = 0;
            let nClosingCurlys = 0;
            let charCur = "";
            let charPrev = "";
            for (let i = nPosNow; i < content.length; i++) {
                charPrev = charCur;
                charCur = content[i];
                switch (charCur) {
                    case "\"": {
                        if (charPrev !== "\\")
                            bIgnore = !bIgnore;
                        break;
                    }
                    case "{":
                        if (!bIgnore)
                            nOpeningCurlys++;
                        break;
                    case "}":
                        if (!bIgnore)
                            nClosingCurlys++;
                        break;
                }
                if (nClosingCurlys > 0 && nOpeningCurlys === nClosingCurlys) {
                    nPosNow = i + 1;
                    __processEntry("{" + content.substring(nPosStart, nPosNow) + "}");
                    break;
                }
            }
            nPosStart = content.indexOf("\"vmbraw\"", nPosNow);
            nPosNow = nPosStart;
        }
    }
    async function leaveOnlyNewLibraries(candidateLibs) {
        function __checkNewest(existingLib, incomingLib) {
            const nPatchExisting = Number(existingLib.metadata.patchVersion);
            const nPatchIncoming = Number(incomingLib.metadata.patchVersion);
            switch (true) {
                case Number.isInteger(nPatchIncoming):
                    return (Number.isInteger(nPatchExisting)) ? nPatchIncoming > nPatchExisting : true;
                default:
                    return false;
            }
        }
        const aInstalledLibs = await getDataAll("libs");
        return new Map([...candidateLibs.entries()].filter(([key, value]) => {
            const installedLib = aInstalledLibs.find(lib => lib.token === key);
            return (installedLib) ? __checkNewest(installedLib, value) : true;
        }));
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
    class PackageRaw {
        _fileinfo;
        _internals;
        _objPackage;
        _outerBook;
        _isCorrect = false;
        _strIncorrectMessage = "";
        extractId(part) {
            if (!Utils.isString(part))
                return null;
            const res = part.match(/(?<=@id=\s*)(\S+)(?=\s*;)/im);
            return (res && res.length > 0) ? res[0] : null;
        }
        extractIsPopup(part) {
            if (!Utils.isString(part))
                return false;
            const res = part.match(/(?<=@popup=\s*)(\S+)(?=\s*;)/im);
            const bRes = (res && res.length > 0) ? res[0].toLowerCase() === "true" : false;
            return bRes;
        }
        extractVersion(part) {
            if (Array.isArray(part)) {
                const latest = part[part.length - 1];
                if (Utils.isString(latest.log)) {
                    return latest.log.match(/(?<=@version=\s*)(\S+)(?=\s*;)/im)[0] || null;
                }
            }
            return null;
        }
        constructor(fileinfo, internals, outerBook) {
            try {
                this._fileinfo = fileinfo;
                this._internals = internals;
                const objMainLib = internals.metadata.preloadedDependencies.find((item) => { return item.machineName === internals.metadata.mainLibrary; });
                const strMainLibToken = Utils.makeLibraryToken(objMainLib);
                this._objPackage = {
                    id: undefined,
                    origId: undefined,
                    name: internals.metadata.title,
                    version: "0.0.0",
                    isPopup: false,
                    packtype: ContentPackType.Classic,
                    sourceType: outerBook.sourceType,
                    distorId: outerBook?.distorId || "",
                    sourceUrl: outerBook.sourceUrl || "",
                    suiteid: "",
                    fileinfo: fileinfo,
                    installed: Date.now(),
                    updated: 0,
                    libtoken: strMainLibToken,
                    metadata: internals.metadata,
                    dependencies: [],
                    isBroken: false,
                    brokeninfo: ""
                };
                this._outerBook = outerBook;
                if (outerBook.sourceType === DeliverySourceType.Service) {
                    this._objPackage.id = this._outerBook.id;
                    this._objPackage.version = this._outerBook.version;
                    this._objPackage.packtype = ContentPackType.Regular;
                }
                else {
                    let packId = this.extractId(this._objPackage.metadata.authorComments);
                    if (packId) {
                        this._objPackage.id = packId;
                        this._objPackage.version = this.extractVersion(this._objPackage.metadata.changes) || this._objPackage.version;
                        this._objPackage.packtype = ContentPackType.Regular;
                    }
                    else {
                        this._objPackage.id = "h5p-" + Utils.createDynamicID();
                    }
                }
                this._objPackage.isPopup = this.extractIsPopup(this._objPackage.metadata.authorComments);
                this._objPackage.fileinfo.modified = Utils.convertDateToTimestamp(new Date());
                this._objPackage.origId = this._objPackage.id;
                this._internals.content.packId = this._objPackage.id;
                const aPreloaded = internals.metadata.preloadedDependencies;
                if (Array.isArray(aPreloaded)) {
                    for (let i = 0; i < aPreloaded.length; i++) {
                        let libtoken = Utils.makeLibraryToken(aPreloaded[i]);
                        this._objPackage.dependencies.push(libtoken);
                    }
                }
                this._isCorrect = true;
            }
            catch (err) {
                this._strIncorrectMessage = Utils.extractMessage(err);
            }
        }
        get isCorrect() {
            return this._isCorrect;
        }
        get isClassic() {
            return this._objPackage.packtype === ContentPackType.Classic;
        }
        get incorrectMessage() {
            return this._strIncorrectMessage;
        }
        get fileinfo() {
            return this._fileinfo;
        }
        get newlibs() {
            return this._internals.newlibs;
        }
        get content() {
            return this._internals.content;
        }
        get stored() {
            return this._objPackage;
        }
        get annotation() {
            return (this._outerBook) ? this._outerBook.annotation : "";
        }
        makeUniqueName() {
            const now = new Date().toLocaleString();
            this._objPackage.name = `${this._objPackage.name} (${now})`;
        }
        changeId(idNew) {
            this._objPackage.id = idNew;
            if (this._objPackage.packtype === ContentPackType.Classic) {
                this._objPackage.origId = idNew;
            }
        }
        setUpdatedTimestamp(timestamp) {
            this._objPackage.updated = timestamp;
        }
        getCase() {
            return new BookCase(this._objPackage);
        }
    }
    async function download(url, cbProgress) {
        const init = (_apiKey && _apiKey.length > 0) ? { method: "GET", mode: "cors", headers: { "Content-Type": "application/octet-stream", "Authorization": _apiKey } } : { method: "GET", mode: "cors", headers: { "Content-Type": "application/octet-stream" } };
        const response = await fetch(url, init);
        if (!response.ok)
            throw new Error(`The "${url}" file upload failed: status=${response.status}, text="${response.text}", type=${response.type}.`);
        const contentLength = Number(response.headers.get('Content-Length'));
        let receivedLength = 0;
        let chunks = [];
        const reader = response.body.getReader();
        ProgressControl.reset(contentLength, cbProgress);
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            chunks.push(value);
            receivedLength += value.length;
            ProgressControl.step(value.length);
        }
        let chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for (let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
        }
        ProgressControl.complete();
        return new Blob([chunksAll]);
    }
    async function parse(blobPackage, cbProgress) {
        const result = {
            metadata: {
                title: "",
                extraTitle: "",
                mainLibrary: "",
                language: "",
                defaultLanguage: "",
                embedTypes: [],
                license: "",
                licenseExtras: "",
                preloadedDependencies: [],
                changes: [],
                authors: [],
                authorComments: ""
            },
            content: { packId: "", data: "", files: [], iv: undefined },
            newlibs: new Map()
        };
        const readerBlob = new zip.BlobReader(blobPackage);
        const readerZip = new zip.ZipReader(readerBlob);
        const aEntries = await readerZip.getEntries();
        const entryContentFile = aEntries.find((entryItem) => {
            return (entryItem.filename && entryItem.filename.startsWith(KnownNames.ContentEntry));
        });
        if (!entryContentFile) {
            throw new Error(`The "content.json" file was not found in the package!`);
        }
        let strTheContent;
        const strSuffixContent = entryContentFile.filename.substring(KnownNames.ContentEntry.length);
        if (strSuffixContent.length > 0) {
            const iv = Utils.convertBase64ToArrayBuffer(strSuffixContent.split(".", 1)[0].replace("_", "//"));
            let aContentBynary = await fetchBinaryFromEntry(entryContentFile);
            try {
                const decrypted = await decrypt(iv, aContentBynary);
                result.content.data = aContentBynary;
                result.content.iv = iv;
                strTheContent = (new TextDecoder()).decode(decrypted);
            }
            catch (err) {
                let message = Utils.extractMessage(err);
                console.error(message);
            }
        }
        else {
            strTheContent = await fetchTextFromEntry(entryContentFile);
            result.content.data = strTheContent;
        }
        const mapVmbContentEntries = new Map();
        prepareVmbContentMap(strTheContent, mapVmbContentEntries);
        ProgressControl.reset(aEntries.length, cbProgress);
        for (let i = 0; i < aEntries.length; i++) {
            ProgressControl.step();
            const entry = aEntries[i];
            const parsed = parseEntry(entry);
            switch (parsed.status) {
                case EntryStatus.RootFile: {
                    if (parsed.filename == KnownNames.PackageMain) {
                        result.metadata = await fetchJSONFromEntry(parsed.entry);
                    }
                    else {
                        console.error(`Unknown entry in the root of the H5P package (entry: "${entry.filename}"), (package file: "${_bookName}").`);
                    }
                    break;
                }
                case EntryStatus.ContentPart: {
                    if (mapVmbContentEntries.has(parsed.localpath)) {
                        mapVmbContentEntries.set(parsed.localpath, parsed.entry);
                    }
                    else {
                        const lfile = await makeLinkedFile(parsed);
                        result.content.files.push(lfile);
                    }
                    break;
                }
                case EntryStatus.LibraryPart: {
                    const libtoken = parsed.rootParent;
                    let newlib = result.newlibs.get(libtoken);
                    if (!newlib) {
                        newlib = { token: libtoken, files: [] };
                        result.newlibs.set(libtoken, newlib);
                    }
                    const lfile = await makeLinkedFile(parsed, newlib);
                    newlib.files.push(lfile);
                    switch (parsed.filename) {
                        case KnownNames.LibraryFile: {
                            const strMetadata = await fetchTextFromEntry(parsed.entry);
                            newlib.metadata = JSON.parse(strMetadata);
                            newlib.machineName = newlib.metadata.machineName;
                            newlib.majorVersion = newlib.metadata.majorVersion;
                            newlib.minorVersion = newlib.metadata.minorVersion;
                            newlib.version = Utils.getVersionFromObject(newlib.metadata);
                            if (newlib.metadata.coreApi) {
                                newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                                newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                            }
                            newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                            break;
                        }
                        case KnownNames.UpgradesFile: {
                            newlib.textUpgrades = await fetchTextFromEntry(parsed.entry);
                            break;
                        }
                        case KnownNames.PresaveFile: {
                            newlib.textPresave = await fetchTextFromEntry(parsed.entry);
                            break;
                        }
                    }
                    break;
                }
                case EntryStatus.Ignore: {
                    break;
                }
                case EntryStatus.Directory: {
                    break;
                }
                case EntryStatus.Undef: {
                    console.error(`Unrecognized entry status (entry: "${entry.filename}"), (package file: "${_bookName}").`);
                    break;
                }
            }
        }
        result.newlibs = await leaveOnlyNewLibraries(result.newlibs);
        ProgressControl.complete();
        if (mapVmbContentEntries.size > 0)
            ProgressControl.reset(mapVmbContentEntries.size, cbProgress);
        for (let pair of mapVmbContentEntries.entries()) {
            ProgressControl.step();
            if (typeof pair[1].getData === "function") {
                var writer = new zip.Uint8ArrayWriter();
                const data = await pair[1].getData(writer);
                const blob = new Blob([data]);
                const readerBlob = new zip.BlobReader(blob);
                const readerZip = new zip.ZipReader(readerBlob);
                const aRawEntries = await readerZip.getEntries();
                for (let i = 0; i < aRawEntries.length; i++) {
                    const entry = aRawEntries[i];
                    if (entry.directory)
                        continue;
                    const lfile = await makeVmbLinkedFile(Utils.extractFileName(pair[0]), entry);
                    result.content.files.push(lfile);
                }
            }
            else {
                throw new Error(`Incorrect format of the Raw VMB content file "${pair[0]}": The corresponding Zip was not found!`);
            }
        }
        ProgressControl.complete();
        await readerZip.close();
        return result;
    }
    async function findExistBook(packNew) {
        return new Promise(async (resolve, reject) => {
            try {
                let transPackages = _db.transaction("packs", "readonly");
                let storePackages = transPackages.objectStore("packs");
                let packStored = null;
                let bMatch = false;
                storePackages.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const packCurrent = cursor.value;
                        if (packCurrent.packtype === ContentPackType.Classic) {
                            if (packNew.fileinfo.fullname === packCurrent.fileinfo.fullname) {
                                packStored = packCurrent;
                                bMatch = (packNew.fileinfo.size === packCurrent.fileinfo.size) && (packNew.fileinfo.modified === packCurrent.fileinfo.modified);
                            }
                        }
                        else {
                            if (packNew.id === packCurrent.id) {
                                packStored = packCurrent;
                                bMatch = Utils.isBaseVersionEqual(packNew.version, packCurrent.version);
                            }
                        }
                        if (packStored) {
                            resolve({ pack: packStored, match: bMatch });
                        }
                        else {
                            cursor.continue();
                        }
                    }
                    else {
                        resolve({ pack: null, match: false });
                    }
                };
            }
            catch (err) {
                reject(err);
            }
        });
    }
    async function regAddons(db, libs) {
        const transaction = db.transaction(["_system"], "readwrite");
        transaction.onerror = (ev) => {
            const msg = `install-worker.ts/regAddons: An unhandled transaction error has occurred: ${Utils.extractMessage(ev)}`;
            console.error(msg);
        };
        const storeSystem = transaction.objectStore("_system");
        const addons = (await processDBRequest(storeSystem.get("addons"))) || {};
        let isAddonsDirty = false;
        libs.forEach((lib) => {
            if (lib.isAddon) {
                const existing = addons[lib.machineName];
                if (!existing || (existing && Utils.compareVersion(lib.version, existing.version) >= 0)) {
                    isAddonsDirty = true;
                    addons[lib.machineName] = { machineName: lib.machineName, majorVersion: lib.majorVersion, minorVersion: lib.minorVersion, token: lib.token, version: lib.version, addTo: lib.metadata.addTo };
                }
            }
        });
        if (isAddonsDirty) {
            await processDBRequest(storeSystem.put(addons, "addons"));
        }
    }
    async function integrate(packraw, cbProgress) {
        return new Promise(async (resolve, reject) => {
            let transaction = null;
            try {
                transaction = _db.transaction(["libs", "libfiles", "packs", "packext", "packcont"], "readwrite");
                transaction.oncomplete = (ev) => {
                    resolve(packraw.getCase());
                };
                transaction.onerror = (ev) => {
                    transaction = null;
                    reject("(Setup) AppDB Transaction error. " + Utils.extractMessage(ev));
                };
                ProgressControl.reset(5, cbProgress);
                for (const [token, newlib] of packraw.newlibs) {
                    const files = newlib.files;
                    delete newlib.files;
                    let storeLibs = transaction.objectStore("libs");
                    await processDBRequest(storeLibs.put(newlib, token));
                    const objLibFiles = { libtoken: token, files: files };
                    let storeLibFiles = transaction.objectStore("libfiles");
                    await processDBRequest(storeLibFiles.put(objLibFiles, token));
                }
                ProgressControl.step();
                let storePackages = transaction.objectStore("packs");
                await processDBRequest(storePackages.put(packraw.stored, packraw.stored.id));
                ProgressControl.step();
                let storeExt = transaction.objectStore("packext");
                await processDBRequest(storeExt.put({ packId: packraw.stored.id, annotation: packraw.annotation }, packraw.stored.id));
                ProgressControl.step();
                let storeContent = transaction.objectStore("packcont");
                await processDBRequest(storeContent.put(packraw.content, packraw.stored.id));
                ProgressControl.step();
                await regAddons(_db, [...packraw.newlibs.values()]);
                ProgressControl.step();
                ProgressControl.complete();
            }
            catch (err) {
                reject(err);
            }
        });
    }
    let _phase = InstallPhase.Undef;
    let _bookName;
    let _internals = undefined;
    let _existBookInfo = undefined;
    let _packRaw = undefined;
    function onProgress(nPercent) {
        self.postMessage({ phase: _phase, percent: nPercent });
    }
    async function beginInstall(bookRef) {
        _phase = InstallPhase.Download;
        const blobPackage = (bookRef.source instanceof File) ? await Utils.fileToBlob(bookRef.source) : await download(bookRef.source, onProgress);
        _phase = InstallPhase.Parsing;
        _internals = await parse(blobPackage, onProgress);
        _phase = InstallPhase.Integration;
        const fileInfo = {
            fullname: (bookRef.source instanceof File) ? bookRef.source.name : bookRef.source,
            name: (bookRef.source instanceof File) ? Utils.extractFileName(bookRef.source.name) : bookRef.label,
            extension: (bookRef.source instanceof File) ? Utils.extractExtension(bookRef.source.name) : "",
            size: (bookRef.source instanceof File) ? bookRef.source.size : blobPackage.size,
            modified: (bookRef.source instanceof File) ? bookRef.source.lastModified : Utils.convertDateToTimestamp(new Date())
        };
        _packRaw = new PackageRaw(fileInfo, _internals, bookRef);
        if (bookRef.source instanceof File) {
            _existBookInfo = await findExistBook(_packRaw.stored);
            if (_existBookInfo.pack)
                self.postMessage({ candidate: _packRaw.getCase(), existing: new BookCase(_existBookInfo.pack), match: _existBookInfo.match });
            else
                self.postMessage({ candidate: _packRaw.getCase() });
        }
        else {
            self.postMessage({ candidate: _packRaw.getCase() });
        }
    }
    async function completeSetup(setupVariant) {
        switch (setupVariant) {
            case "install": {
                if (_existBookInfo && _existBookInfo.pack) {
                    _packRaw.makeUniqueName();
                    if (!_packRaw.isClassic)
                        _packRaw.changeId("tmp-" + Utils.createDynamicID());
                }
                break;
            }
            case "update": {
                if (_packRaw.isClassic) {
                    _packRaw.changeId(_existBookInfo.pack.id);
                }
                _packRaw.setUpdatedTimestamp(Date.now());
                break;
            }
        }
        const bookCase = await integrate(_packRaw, onProgress);
        self.postMessage({ phase: InstallPhase.Finish, bookCase: bookCase, newLibs: _internals.newlibs });
    }
    async function parseLibrary(fileLibrary) {
        const newlib = {};
        const aFiles = [];
        const readerBlob = new zip.BlobReader(fileLibrary);
        const readerZip = new zip.ZipReader(readerBlob);
        const aEntries = await readerZip.getEntries();
        for (let i = 0; i < aEntries.length; i++) {
            const entry = aEntries[i];
            const resEntryParse = parseEntry(entry);
            switch (resEntryParse.status) {
                case EntryStatus.LibraryPart: {
                    const lfile = await makeLinkedFile(resEntryParse);
                    aFiles.push(lfile);
                    switch (resEntryParse.filename) {
                        case KnownNames.LibraryFile: {
                            if (newlib.token) {
                                throw new Error("Incorrect structure of the H5P library file. More than one nested directory was found!");
                            }
                            newlib.token = resEntryParse.rootParent;
                            const strMetadata = await fetchTextFromEntry(resEntryParse.entry);
                            newlib.metadata = JSON.parse(strMetadata);
                            newlib.machineName = newlib.metadata.machineName;
                            newlib.majorVersion = newlib.metadata.majorVersion;
                            newlib.minorVersion = newlib.metadata.minorVersion;
                            newlib.version = Utils.getVersionFromObject(newlib.metadata);
                            if (newlib.metadata.coreApi) {
                                newlib.majorVersionCore = newlib.metadata.coreApi.majorVersion;
                                newlib.minorVersionCore = newlib.metadata.coreApi.minorVersion;
                            }
                            newlib.isAddon = (newlib.metadata.addTo) ? true : false;
                            break;
                        }
                        case KnownNames.UpgradesFile: {
                            newlib.textUpgrades = await fetchTextFromEntry(resEntryParse.entry);
                            break;
                        }
                        case KnownNames.PresaveFile: {
                            newlib.textPresave = await fetchTextFromEntry(resEntryParse.entry);
                            break;
                        }
                    }
                    break;
                }
            }
        }
        await readerZip.close();
        return { library: newlib, files: { libtoken: newlib.token, files: aFiles } };
    }
    async function installLibrary(libFile) {
        const parsed = await parseLibrary(libFile);
        if (!(parsed.library && parsed.library.token))
            throw new Error(`The file "${libFile.name}" contains an incorrect H5P library format!`);
        const transaction = _db.transaction(["libs", "libfiles"], "readwrite");
        transaction.onerror = (ev) => {
            const msg = `install-worker.ts/installLibrary: An unhandled transaction error has occurred: ${Utils.extractMessage(ev)}`;
            console.error(msg);
        };
        let storeLibs = transaction.objectStore("libs");
        let storeLibFiles = transaction.objectStore("libfiles");
        await processDBRequest(storeLibs.put(parsed.library, parsed.library.token));
        const objLibFiles = { libtoken: parsed.library.token, files: parsed.files.files };
        await processDBRequest(storeLibFiles.put(objLibFiles, parsed.library.token));
        await regAddons(_db, [parsed.library]);
        const libBrief = { key: parsed.library.token, title: parsed.library.metadata.title, version: parsed.library.version };
        self.postMessage({ libBrief });
    }
    self.addEventListener('message', async (event) => {
        try {
            const data = event.data;
            if (data.params)
                _params = data.params;
            switch (true) {
                case data.bookRef !== undefined: {
                    _apiKey = _params.apiKey;
                    _cryptoKey = data.cryptoKey;
                    _bookName = data.bookRef.label;
                    await openAppDB();
                    await beginInstall(data.bookRef);
                    break;
                }
                case data.setupVariant !== undefined: {
                    await openAppDB();
                    await completeSetup(data.setupVariant);
                    break;
                }
                case data.libFile !== undefined: {
                    await openAppDB();
                    await installLibrary(data.libFile);
                    break;
                }
            }
        }
        catch (err) {
            self.postMessage({ phase: InstallPhase.Error, message: Utils.extractMessage(err) });
        }
        finally {
            closeAppDB();
        }
    });
})();
//# sourceMappingURL=install-worker.js.map