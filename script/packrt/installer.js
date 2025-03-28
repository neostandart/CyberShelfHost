import { Helper } from "../helper.js";
import { DeliveryMethod, MCPackType } from "./abstraction.js";
import * as appdb from "../appdb.js";
import * as parser from "./parser.js";
import { ProgressControl } from "../progress.js";
import { PackageRaw } from "./dataobj/packraw.js";
import { BookCase } from "./dataobj/bookcase.js";
import { LibraryPool } from "./render/activelib.js";
var UpgradeAnswer;
(function (UpgradeAnswer) {
    UpgradeAnswer[UpgradeAnswer["Yes"] = 0] = "Yes";
    UpgradeAnswer[UpgradeAnswer["No"] = 1] = "No";
    UpgradeAnswer[UpgradeAnswer["Cancel"] = 2] = "Cancel";
})(UpgradeAnswer || (UpgradeAnswer = {}));
let _refBookMan;
let _inputPackage;
let _inputLibrary;
async function storePackage(packraw, progress) {
    let database = null;
    let transaction = null;
    try {
        progress.setStepMax(packraw.newlibs.size + 3);
        database = await appdb.useDB();
        transaction = database.transaction(["libs", "libfiles", "packs", "packext", "packcont"], "readwrite");
        transaction.onerror = _onTransError;
        transaction.oncomplete = _onTransComplete;
        for (const [token, newlib] of packraw.newlibs) {
            const files = newlib.files;
            newlib.files = undefined;
            let storeLibs = transaction.objectStore("libs");
            storeLibs.put(newlib, token);
            const objLibFiles = { libtoken: token, files: files };
            let storeLibFiles = transaction.objectStore("libfiles");
            storeLibFiles.put(objLibFiles, token);
            progress.doStep();
        }
        let storePackages = transaction.objectStore("packs");
        storePackages.put(packraw.stored, packraw.stored.id);
        progress.doStep();
        let storeExt = transaction.objectStore("packext");
        storeExt.put({ packid: packraw.stored.id, annotation: packraw.annotation }, packraw.stored.id);
        let storeContent = transaction.objectStore("packcont");
        storeContent.put(packraw.content, packraw.stored.id);
        progress.doStep();
        transaction.commit();
    }
    catch (err) {
        _abortTransaction();
        throw err;
    }
    finally {
        appdb.releaseDB();
    }
    progress.doStep();
    return packraw.getCase();
    function _onTransComplete(ev) {
        transaction = null;
    }
    function _onTransError(ev) {
        let msg = (ev.srcElement) ? ev.srcElement : ev;
        console.error(`An error occurred while writing data to the application database: ${msg}.`);
        _abortTransaction();
    }
    function _abortTransaction() {
        if (transaction) {
            let transForAbort = transaction;
            transaction = null;
            try {
                transForAbort.abort();
            }
            catch (err) { }
            ;
        }
    }
}
async function doUninstall(packkey) {
    const pack = await appdb.get("packs", packkey);
    if (!pack) {
        throw new Error(`The package for uninstall (${packkey}) was not found!`);
    }
    const bookCase = new BookCase(pack);
    const aDependencies = pack.dependencies;
    const setBeingDeleted = new Set();
    const aAllPacks = await appdb.getAll("packs");
    const nIndex = aAllPacks.findIndex((packCurrent) => packCurrent.id === packkey);
    aAllPacks.splice(nIndex, 1);
    for (const tokenDepLib of aDependencies) {
        const bOtherRefs = _testOtherRefs(tokenDepLib);
        if (!bOtherRefs)
            setBeingDeleted.add(tokenDepLib);
    }
    const aCachedDataKeys = await appdb.getKeysByIndex("wincache", "pack_idx", packkey);
    let database = null;
    let transaction = null;
    try {
        database = await appdb.useDB();
        transaction = database.transaction(["libs", "libfiles", "packs", "packext", "packcont", "wincache"], "readwrite");
        transaction.onerror = _onTransError;
        transaction.oncomplete = _onTransComplete;
        let storeLibs = transaction.objectStore("libs");
        let storeLibFiles = transaction.objectStore("libfiles");
        for (const tokDelLib of setBeingDeleted) {
            storeLibs.delete(tokDelLib);
            storeLibFiles.delete(tokDelLib);
        }
        let storePack = transaction.objectStore("packs");
        storePack.delete(packkey);
        let storeExt = transaction.objectStore("packext");
        storeExt.delete(packkey);
        let storeContent = transaction.objectStore("packcont");
        storeContent.delete(packkey);
        const storeWincache = transaction.objectStore("wincache");
        for (const cachedKey of aCachedDataKeys) {
            storeWincache.delete(cachedKey);
        }
        transaction.commit();
        return bookCase;
    }
    catch (err) {
        _abortTransaction();
        throw err;
    }
    finally {
        appdb.releaseDB();
    }
    function _testOtherRefs(theLibToken) {
        for (const packOther of aAllPacks) {
            if (packOther.dependencies.indexOf(theLibToken) >= 0)
                return true;
        }
        return false;
    }
    function _onTransComplete(ev) {
        transaction = null;
    }
    function _onTransError(ev) {
        let msg = (ev.srcElement) ? ev.srcElement : ev;
        console.error(`An error occurred while writing data to the application database: ${msg}.`);
        _abortTransaction();
    }
    function _abortTransaction() {
        if (transaction) {
            let transForAbort = transaction;
            transaction = null;
            try {
                transForAbort.abort();
            }
            catch (err) { }
            ;
        }
    }
}
async function findUpdateCandidate(packNew) {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await appdb.useDB();
            let transPackages = adb.transaction("packs", "readonly");
            let storePackages = transPackages.objectStore("packs");
            let packStored = null;
            let bMatch = false;
            storePackages.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const packCurrent = cursor.value;
                    if (packCurrent.packtype === MCPackType.Classic) {
                        if (packNew.fileinfo.fullname === packCurrent.fileinfo.fullname) {
                            packStored = packCurrent;
                            bMatch = (packNew.fileinfo.size === packCurrent.fileinfo.size) && (packNew.fileinfo.modified === packCurrent.fileinfo.modified);
                        }
                    }
                    else {
                        if (packNew.id === packCurrent.id) {
                            packStored = packCurrent;
                            bMatch = Helper.isBaseVersionEqual(packNew.version, packCurrent.version);
                        }
                    }
                    if (packStored) {
                        resolve([packStored, bMatch]);
                    }
                    else {
                        cursor.continue();
                    }
                }
                else {
                    resolve([null, false]);
                }
            };
        }
        catch (err) {
            reject(err);
        }
        finally {
            appdb.releaseDB();
        }
    });
}
async function uninstallLibrary(libtoken) {
    let database = null;
    let transaction = null;
    try {
        database = await appdb.useDB();
        transaction = database.transaction(["libs", "libfiles"], "readwrite");
        let storeLibs = transaction.objectStore("libs");
        let storeLibFiles = transaction.objectStore("libfiles");
        storeLibs.delete(libtoken);
        storeLibFiles.delete(libtoken);
        transaction.commit();
        return libtoken;
    }
    catch (err) {
        if (transaction) {
            try {
                transaction.abort();
            }
            catch (errTrans) {
                console.error(errTrans);
            }
        }
        return null;
    }
    finally {
        appdb.releaseDB();
    }
}
async function onInputPackageChange() {
    if (_inputPackage.files.length >= 1) {
        const filePackage = _inputPackage.files[0];
        const fileinfo = { fullname: filePackage.name, name: Helper.extractFileName(filePackage.name), extension: Helper.extractExtension(filePackage.name), size: filePackage.size, modified: filePackage.lastModified };
        let bPermission = await _refBookMan.invokeMethodAsync("requestInstallStart", fileinfo);
        if (bPermission) {
            const progress = new ProgressControl(_refBookMan, "updateInstallProgress");
            progress.setSegment(70);
            let internals = undefined;
            try {
                internals = await parser.parsePackageFile(filePackage, progress);
            }
            catch (err) {
                _refBookMan.invokeMethodAsync("informInstallError", Helper.extractMessage(err));
                return;
            }
            progress.setSegment(30);
            const candidateRaw = new PackageRaw(fileinfo, internals, DeliveryMethod.Local);
            if (!candidateRaw.isCorrect) {
                _refBookMan.invokeMethodAsync("informInstallError", candidateRaw.incorrectMessage);
                return;
            }
            let [existing, bMatch] = await findUpdateCandidate(candidateRaw.stored);
            try {
                let installed = null;
                if (existing) {
                    let answer = await _refBookMan.invokeMethodAsync("requestPackUpdate", candidateRaw.getCase(), new BookCase(existing), bMatch);
                    switch (answer) {
                        case UpgradeAnswer.Yes: {
                            if (candidateRaw.isRegular) {
                                candidateRaw.changeId(existing.id);
                            }
                            candidateRaw.setUpdatedTimestamp(Date.now());
                            installed = await storePackage(candidateRaw, progress);
                            break;
                        }
                        case UpgradeAnswer.No: {
                            candidateRaw.makeUniqueName();
                            if (candidateRaw.isBook) {
                                candidateRaw.changeId("tmp-" + Helper.createDynamicID());
                            }
                            installed = await storePackage(candidateRaw, progress);
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
                else {
                    let bPermission = await _refBookMan.invokeMethodAsync("requestInstallProcess", candidateRaw.getCase());
                    if (bPermission) {
                        installed = await storePackage(candidateRaw, progress);
                    }
                }
                setTimeout(() => {
                    progress.done();
                    _refBookMan.invokeMethodAsync("informInstallFinish", installed);
                }, 200);
            }
            catch (err) {
                _refBookMan.invokeMethodAsync("informInstallError", Helper.extractMessage(err));
            }
        }
    }
}
async function onInputLibraryChange() {
    try {
        if (_inputLibrary.files.length >= 1) {
            const fileLibrary = _inputLibrary.files[0];
            const filetoken = { name: fileLibrary.name, size: fileLibrary.size, type: fileLibrary.type, modified: fileLibrary.lastModified };
            let bPermission = await _refBookMan.invokeMethodAsync("requestLibInstall", filetoken);
            if (bPermission) {
                const parsed = await parser.parseLibraryFile(fileLibrary);
                await appdb.put("libs", parsed.library, parsed.library.token);
                await appdb.put("libfiles", parsed.files, parsed.library.token);
                const libtok = { key: parsed.library.token, title: parsed.library.metadata.title, version: parsed.library.version };
                _refBookMan.invokeMethodAsync("informLibInstallFinish", libtok);
            }
        }
    }
    catch (err) {
        _refBookMan.invokeMethodAsync("informLibInstallError", Helper.extractMessage(err));
    }
}
export function attachPackageInput(inputElement) {
    _inputPackage = inputElement;
    if (_inputPackage) {
        _inputPackage.addEventListener("change", onInputPackageChange);
    }
}
export function attachLibraryInput(inputElement) {
    _inputLibrary = inputElement;
    if (_inputLibrary) {
        _inputLibrary.addEventListener("change", onInputLibraryChange);
    }
}
export function tryInstall() {
    if (_inputPackage) {
        _inputPackage.click();
    }
}
export async function installFromService(uri, book, serviceUrl, apiKey) {
    async function fetchBLOBAsync(url, ctrProgress) {
        const fileInfo = { fullname: "", name: "", extension: "", size: 0, modified: 0 };
        const init = (apiKey && apiKey.length > 0) ? { method: "GET", headers: { "Authorization": apiKey } } : { method: "GET" };
        let resp = await fetch(url, init).then(response => {
            const contentLength = Number(response.headers.get('content-length'));
            fileInfo.size = contentLength;
            let nLoaded = 0;
            if (!response.ok) {
                throw new Error(`The file download failed. type: '${response.type}', status: ${response.status}.`);
            }
            return new Response(new ReadableStream({
                start(controller) {
                    const reader = response.body.getReader();
                    read();
                    function read() {
                        reader.read()
                            .then((progressEvent) => {
                            if (progressEvent.done) {
                                controller.close();
                                return;
                            }
                            nLoaded += progressEvent.value.byteLength;
                            progress.updateProgress(Math.round(nLoaded / contentLength * 100));
                            controller.enqueue(progressEvent.value);
                            read();
                        });
                    }
                }
            }));
        });
        progress.done();
        return [fileInfo, await resp.blob()];
    }
    let progress = new ProgressControl(_refBookMan, "updateInstallProgress");
    let blobPackage;
    let fileInfo;
    try {
        [fileInfo, blobPackage] = await fetchBLOBAsync(uri, progress);
        fileInfo.name = book.displayName;
    }
    catch (err) {
        _refBookMan.invokeMethodAsync("informInstallError", Helper.extractMessage(err));
        return;
    }
    let bPermission = await _refBookMan.invokeMethodAsync("requestInstallStart", fileInfo);
    if (!bPermission)
        return;
    progress = new ProgressControl(_refBookMan, "updateInstallProgress");
    progress.setSegment(70);
    let internals = undefined;
    try {
        const file = new File([blobPackage], fileInfo.name, {
            type: blobPackage.type,
        });
        internals = await parser.parsePackageFile(file, progress);
        console.log("Получена структура internals!");
        progress.setSegment(30);
        const candidateRaw = new PackageRaw(fileInfo, internals, DeliveryMethod.Store, book, serviceUrl);
        if (!candidateRaw.isCorrect) {
            _refBookMan.invokeMethodAsync("informInstallError", candidateRaw.incorrectMessage);
            return;
        }
        let bPermission = await _refBookMan.invokeMethodAsync("requestInstallProcess", candidateRaw.getCase());
        if (!bPermission)
            return;
        const installed = await storePackage(candidateRaw, progress);
        setTimeout(() => {
            progress.done();
            _refBookMan.invokeMethodAsync("informInstallFinish", installed);
        }, 200);
    }
    catch (err) {
        _refBookMan.invokeMethodAsync("informInstallError", Helper.extractMessage(err));
        return;
    }
}
export async function uninstallPackage(packkey) {
    const token = await doUninstall(packkey);
    setTimeout(() => {
        _refBookMan.invokeMethodAsync("informUninstalled", token);
    }, 50);
}
export function beginLibraryInstall() {
    if (_inputLibrary)
        _inputLibrary.click();
}
export async function deleteLibrary(libtoken) {
    if (LibraryPool.hasLibrary(libtoken)) {
        throw new Error(`You cannot delete a library that is in use! (library: ${libtoken})`);
    }
    const deletedtoken = await uninstallLibrary(libtoken);
    return deletedtoken;
}
export async function initializeAsync(refBookMan) {
    _refBookMan = refBookMan;
}
//# sourceMappingURL=installer.js.map