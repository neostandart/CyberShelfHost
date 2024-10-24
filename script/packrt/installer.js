import { Helper } from "../helper.js";
import { DeliveryMethod, LearningPackType } from "./abstraction.js";
import { AppDB } from "../appdb.js";
import * as parser from "./parser.js";
import { ProgressControl } from "../progress.js";
import { PackageRaw } from "./packobj/packraw.js";
import { PackageCase } from "./packobj/packcase.js";
import { LibraryPool } from "./active/activelib.js";
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
    /*
        We believe that in case of any error, the transaction will be canceled and the incorrect data will not be saved in AppDB.
        But this situation has not been tested yet.
    */
    try {
        progress.setStepMax(packraw.newlibs.size + 3);
        //
        database = await AppDB.useDB();
        transaction = database.transaction(["libs", "libfiles", "packages", "content"], "readwrite");
        transaction.onerror = _onTransError;
        transaction.oncomplete = _onTransComplete;
        //
        // We save the new libraries in the database using two DBObjectStore(s) (libs & libfiles) for this purpose: 
        // the first contains the main data, the second contains files.
        for (const [token, newlib] of packraw.newlibs) {
            const files = newlib.files;
            newlib.files = undefined;
            //
            let storeLibs = transaction.objectStore("libs");
            storeLibs.put(newlib, token);
            //
            const objLibFiles = { libtoken: token, files: files };
            let storeLibFiles = transaction.objectStore("libfiles");
            storeLibFiles.put(objLibFiles, token);
            //
            progress.doStep();
        }
        // We save an entry in the database with the main properties of the installed package
        let storePackages = transaction.objectStore("packages");
        storePackages.put(packraw.stored, packraw.stored.id);
        progress.doStep(); // Additional step 1
        // The linked (by Package ID) record containing content files
        let storeContent = transaction.objectStore("content");
        storeContent.put(packraw.content, packraw.stored.id);
        progress.doStep(); // Additional step 2
        // End of saving a new package
        transaction.commit();
    }
    catch (err) {
        // Installation of the H5P package failed :-(
        _abortTransaction();
        throw err;
    }
    finally {
        AppDB.releaseDB();
    }
    progress.doStep(); // Additional step 3
    return packraw.getCase();
    //
    // inline
    //
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
            ; // try/catch - reinsurance :-)
        }
    }
} // saveNewPackage
async function doUninstall(packkey) {
    //
    const pack = await AppDB.get("packages", packkey);
    if (!pack) {
        throw new Error(`The package for uninstall (${packkey}) was not found!`);
    }
    //
    const packcase = new PackageCase(pack);
    //
    const aDependencies = pack.dependencies;
    const setBeingDeleted = new Set();
    const aAllPacks = await AppDB.getAll("packages");
    const nIndex = aAllPacks.findIndex((packCurrent) => packCurrent.id === packkey);
    aAllPacks.splice(nIndex, 1);
    for (const tokenDepLib of aDependencies) {
        //
        const bOtherRefs = _testOtherRefs(tokenDepLib);
        if (!bOtherRefs)
            setBeingDeleted.add(tokenDepLib);
    }
    //
    const aCachedDataKeys = await AppDB.getKeysByIndex("wincache", "pack_idx", packkey);
    // A list of dependent libraries for which there are no other references has been prepared. You can start deleting.
    let database = null;
    let transaction = null;
    try {
        database = await AppDB.useDB();
        transaction = database.transaction(["libs", "libfiles", "packages", "content", "wincache"], "readwrite");
        transaction.onerror = _onTransError;
        transaction.oncomplete = _onTransComplete;
        let storeLibs = transaction.objectStore("libs");
        let storeLibFiles = transaction.objectStore("libfiles");
        for (const tokDelLib of setBeingDeleted) {
            storeLibs.delete(tokDelLib);
            storeLibFiles.delete(tokDelLib);
        }
        let storePack = transaction.objectStore("packages");
        storePack.delete(packkey);
        //
        let storeContent = transaction.objectStore("content");
        storeContent.delete(packkey);
        const storeWincache = transaction.objectStore("wincache");
        for (const cachedKey of aCachedDataKeys) {
            storeWincache.delete(cachedKey);
        }
        transaction.commit(); // The package has been deleted from the database.
        return packcase;
    }
    catch (err) {
        _abortTransaction();
        throw err;
    }
    finally {
        AppDB.releaseDB();
    }
    // inline
    function _testOtherRefs(theLibToken) {
        for (const packOther of aAllPacks) {
            if (packOther.dependencies.indexOf(theLibToken) >= 0)
                return true;
        }
        //
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
} // doUninstall
async function findUpdateCandidate(packNew) {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await AppDB.useDB();
            let transPackages = adb.transaction("packages", "readonly");
            let storePackages = transPackages.objectStore("packages");
            //
            let packStored = null;
            let bMatch = false;
            //
            storePackages.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const packCurrent = cursor.value;
                    //
                    if (packCurrent.packtype === LearningPackType.Regular) {
                        if (packNew.fileinfo.fullname === packCurrent.fileinfo.fullname) {
                            packStored = packCurrent;
                            bMatch = (packNew.fileinfo.size === packCurrent.fileinfo.size) && (packNew.fileinfo.modified === packCurrent.fileinfo.modified);
                        }
                    }
                    else {
                        if (packNew.id === packCurrent.id) {
                            packStored = packCurrent;
                            bMatch = Helper.isVersionEqual(packNew.version, packCurrent.version);
                        }
                    }
                    //
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
            AppDB.releaseDB();
        }
    });
}
// --------------------------------------------------------
async function uninstallLibrary(libtoken) {
    let database = null;
    let transaction = null;
    //
    try {
        database = await AppDB.useDB();
        //
        transaction = database.transaction(["libs", "libfiles"], "readwrite");
        let storeLibs = transaction.objectStore("libs");
        let storeLibFiles = transaction.objectStore("libfiles");
        //
        storeLibs.delete(libtoken);
        storeLibFiles.delete(libtoken);
        //
        transaction.commit();
        //
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
        //
        return null;
    }
    finally {
        AppDB.releaseDB();
    }
}
// --------------------------------------------------------
async function onInputPackageChange() {
    if (_inputPackage.files.length >= 1) { // !! so far, we are processing only one file
        const filePackage = _inputPackage.files[0];
        //
        const fileinfo = { fullname: filePackage.name, name: Helper.extractFileName(filePackage.name), extension: Helper.extractExtension(filePackage.name), size: filePackage.size, modified: filePackage.lastModified };
        let bPermission = await _refBookMan.invokeMethodAsync("requestInstallStart", fileinfo);
        if (bPermission) {
            const progress = new ProgressControl(_refBookMan, "updateInstallProgress");
            //
            progress.setSegment(70);
            let internals = undefined;
            try {
                internals = await parser.parsePackageFile(filePackage, progress);
            }
            catch (err) {
                _refBookMan.invokeMethodAsync("informInstallError", Helper.extractMessage(err));
                return;
            }
            //
            progress.setSegment(30);
            const candidateRaw = new PackageRaw(fileinfo, internals, DeliveryMethod.Local, "");
            if (!candidateRaw.isCorrect) {
                _refBookMan.invokeMethodAsync("informInstallError", candidateRaw.incorrectMessage);
                return;
            }
            //
            let [existing, bMatch] = await findUpdateCandidate(candidateRaw.stored);
            try {
                let installed = null;
                if (existing) {
                    // Requesting permission to update
                    let answer = await _refBookMan.invokeMethodAsync("requestPackUpdate", candidateRaw.getCase(), new PackageCase(existing), bMatch);
                    switch (answer) {
                        case UpgradeAnswer.Yes: {
                            if (candidateRaw.isRegular) {
                                candidateRaw.changeId(existing.id);
                            }
                            //
                            candidateRaw.setUpdatedTimestamp(Date.now());
                            installed = await storePackage(candidateRaw, progress);
                            break;
                        }
                        case UpgradeAnswer.No: {
                            candidateRaw.makeUniqueName();
                            if (candidateRaw.isBook) {
                                candidateRaw.changeId("tmp-" + Helper.createDynamicID());
                            }
                            //
                            installed = await storePackage(candidateRaw, progress);
                            break;
                        }
                        default: {
                            break;
                        }
                    } // switch (actvar)
                }
                else {
                    // The new installation
                    let bPermission = await _refBookMan.invokeMethodAsync("requestInstallProcess", candidateRaw.getCase());
                    if (bPermission) {
                        installed = await storePackage(candidateRaw, progress);
                    }
                }
                //
                setTimeout(() => {
                    progress.done();
                    _refBookMan.invokeMethodAsync("informInstallFinish", installed);
                }, 200);
            }
            catch (err) {
                _refBookMan.invokeMethodAsync("informInstallError", Helper.extractMessage(err));
            }
        } // if (bPermission)
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
                await AppDB.put("libs", parsed.library, parsed.library.token);
                await AppDB.put("libfiles", parsed.files, parsed.library.token);
                const libtok = { key: parsed.library.token, title: parsed.library.metadata.title, version: parsed.library.version };
                _refBookMan.invokeMethodAsync("informLibInstallFinish", libtok);
            } // if (bPermission)
        }
    }
    catch (err) {
        _refBookMan.invokeMethodAsync("informLibInstallError", Helper.extractMessage(err));
    }
}
// --------------------------------------------------------
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
export async function uninstallPackage(packkey) {
    const token = await doUninstall(packkey);
    //
    setTimeout(() => {
        _refBookMan.invokeMethodAsync("informUninstalled", token);
    }, 50);
}
// --------------------------------------------------------
export function beginLibraryInstall() {
    if (_inputLibrary)
        _inputLibrary.click();
}
export async function deleteLibrary(libtoken) {
    if (LibraryPool.hasLibrary(libtoken)) {
        throw new Error(`You cannot delete a library that is in use! (library: ${libtoken})`);
    }
    //
    const deletedtoken = await uninstallLibrary(libtoken);
    return deletedtoken;
}
// --------------------------------------------------------
export async function initializeAsync(refBookMan) {
    _refBookMan = refBookMan;
}
//# sourceMappingURL=installer.js.map