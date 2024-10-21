import { Helper } from "../helper.js";
import { DeliveryMethod, LearningPackType } from "./abstraction.js";
import { AppDB } from "../appdb.js";
import * as parser from "./parser.js";
import { ProgressControl } from "../progress.js";
import { PackageRaw } from "./packobj/packraw.js";
import { PackageCase } from "./packobj/packcase.js";
//#region Definitions
var UpgradeAnswer;
(function (UpgradeAnswer) {
    UpgradeAnswer[UpgradeAnswer["Yes"] = 0] = "Yes";
    UpgradeAnswer[UpgradeAnswer["No"] = 1] = "No";
    UpgradeAnswer[UpgradeAnswer["Cancel"] = 2] = "Cancel";
})(UpgradeAnswer || (UpgradeAnswer = {}));
//#endregion (Definitions)
//#region Constants and Variables
const DotNet = window.DotNet;
let _inputPackage;
let _inputLibrary;
//interface ICheckIncomingResult {
//    isCorrect: boolean;
//    message: string;
//}
//interface IFindForUpgradeResult {
//    package: IStoredPackage;
//    message: string;
//}
//#endregion (Constants and Variables)
//#region Internals
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
        // Новые библиотеки сохраняем в базе данных используя для этого два хранилища:
        // первое содержит основные данные, второе — файлы.
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
        // Сохраняем в базе данных запись установленного пакета
        let storePackages = transaction.objectStore("packages");
        storePackages.put(packraw.stored, packraw.stored.id);
        progress.doStep(); // Additional step 1
        // Связанная по package ID запись содержащая файлы контента
        let storeContent = transaction.objectStore("content");
        storeContent.put(packraw.content, packraw.stored.id);
        progress.doStep(); // Additional step 2
        // Конец сохранения нового пакета
        transaction.commit();
    }
    catch (err) {
        // Установка H5P пакета завершилась неудачно :-(
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
        //
        //
        let storeLibs = transaction.objectStore("libs");
        let storeLibFiles = transaction.objectStore("libfiles");
        for (const tokDelLib of setBeingDeleted) {
            storeLibs.delete(tokDelLib);
            storeLibFiles.delete(tokDelLib);
        }
        //
        let storePack = transaction.objectStore("packages");
        storePack.delete(packkey);
        //
        let storeContent = transaction.objectStore("content");
        storeContent.delete(packkey);
        //
        const storeWincache = transaction.objectStore("wincache");
        for (const cachedKey of aCachedDataKeys) {
            storeWincache.delete(cachedKey);
        }
        //
        transaction.commit();
        // The package has been deleted from the database.
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
                    if (packCurrent.packtype === LearningPackType.SimplePack) {
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
//#endregion (Internals)
//#region Handlers
async function onInputPackageChange() {
    if (_inputPackage.files.length >= 1) { // !! so far, we are processing only one file
        const filePackage = _inputPackage.files[0];
        //
        const fileinfo = { fullname: filePackage.name, name: Helper.extractFileName(filePackage.name), extension: Helper.extractExtension(filePackage.name), size: filePackage.size, modified: filePackage.lastModified };
        let bPermission = await DotNet.invokeMethodAsync("CyberShelf", "requestInstallStart", fileinfo);
        if (bPermission) {
            const progress = new ProgressControl("CyberShelf", "updateInstallProgress");
            //
            progress.setSegment(70);
            let internals = undefined;
            try {
                internals = await parser.parsePackageFile(filePackage, progress);
            }
            catch (err) {
                DotNet.invokeMethodAsync("CyberShelf", "informInstallError", Helper.extractMessage(err));
                return;
            }
            //
            progress.setSegment(30);
            const candidateRaw = new PackageRaw(fileinfo, internals, DeliveryMethod.Local, "");
            if (!candidateRaw.isCorrect) {
                DotNet.invokeMethodAsync("CyberShelf", "informInstallError", candidateRaw.incorrectMessage);
                return;
            }
            //
            let [existing, bMatch] = await findUpdateCandidate(candidateRaw.stored);
            try {
                let installed = null;
                if (existing) {
                    // Requesting permission to update
                    let answer = await DotNet.invokeMethodAsync("CyberShelf", "requestUpgrade", candidateRaw.getCase(), new PackageCase(existing), bMatch);
                    switch (answer) {
                        case UpgradeAnswer.Yes: {
                            if (candidateRaw.isSimplePack) {
                                candidateRaw.changeId(existing.id);
                            }
                            //
                            installed = await storePackage(candidateRaw, progress);
                            break;
                        }
                        case UpgradeAnswer.No: {
                            candidateRaw.makeUniqueName();
                            if (candidateRaw.isBook) {
                                candidateRaw.changeId(Helper.createDynamicID());
                            }
                            //
                            installed = await storePackage(candidateRaw, progress);
                            break;
                        }
                        default: {
                            break;
                        }
                    } // switch (actvar)
                    // делаем апгрейд
                }
                else {
                    // if the new installation
                    let bPermission = await DotNet.invokeMethodAsync("CyberShelf", "requestInstallProcess", candidateRaw.getCase());
                    if (bPermission) {
                        installed = await storePackage(candidateRaw, progress);
                    }
                }
                //
                setTimeout(() => {
                    progress.done();
                    window.DotNet.invokeMethodAsync("CyberShelf", "informInstallFinish", installed);
                }, 200);
            }
            catch (err) {
                DotNet.invokeMethodAsync("CyberShelf", "informInstallError", Helper.extractMessage(err));
            }
        } // if (bPermission)
    }
}
async function onInputLibraryChange() {
    try {
        if (_inputLibrary.files.length >= 1) {
            const fileLibrary = _inputLibrary.files[0];
            const filetoken = { name: fileLibrary.name, size: fileLibrary.size, type: fileLibrary.type, modified: fileLibrary.lastModified };
            let bPermission = await window.DotNet.invokeMethodAsync("CyberShelf", "requestLibInstall", filetoken);
            if (bPermission) {
                const parsed = await parser.parseLibraryFile(fileLibrary);
                // восстановить!!!
                //await AppDB.put("libs", parsed.library, parsed.library.token);
                //await AppDB.put("libfiles", parsed.files, parsed.library.token);
                //const libtok = <LibraryToken>{ key: parsed.library.token, title: parsed.library.metadata.title, version: parsed.library.version };
                //
                //(<TObject>window).DotNet.invokeMethodAsync("CyberShelf", "informLibInstallFinish", libtok);
            } // if (bPermission)
        }
    }
    catch (err) {
        DotNet.invokeMethodAsync("CyberShelf", "informLibInstallError", Helper.extractMessage(err));
    }
}
//#endregion (Handlers)
// --------------------------------------------------------
//#region Export
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
        DotNet.invokeMethodAsync("CyberShelf", "informUninstalled", token);
    }, 50);
}
//#endregion (Export)
// --------------------------------------------------------
//#region Initialization
export async function initializeAsync() {
}
//#endregion (Initialization)
//# sourceMappingURL=installer.js.map