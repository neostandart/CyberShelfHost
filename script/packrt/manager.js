import { Helper } from "../helper.js";
import { AppDB } from "../appdb.js";
import * as parser from "./parse/parser.js";
import { H5PEnv } from "./h5penv.js";
import { PackagePool, ActivePackage } from "./active/activepack.js";
import { LibraryPool } from "./active/activelib.js";
import { ProgressControl } from "../bridge.js";
let _inputPackage;
let _inputLibrary;
let _hteFrameHost;
//
//
export const LocaleStrings = new Map();
export async function initializeAsync(objUserSettings) {
    await H5PEnv.initializeAsync(objUserSettings);
}
export async function attachFrameHost(hteFrameHost) {
    _hteFrameHost = hteFrameHost;
    //
    const alocaleKeys = ["W_width", "W_height", "W_position"];
    const mapSrc = await window.DotNet.invokeMethodAsync("CyberShelf", "getLocaleStrings", alocaleKeys);
    for (const key in mapSrc) {
        LocaleStrings.set(key, mapSrc[key]);
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
export function beginInstall() {
    if (_inputPackage) {
        _inputPackage.click();
    }
}
export function isPackageOpened(packkey) {
    return PackagePool.hasPackage(packkey);
}
export async function openPackage(packkey, user) {
    let pack = PackagePool.getPackage(packkey);
    if (pack) {
        if (pack.wnd.isMinimized) {
            pack.wnd.restore();
        }
    }
    else {
        pack = new ActivePackage(packkey, _hteFrameHost);
        await pack.showAsync();
    }
    //
    return pack;
}
export function closePackage(packkey) {
    const pack = PackagePool.getPackage(packkey);
    if (pack) {
        pack.dispose();
    }
}
export function minimizePackage(packkey) {
    const pack = PackagePool.getPackage(packkey);
    if (pack) {
        pack.wnd.minimize();
    }
}
export function restorePackage(packkey) {
    const pack = PackagePool.getPackage(packkey);
    if (pack) {
        pack.wnd.restore();
    }
}
export function raiseTop(packkey) {
    const pack = PackagePool.getPackage(packkey);
    if (pack) {
        pack.wnd.raiseTop();
    }
}
export function minimizeAll() {
    const aPackages = PackagePool.getAllActivePackages();
    for (let i = 0; i < aPackages.length; i++) {
        aPackages[i].wnd.minimize();
    }
}
export function restoreAll() {
    const aPackages = PackagePool.getAllActivePackages();
    for (let i = 0; i < aPackages.length; i++) {
        aPackages[i].wnd.restore();
    }
}
export async function uninstallPackage(packkey) {
    const token = await uninstall(packkey);
    //
    setTimeout(() => {
        window.DotNet.invokeMethodAsync("CyberShelf", "informUninstalled", token);
    }, 10);
}
export async function deleteLibrary(libtoken) {
    if (LibraryPool.hasLibrary(libtoken)) {
        throw new Error(`You cannot delete a library that is in use! (library: ${libtoken})`);
    }
    //
    const deletedtoken = await uninstallLibrary(libtoken);
    return deletedtoken;
}
export async function fetchPackageList() {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await AppDB.useDB();
            //
            const aStoredShelves = await AppDB.getAll("shelves");
            const aSuites = (await AppDB.getAll("suites")).map(r => r);
            //
            let transPackages = adb.transaction("packages", "readonly");
            let storePackages = transPackages.objectStore("packages");
            //
            const aResult = [];
            //
            storePackages.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const recPackage = cursor.value;
                    const packitem = {
                        key: recPackage.key,
                        url: recPackage.url || "",
                        origfrom: recPackage.origfrom || "",
                        //
                        suitename: __getSuiteName(recPackage.suitekey, aSuites),
                        //
                        guid: recPackage.guid || "",
                        name: recPackage.name,
                        shortname: recPackage.shortname || "",
                        version: recPackage.version || "",
                        //
                        filename: recPackage.filename || "",
                        modified: recPackage.modified,
                        installed: recPackage.installed,
                        updated: recPackage.updated,
                        //
                        refcount: __getRefCount(recPackage.key, aStoredShelves),
                        //
                        isBroken: recPackage.isBroken,
                        brokeninfo: recPackage.brokeninfo || "",
                        isOpened: PackagePool.hasPackage(recPackage.key)
                    };
                    aResult.push(packitem);
                    //
                    cursor.continue();
                }
                else {
                    AppDB.releaseDB();
                    resolve(aResult);
                }
            };
        }
        catch (err) {
            AppDB.releaseDB();
            reject(err);
        }
        // inline functions
        function __getRefCount(packkey, aStoredShelves) {
            let nCount = 0;
            //
            const regex = new RegExp(`PackageKey=("|\')${packkey}`);
            for (const recShelf of aStoredShelves) {
                if (regex.test(recShelf.data)) {
                    nCount++;
                }
            }
            //
            return nCount;
        }
        function __getSuiteName(suitekey, aSiutes) {
            if (!suitekey)
                return "";
            //
            const suite = aSiutes.find((item) => item.key === suitekey);
            return (suite) ? suite.name : "";
        }
    });
}
export async function fetchPackageTokens() {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await AppDB.useDB();
            let transPackages = adb.transaction("packages", "readonly");
            let storePackages = transPackages.objectStore("packages");
            //
            const aResult = [];
            //
            storePackages.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const recPackage = cursor.value;
                    const packtok = AppDB.makeTokenFromRecord(recPackage);
                    //
                    aResult.push(packtok);
                    cursor.continue();
                }
                else {
                    AppDB.releaseDB();
                    resolve(aResult);
                }
            };
        }
        catch (err) {
            AppDB.releaseDB();
            reject(err);
        }
    });
}
export async function fetchLibraryList() {
    return new Promise(async (resolve, reject) => {
        const mapLibRefs = new Map();
        try {
            const aResult = [];
            //
            let adb = await AppDB.useDB();
            //
            const aPackages = await AppDB.getAll("packages");
            aPackages.forEach((itemPack) => {
                __updateRefs(itemPack.metadata.preloadedDependencies, true);
            });
            //
            let transLibraries = adb.transaction("libs", "readonly");
            let storeLibraries = transLibraries.objectStore("libs");
            //
            storeLibraries.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const recLibrary = cursor.value;
                    const item = {};
                    //
                    item.libtoken = cursor.key.toString();
                    item.image = H5PEnv.getContentTypeImage(recLibrary.metadata.machineName);
                    item.version = `${recLibrary.metadata.majorVersion}.${recLibrary.metadata.minorVersion}.${recLibrary.metadata.patchVersion}`;
                    item.title = recLibrary.metadata.title;
                    item.license = recLibrary.metadata.license || "";
                    item.author = recLibrary.metadata.author || "";
                    item.description = recLibrary.metadata.description || "";
                    //
                    item.fullscreen = (recLibrary.metadata.fullscreen == true);
                    //
                    item.isAddon = recLibrary.isAddon == true;
                    //
                    item.packrefs = 0;
                    item.librefs = 0;
                    //
                    __updateRefs(recLibrary.metadata.preloadedDependencies, false);
                    //
                    aResult.push(item);
                    cursor.continue();
                }
                else {
                    AppDB.releaseDB();
                    //
                    aResult.forEach((libitem) => {
                        if (mapLibRefs.has(libitem.libtoken)) {
                            const refsinfo = mapLibRefs.get(libitem.libtoken);
                            libitem.packrefs = refsinfo.packrefs;
                            libitem.librefs = refsinfo.librefs;
                        }
                    });
                    //
                    resolve(aResult);
                }
            };
        }
        catch (err) {
            AppDB.releaseDB();
            reject(err);
        }
        // inline
        function __updateRefs(aDependencies, bPackage) {
            if (aDependencies && aDependencies.length > 0) {
                aDependencies.forEach((item) => {
                    const libtok = H5PEnv.makeLibraryToken(item);
                    if (!mapLibRefs.has(libtok)) {
                        mapLibRefs.set(libtok, { packrefs: 0, librefs: 0 });
                    }
                    //
                    const refsinfo = mapLibRefs.get(libtok);
                    if (bPackage) {
                        refsinfo.packrefs = refsinfo.packrefs + 1;
                    }
                    else {
                        refsinfo.librefs = refsinfo.librefs + 1;
                    }
                    //
                    mapLibRefs.set(libtok, refsinfo);
                });
            }
        }
    });
}
//
//
export function beginLibraryInstall() {
    if (_inputLibrary) {
        _inputLibrary.click();
    }
}
//
// Internals
//
async function onInputPackageChange() {
    try {
        const objProgress = new ProgressControl("CyberShelf", "updateInstallProgress");
        //
        if (_inputPackage.files.length >= 1) {
            const filePackage = _inputPackage.files[0];
            //
            const filetoken = { name: filePackage.name, size: filePackage.size, type: filePackage.type, modified: filePackage.lastModified };
            let bPermission = await window.DotNet.invokeMethodAsync("CyberShelf", "requestParsing", filetoken);
            //
            if (bPermission) {
                objProgress.setSegment(70);
                const parsed = await parser.parsePackageFile(filePackage, objProgress);
                const packref = { key: parsed.package.key, guid: parsed.package.guid, name: parsed.package.name, filename: parsed.package.filename, version: parsed.package.version };
                bPermission = await window.DotNet.invokeMethodAsync("CyberShelf", "requestInstall", packref);
                if (bPermission) {
                    objProgress.setSegment(30);
                    packref.key = await saveNewPackage(parsed, objProgress);
                    setTimeout(() => {
                        window.DotNet.invokeMethodAsync("CyberShelf", "informInstallFinish", packref);
                    }, 300);
                }
            } // if (bPermission)
        }
    }
    catch (err) {
        window.DotNet.invokeMethodAsync("CyberShelf", "informInstallError", Helper.extractMessage(err));
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
                await AppDB.put("libs", parsed.library, parsed.library.token);
                await AppDB.put("libfiles", parsed.files, parsed.library.token);
                const libtok = { key: parsed.library.token, title: parsed.library.metadata.title, version: parsed.library.version };
                //
                window.DotNet.invokeMethodAsync("CyberShelf", "informLibInstallFinish", libtok);
            } // if (bPermission)
        }
    }
    catch (err) {
        window.DotNet.invokeMethodAsync("CyberShelf", "informLibInstallError", Helper.extractMessage(err));
    }
}
async function saveNewPackage(parsed, progress) {
    //
    // Saving prepared data in the database (libraries & content)
    //
    let database = null;
    let transaction = null;
    try {
        progress.setStepMax(parsed.libs.size + 1);
        const nNewPackKey = await AppDB.getNextAutoKey("packages");
        database = await AppDB.useDB();
        transaction = database.transaction(["libs", "libfiles", "packages", "content"], "readwrite");
        transaction.onerror = _onTransError;
        transaction.oncomplete = _onTransComplete;
        // Новые библиотеки сохраняем в базе данных используя для этого два хранилища:
        // первое содержит основные данные, второе — файлы.
        for (const [token, newlib] of parsed.libs) {
            const files = newlib.files;
            newlib.files = undefined;
            //
            let storeLibs = transaction.objectStore("libs");
            storeLibs.put(newlib, token);
            //
            const objLibFiles = { libtoken: token, files: files };
            let storeLibFiles = transaction.objectStore("libfiles");
            storeLibFiles.put(objLibFiles, token);
            progress.doStep();
        }
        // Сохраняем в базе данных запись установленного пакета
        let storePack = transaction.objectStore("packages");
        parsed.package.key = `pack-${nNewPackKey}`;
        storePack.put(parsed.package, parsed.package.key);
        // Связанная по packtoken запись содержащая файлы контента
        parsed.content.ownerkey = parsed.package.key;
        let storeContent = transaction.objectStore("content");
        storeContent.put(parsed.content, parsed.content.ownerkey);
        progress.doStep();
        //
        transaction.commit();
        // Конец сохранения нового пакета
        progress.doStep(); // для верности...
        // PackageRef будет передан на уровень UI
        return parsed.package.key;
    }
    catch (err) {
        // Установка H5P пакета завершилась неудачно :-(
        _abortTransaction();
        //
        throw err;
    }
    finally {
        AppDB.releaseDB();
    }
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
} // saveNewData
async function uninstall(packkey) {
    //
    const pack = await AppDB.get("packages", packkey);
    if (!pack) {
        throw new Error(`The package for uninstall (${packkey}) was not found!`);
    }
    //
    const token = AppDB.makeTokenFromRecord(pack);
    //
    const aDependencies = pack.dependencies;
    const setBeingDeleted = new Set();
    const aAllPacks = await AppDB.getAll("packages");
    const nIndex = aAllPacks.findIndex((packCurrent) => packCurrent.key === packkey);
    aAllPacks.splice(nIndex, 1);
    for (const tokenDepLib of aDependencies) {
        //
        const bOtherRefs = _testOtherRefs(tokenDepLib);
        if (!bOtherRefs)
            setBeingDeleted.add(tokenDepLib);
    }
    // A list of dependent libraries for which there are no other references has been prepared. You can start deleting.
    let database = null;
    let transaction = null;
    try {
        database = await AppDB.useDB();
        transaction = database.transaction(["libs", "libfiles", "packages", "content"], "readwrite");
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
        //
        transaction.commit();
        // The package has been deleted from the database.
        return token;
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
} // uninstall
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
