import * as appdb from "./appdb.js";
import * as h5penv from "./render/h5penv.js";
import { BookCase } from "./datadefs/bookcase.js";
let _refBookMan;
function getRefCount(packId, aStoredShelves) {
    let nCount = 0;
    const regex = new RegExp(`PackageId=("|\')${packId}`);
    for (const recShelf of aStoredShelves) {
        if (regex.test(recShelf.data)) {
            nCount++;
        }
    }
    return nCount;
}
function getSuiteName(suitekey, aSiutes) {
    if (!suitekey)
        return "";
    const suite = aSiutes.find((item) => item.key === suitekey);
    return (suite) ? suite.name : "";
}
function makeBookInfo(recPackage, aStoredShelves, aSuites) {
    return {
        id: recPackage.id,
        origId: recPackage.origId,
        version: recPackage.version || "0.0.0",
        isPopup: recPackage.isPopup,
        name: recPackage.name,
        packtype: recPackage.packtype,
        sourceType: recPackage.sourceType,
        sourceUrl: recPackage.sourceUrl,
        suiteid: recPackage.suiteid,
        suitename: getSuiteName(recPackage.suiteid, aSuites),
        filename: recPackage.fileinfo.fullname,
        filesize: recPackage.fileinfo.size,
        modified: recPackage.fileinfo.modified,
        installed: recPackage.installed,
        updated: recPackage.updated,
        isBroken: recPackage.isBroken,
        brokeninfo: recPackage.brokeninfo,
        refcount: getRefCount(recPackage.id, aStoredShelves)
    };
}
export async function fetchBookInfoList() {
    return new Promise(async (resolve, reject) => {
        try {
            let db = await appdb.useDB();
            const aShelves = await appdb.getAllFrom(db, "shelves");
            const aSuites = (await appdb.getAllFrom(db, "suites")).map(r => r);
            let transPackages = db.transaction("packs", "readonly");
            let storePackages = transPackages.objectStore("packs");
            const aResult = [];
            storePackages.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const recPackage = cursor.value;
                    const packitem = makeBookInfo(recPackage, aShelves, aSuites);
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
    });
}
export async function fetchBookInfo(packId) {
    let db = await appdb.useDB();
    let bookInfo = null;
    const recPackage = await appdb.getFrom(db, "packs", packId);
    if (recPackage) {
        const aShelves = await appdb.getAllFrom(db, "shelves");
        const aSuites = (await appdb.getAllFrom(db, "suites")).map(r => r);
        bookInfo = makeBookInfo(recPackage, aShelves, aSuites);
    }
    appdb.releaseDB();
    return bookInfo;
}
export async function fetchBookCases() {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await appdb.useDB();
            let transPackages = adb.transaction("packs", "readonly");
            let storePackages = transPackages.objectStore("packs");
            const aResult = [];
            storePackages.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const recPackage = cursor.value;
                    const bookCase = new BookCase(recPackage);
                    aResult.push(bookCase);
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
export async function hasBookAnnotation(packId) {
    const packext = await appdb.get("packext", packId);
    return packext.annotation ? true : false;
}
export async function fetchBookAnnotation(packId) {
    const packext = await appdb.get("packext", packId);
    return packext.annotation || "";
}
export async function fetchBookCover(bookId) {
    const packext = await appdb.get("packext", bookId);
    return packext.cover || "";
}
export async function getBookOverviewPrompt(bookId) {
    const packext = await appdb.get("packext", bookId);
    return { hasOverview: !!packext.annotation, cover: packext.cover };
}
export async function fetchLibraryList() {
    return new Promise(async (resolve, reject) => {
        function __updateRefs(aDependencies, bPackage) {
            if (aDependencies && aDependencies.length > 0) {
                aDependencies.forEach((item) => {
                    const libtok = h5penv.makeLibraryToken(item);
                    if (!mapLibRefs.has(libtok)) {
                        mapLibRefs.set(libtok, { packrefs: 0, librefs: 0 });
                    }
                    const refsinfo = mapLibRefs.get(libtok);
                    if (bPackage) {
                        refsinfo.packrefs = refsinfo.packrefs + 1;
                    }
                    else {
                        refsinfo.librefs = refsinfo.librefs + 1;
                    }
                    mapLibRefs.set(libtok, refsinfo);
                });
            }
        }
        const mapLibRefs = new Map();
        try {
            let adb = await appdb.useDB();
            const aResult = [];
            const aPackages = await appdb.getAll("packs");
            aPackages.forEach((itemPack) => {
                __updateRefs(itemPack.metadata.preloadedDependencies, true);
            });
            let transLibraries = adb.transaction("libs", "readonly");
            let storeLibraries = transLibraries.objectStore("libs");
            storeLibraries.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const recLibrary = cursor.value;
                    const item = {};
                    item.libtoken = cursor.key.toString();
                    item.image = h5penv.getContentTypeImage(recLibrary.metadata.machineName);
                    item.version = `${recLibrary.metadata.majorVersion}.${recLibrary.metadata.minorVersion}.${recLibrary.metadata.patchVersion}`;
                    item.title = recLibrary.metadata.title;
                    item.license = recLibrary.metadata.license || "";
                    item.author = recLibrary.metadata.author || "";
                    item.description = recLibrary.metadata.description || "";
                    item.fullscreen = (recLibrary.metadata.fullscreen == true);
                    item.isAddon = recLibrary.isAddon == true;
                    item.packrefs = 0;
                    item.librefs = 0;
                    __updateRefs(recLibrary.metadata.preloadedDependencies, false);
                    aResult.push(item);
                    cursor.continue();
                }
                else {
                    appdb.releaseDB();
                    aResult.forEach((libitem) => {
                        if (mapLibRefs.has(libitem.libtoken)) {
                            const refsinfo = mapLibRefs.get(libitem.libtoken);
                            libitem.packrefs = refsinfo.packrefs;
                            libitem.librefs = refsinfo.librefs;
                        }
                    });
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
export async function hasPackageRefs(packId, userIdExclude = null) {
    const regex = new RegExp(`PackageId=("|\')${packId}`);
    var aShelfContentSet = await appdb.getAll("shelves");
    for (let i = 0; i < aShelfContentSet.length; i++) {
        const recShelf = aShelfContentSet[i];
        if (!userIdExclude || recShelf.userId != userIdExclude) {
            if (regex.test(recShelf.data)) {
                return true;
            }
        }
    }
    return false;
}
export async function findPackageByFile(criteria) {
    return new Promise(async (resolve, reject) => {
        try {
            let adb = await appdb.useDB();
            let transaction = adb.transaction("packs", "readonly");
            let store = transaction.objectStore("packs");
            store.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const pack = cursor.value;
                    if (pack.fileinfo.name === criteria.filename && pack.fileinfo.size === criteria.filesize && pack.fileinfo.modified) {
                        const bookCase = new BookCase(pack);
                        resolve(bookCase);
                        return;
                    }
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
export async function initializeAsync(refBookMan) {
    _refBookMan = refBookMan;
    await h5penv.initializeAsync(_refBookMan);
}
//# sourceMappingURL=manager.js.map