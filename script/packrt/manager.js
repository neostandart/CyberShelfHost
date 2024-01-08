import { AppDB } from "../appdb.js";
import * as parser from "./parse/parser.js";
import { H5PEnv } from "./h5penv.js";
import { PackagePool, ActivePackage } from "./active/activepack.js";
let _inputElement;
let _hteFrameHost;
export function attachFrameHost(hteFrameHost) {
    _hteFrameHost = hteFrameHost;
}
export function attachInputElement(inputElement) {
    _inputElement = inputElement;
    if (_inputElement) {
        _inputElement.addEventListener("change", onInputChange);
    }
}
export async function initializeAsync() {
    await H5PEnv.initializeAsync();
}
export function beginInstall() {
    if (_inputElement) {
        _inputElement.click();
    }
}
export async function openPackage(packkey, user) {
    let pack = PackagePool.getPackage(packkey);
    if (pack) {
        if (pack.wnd.isMinimized) {
            pack.wnd.restoreView();
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
export async function deletePackage(packkey) {
    console.log("deletePackage");
    //
    if (PackagePool.hasPackage(packkey)) {
        alert("You cannot delete an open package!");
        return;
    }
    //
    const tokDeleted = await deinstall(packkey);
    //alert(`Пакет (${tokDeleted}) удалён.`);
}
async function onInputChange() {
    if (_inputElement.files.length == 1) {
        const filePackage = _inputElement.files[0];
        //
        const filetoken = { name: filePackage.name, size: filePackage.size, type: filePackage.type, lastModified: filePackage.lastModified };
        let bPermission = await window.DotNet.invokeMethodAsync("CyberShelf", "requestParsing", filetoken);
        //
        if (bPermission) {
            const parsed = await parser.parse(filePackage);
            const packref = { key: parsed.package.key, guid: parsed.package.bookGUID, name: parsed.package.name, filename: parsed.package.filename, version: parsed.package.version };
            bPermission = await window.DotNet.invokeMethodAsync("CyberShelf", "requestInstall", packref);
            if (bPermission) {
                packref.key = await saveNewPackage(parsed);
                window.DotNet.invokeMethodAsync("CyberShelf", "informInstalled", packref);
            }
        } // if (bPermission)
    }
}
async function saveNewPackage(parsed) {
    //
    // Saving prepared data in the database (libraries & content)
    //
    let database = null;
    let transaction = null;
    try {
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
        }
        // Сохраняем в базе данных запись установленного пакета
        let storePack = transaction.objectStore("packages");
        parsed.package.key = `pack-${nNewPackKey}`;
        storePack.put(parsed.package, parsed.package.key);
        // Связанная по packtoken запись содержащая файлы контента
        parsed.content.ownerkey = parsed.package.key;
        let storeContent = transaction.objectStore("content");
        storeContent.put(parsed.content, parsed.content.ownerkey);
        //
        //
        transaction.commit();
        // Конец сохранения нового пакета
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
async function deinstall(packtoken) {
    //
    const pack = await AppDB.get("packages", packtoken);
    if (!pack) {
        alert(`the package being deleted (${packtoken}) was not found!`);
        return null;
    }
    //
    const aDependencies = pack.dependencies;
    const setBeingDeleted = new Set();
    const aAllPacks = await AppDB.getAll("packages");
    const nIndex = aAllPacks.findIndex((packCurrent) => packCurrent.key === packtoken);
    aAllPacks.splice(nIndex, 1);
    for (const tokenDepLib of aDependencies) {
        //
        const bOtherRefs = _testOtherRefs(tokenDepLib);
        if (!bOtherRefs)
            setBeingDeleted.add(tokenDepLib);
    }
    //
    // Список зависимых библиотек на которые нет других ссылок
    // подготовлен. Можно начинать удаление.
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
        storePack.delete(packtoken);
        let storeContent = transaction.objectStore("content");
        storeContent.delete(packtoken);
        //
        //
        transaction.commit();
        // Конец удаления пакета
        return packtoken;
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
} // deinstall
