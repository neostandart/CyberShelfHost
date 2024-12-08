import * as appdb from "../appdb.js";
import * as h5penv from "./h5penv.js";
import { PackagePool, ActivePackage } from "./active/activepack.js";
import { PackageCase } from "./packobj/packcase.js";
let _refBookMan;
let _hteFrameHost;
export const LocaleStrings = new Map();
export async function attachFrameHost(hteFrameHost) {
    _hteFrameHost = hteFrameHost;
    //
    const alocaleKeys = ["width", "height", "position"];
    const mapSrc = await h5penv.DotNet.invokeMethodAsync("CyberShelf", "getLocaleStrings", alocaleKeys);
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
export async function fetchPackageList() {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await appdb.useDB();
            //
            const aStoredShelves = await appdb.getAll("shelves");
            const aSuites = (await appdb.getAll("suites")).map(r => r);
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
                    appdb.releaseDB();
                    resolve(aResult);
                }
            };
        }
        catch (err) {
            appdb.releaseDB();
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
            let adb = await appdb.useDB();
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
                    appdb.releaseDB();
                    resolve(aResult);
                }
            };
        }
        catch (err) {
            appdb.releaseDB();
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
            let adb = await appdb.useDB();
            //
            const aPackages = await appdb.getAll("packages");
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
                    item.image = h5penv.getContentTypeImage(recLibrary.metadata.machineName);
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
                    appdb.releaseDB();
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
            appdb.releaseDB();
            reject(err);
        }
        // inline
        function __updateRefs(aDependencies, bPackage) {
            if (aDependencies && aDependencies.length > 0) {
                aDependencies.forEach((item) => {
                    const libtok = h5penv.makeLibraryToken(item);
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
    var aShelfContentSet = await appdb.getAll("shelves");
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
export async function findPackageByFile(criteria) {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await appdb.useDB();
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
            appdb.releaseDB();
        }
    });
}
// ----------------------------------------------------------------
export async function initializeAsync(refBookMan) {
    _refBookMan = refBookMan;
    await h5penv.initializeAsync(_refBookMan);
}
//# sourceMappingURL=manager.js.map