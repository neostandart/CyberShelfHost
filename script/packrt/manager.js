import { AppDB } from "../appdb.js";
import * as H5PEnv from "./h5penv.js";
import { PackagePool, ActivePackage } from "./active/activepack.js";
import { PackageCase } from "./packobj/packcase.js";
let _hteFrameHost;
export const LocaleStrings = new Map();
export async function initializeAsync() {
    await H5PEnv.initializeAsync();
}
export async function attachFrameHost(hteFrameHost) {
    _hteFrameHost = hteFrameHost;
    //
    const alocaleKeys = ["W_width", "W_height", "W_position"];
    const mapSrc = await H5PEnv.DotNet.invokeMethodAsync("CyberShelf", "getLocaleStrings", alocaleKeys);
    for (const key in mapSrc) {
        LocaleStrings.set(key, mapSrc[key]);
    }
}
export function isPackageOpened(packid) {
    return PackagePool.hasPackage(packid);
}
export async function openPackage(packid, user) {
    let pack = PackagePool.getPackage(packid);
    if (pack) {
        if (pack.wnd.isMinimized) {
            pack.wnd.restore();
        }
    }
    else {
        pack = new ActivePackage(packid, _hteFrameHost);
        await pack.showAsync();
    }
    //
    return pack;
}
export function closePackage(packid) {
    const pack = PackagePool.getPackage(packid);
    if (pack) {
        pack.dispose();
    }
}
export function minimizePackage(packid) {
    const pack = PackagePool.getPackage(packid);
    if (pack) {
        pack.wnd.minimize();
    }
}
export function restorePackage(packid) {
    const pack = PackagePool.getPackage(packid);
    if (pack) {
        pack.wnd.restore();
    }
}
export function raiseTop(packid) {
    const pack = PackagePool.getPackage(packid);
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
export async function closeAll() {
    const aClosedIds = await PackagePool.closeAllPackages();
    // here (for now) the result of the "PackagePool.closeAllPackages" method is not used.
}
export function restoreAll() {
    const aPackages = PackagePool.getAllActivePackages();
    for (let i = 0; i < aPackages.length; i++) {
        aPackages[i].wnd.restore();
    }
}
///** @deprecated */
//export async function deleteLibrary(libtoken: string): Promise<string> {
//    if (LibraryPool.hasLibrary(libtoken)) {
//        throw new Error(`You cannot delete a library that is in use! (library: ${libtoken})`);
//    }
//    //
//    const deletedtoken = await uninstallLibrary(libtoken);
//    return deletedtoken;
//}
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
                        id: recPackage.id,
                        origId: recPackage.origId,
                        version: recPackage.version || "0.0.0",
                        name: recPackage.name,
                        //
                        packtype: recPackage.packtype,
                        delivery: recPackage.delivery,
                        origurl: recPackage.origurl,
                        //
                        suiteid: recPackage.suiteid,
                        suitename: __getSuiteName(recPackage.suiteid, aSuites),
                        //
                        filename: recPackage.fileinfo.fullname,
                        filesize: recPackage.fileinfo.size,
                        modified: recPackage.fileinfo.modified,
                        installed: recPackage.installed,
                        updated: recPackage.updated,
                        //
                        isBroken: recPackage.isBroken,
                        brokeninfo: recPackage.brokeninfo,
                        //
                        refcount: __getRefCount(recPackage.id, aStoredShelves),
                        isOpened: PackagePool.hasPackage(recPackage.id)
                    };
                    //
                    aResult.push(packitem);
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
        function __getRefCount(packid, aStoredShelves) {
            let nCount = 0;
            //
            const regex = new RegExp(`PackageId=("|\')${packid}`);
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
export async function fetchPackageCases() {
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
                    const packcase = new PackageCase(recPackage);
                    //
                    aResult.push(packcase);
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
export async function hasPackageRefs(packid, useridExclude = null) {
    const regex = new RegExp(`PackageId=("|\')${packid}`);
    //
    var aShelfContentSet = await AppDB.getAll("shelves");
    for (let i = 0; i < aShelfContentSet.length; i++) {
        const recShelf = aShelfContentSet[i];
        if (!useridExclude || recShelf.userid != useridExclude) {
            if (regex.test(recShelf.data)) {
                return true;
            }
        }
    }
    //
    return false;
}
export async function findPackageRefs(packid, useridExclude = null) {
    const regex = new RegExp(`PackageId=("|\')${packid}`);
    //
    const aUserKeys = [];
    //
    const aShelfContentSet = await AppDB.getAll("shelves");
    for (let i = 0; i < aShelfContentSet.length; i++) {
        const recShelf = aShelfContentSet[i];
        if (!useridExclude || recShelf.userid != useridExclude) {
            if (regex.test(recShelf.data)) {
                aUserKeys.push(recShelf.userid);
            }
        }
    }
    //
    let users = await AppDB.getByKeys("users", aUserKeys);
    //
    return users;
}
export async function findPackageByFile(criteria) {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await AppDB.useDB();
            let transaction = adb.transaction("packages", "readonly");
            let store = transaction.objectStore("packages");
            //
            store.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const pack = cursor.value;
                    if (pack.fileinfo.name === criteria.filename && pack.fileinfo.size === criteria.filesize && pack.fileinfo.modified) {
                        const packcase = new PackageCase(pack);
                        resolve(packcase);
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
//
//
///** @deprecated */
//export function beginLibraryInstall(): void {
//    if (_inputLibrary) {
//        _inputLibrary.click();
//    }
//}
//
// Internals
//
///** @deprecated */
//async function onInputLibraryChange(): Promise<void> {
//    try {
//        if (_inputLibrary!.files!.length >= 1) {
//            const fileLibrary: File = _inputLibrary!.files![0];
//            const filetoken = { name: fileLibrary.name, size: fileLibrary.size, type: fileLibrary.type, modified: fileLibrary.lastModified };
//            let bPermission = await (<TObject>window).DotNet.invokeMethodAsync("CyberShelf", "requestLibInstall", filetoken);
//            if (bPermission) {
//                const parsed = await parser.parseLibraryFile(fileLibrary);
//                await AppDB.put("libs", parsed.library, parsed.library.token);
//                await AppDB.put("libfiles", parsed.files, parsed.library.token);
//                const libtok = <LibraryToken>{ key: parsed.library.token, title: parsed.library.metadata.title, version: parsed.library.version };
//                //
//                (<TObject>window).DotNet.invokeMethodAsync("CyberShelf", "informLibInstallFinish", libtok);
//            } // if (bPermission)
//        }
//    } catch (err) {
//        (<TObject>window).DotNet.invokeMethodAsync("CyberShelf", "informLibInstallError", Helper.extractMessage(err));
//    }
//}
///** @deprecated */
//async function uninstall(packkey: string): Promise<PackageToken> {
//    //
//    const pack = <StoredPackage>await AppDB.get("packages", packkey);
//    if (!pack) {
//        throw new Error(`The package for uninstall (${packkey}) was not found!`);
//    }
//    //
//    const token = AppDB.makeTokenFromRecord(pack);
//    //
//    const aDependencies: string[] = pack.dependencies;
//    const setBeingDeleted: Set<string> = new Set<string>();
//    const aAllPacks: StoredPackage[] = <StoredPackage[]>await AppDB.getAll("packages");
//    const nIndex = aAllPacks.findIndex((packCurrent) => packCurrent.id === packkey);
//    aAllPacks.splice(nIndex, 1);
//    for (const tokenDepLib of aDependencies) {
//        //
//        const bOtherRefs = _testOtherRefs(tokenDepLib);
//        if (!bOtherRefs) setBeingDeleted.add(tokenDepLib);
//    }
//    //
//    const aCachedDataKeys: string[] = await AppDB.getKeysByIndex("wincache", "pack_idx", packkey);
//    // A list of dependent libraries for which there are no other references has been prepared. You can start deleting.
//    let database: IDBDatabase | null = null;
//    let transaction: IDBTransaction | null = null;
//    try {
//        database = await AppDB.useDB();
//        transaction = database.transaction(["libs", "libfiles", "packages", "content", "wincache"], "readwrite");
//        transaction.onerror = _onTransError;
//        transaction.oncomplete = _onTransComplete;
//        //
//        //
//        let storeLibs = transaction.objectStore("libs");
//        let storeLibFiles = transaction.objectStore("libfiles");
//        for (const tokDelLib of setBeingDeleted) {
//            storeLibs.delete(tokDelLib);
//            storeLibFiles.delete(tokDelLib);
//        }
//        //
//        let storePack = transaction.objectStore("packages");
//        storePack.delete(packkey);
//        //
//        let storeContent = transaction.objectStore("content");
//        storeContent.delete(packkey);
//        //
//        const storeWincache = transaction.objectStore("wincache");
//        for (const strCachedKey of aCachedDataKeys) {
//            storeWincache.delete(strCachedKey);
//        }
//        //
//        transaction.commit();
//        // The package has been deleted from the database.
//        return token;
//    } catch (err: any) {
//        _abortTransaction();
//        throw err;
//    }
//    finally {
//        AppDB.releaseDB();
//    }
//    // inline
//    function _testOtherRefs(theLibToken: string): boolean {
//        for (const packOther of aAllPacks) {
//            if (packOther.dependencies.indexOf(theLibToken) >= 0)
//                return true;
//        }
//        //
//        return false;
//    }
//    function _onTransComplete(ev: Event): void {
//        transaction = null;
//    }
//    function _onTransError(ev: Event): void {
//        let msg: string = ((<any>ev).srcElement) ? (<any>ev).srcElement : ev;
//        console.error(`An error occurred while writing data to the application database: ${msg}.`);
//        _abortTransaction();
//    }
//    function _abortTransaction(): void {
//        if (transaction) {
//            let transForAbort = transaction;
//            transaction = null;
//            try { transForAbort.abort(); } catch (err) { };
//        }
//    }
//} // uninstall
///** @deprecated */
//async function uninstallLibrary(libtoken: string): Promise<string | null> {
//    let database: IDBDatabase | null = null;
//    let transaction: IDBTransaction | null = null;
//    //
//    try {
//        database = await AppDB.useDB();
//        //
//        transaction = database.transaction(["libs", "libfiles"], "readwrite");
//        let storeLibs = transaction.objectStore("libs");
//        let storeLibFiles = transaction.objectStore("libfiles");
//        //
//        storeLibs.delete(libtoken);
//        storeLibFiles.delete(libtoken);
//        //
//        transaction.commit();
//        //
//        return libtoken;
//    }
//    catch (err) {
//        if (transaction) {
//            try { transaction.abort(); } catch (errTrans) { console.error(errTrans); }
//        }
//        //
//        return null;
//    }
//    finally {
//        AppDB.releaseDB();
//    }
//}
//# sourceMappingURL=manager.js.map