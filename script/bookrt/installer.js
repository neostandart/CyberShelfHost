import { InstallPhase } from "./appshare/abstraction.js";
import { Helper } from "./appshare/helper.js";
import { getCryptoKey } from "./crypto.js";
import { LibraryPool } from "./render/activelib.js";
let _refBookSetupper;
let _dbName;
let _dbVersion;
let _inputPackage;
let _inputLibrary;
const _workers = [];
function _closeWorker(worker) {
    const iWorkerIndex = _workers.findIndex(item => item.worker === worker);
    if (iWorkerIndex >= 0) {
        worker.terminate();
        _workers.splice(iWorkerIndex, 1);
    }
}
async function onInputLibraryChange() {
    function processWorkerError(w, msg) {
        if (w)
            _closeWorker(w);
        _refBookSetupper.invokeMethodAsync("InformLibInstallError", msg);
    }
    try {
        if (_inputLibrary.files.length >= 1) {
            const fileLibrary = _inputLibrary.files[0];
            const filetoken = { name: fileLibrary.name, size: fileLibrary.size, type: fileLibrary.type, modified: fileLibrary.lastModified };
            if (await _refBookSetupper.invokeMethodAsync("RequestLibInstall", fileLibrary.name)) {
                const worker = new Worker("./script/bookrt/workers/install-worker.js");
                worker.onerror = (ev) => {
                    processWorkerError(worker, Helper.extractMessage(ev));
                };
                worker.addEventListener("message", async (ev) => {
                    const objMessage = ev.data;
                    switch (true) {
                        case (objMessage.libBrief !== undefined):
                            _refBookSetupper.invokeMethodAsync("InformLibInstallFinish", objMessage.libBrief);
                            _closeWorker(worker);
                            break;
                        case (typeof objMessage.message === "string"):
                            processWorkerError(worker, objMessage.message);
                            break;
                    }
                });
                _workers.push({ worker, id: filetoken.name, monitor: null });
                worker.postMessage({ libFile: fileLibrary, params: { dbName: _dbName, dbVersion: _dbVersion }, cryptoKey: getCryptoKey() });
            }
        }
    }
    catch (err) {
        processWorkerError(null, Helper.extractMessage(err));
    }
}
async function onInputPackageChange() {
    if (_inputPackage.files.length >= 1) {
        const filePackage = _inputPackage.files[0];
        const request = await _refBookSetupper.invokeMethodAsync("MonitorRequest", { FileName: filePackage.name });
        const [bookRef, bookMonitor, params] = [request.bookRef, request.bookMonitor, request.params];
        bookRef.source = filePackage;
        setup(bookRef, bookMonitor, params);
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
export function invokeBookInstall() {
    if (_inputPackage) {
        _inputPackage.click();
    }
}
export async function setup(bookRef, bookMonitor, params) {
    function processWorkerError(w, msg) {
        if (w)
            _closeWorker(w);
        bookMonitor.invokeMethodAsync("InformSetupError", msg);
    }
    const worker = new Worker("./script/bookrt/workers/install-worker.js");
    worker.onerror = (ev) => {
        processWorkerError(worker, Helper.extractMessage(ev));
    };
    worker.addEventListener("message", async (ev) => {
        const objMessage = ev.data;
        switch (true) {
            case (objMessage.phase !== undefined): {
                switch (objMessage.phase) {
                    case InstallPhase.Download:
                    case InstallPhase.Parsing:
                    case InstallPhase.Integration:
                        bookMonitor.invokeMethodAsync("InformSetupProgress", objMessage.phase, objMessage.percent);
                        break;
                    case InstallPhase.Finish:
                        _closeWorker(ev.currentTarget);
                        bookMonitor.invokeMethodAsync("InformSetupFinish", objMessage.bookCase);
                        break;
                    default:
                        processWorkerError(worker, ev.data.message);
                        break;
                }
                break;
            }
            case (objMessage.match !== undefined): {
                let answer = await bookMonitor.invokeMethodAsync("RequestPackUpdate", objMessage.candidate, objMessage.existing, objMessage.match);
                switch (answer) {
                    case 0: {
                        worker.postMessage({ setupVariant: "update" });
                        break;
                    }
                    case 1: {
                        worker.postMessage({ setupVariant: "install" });
                        break;
                    }
                    default: {
                        _closeWorker(ev.currentTarget);
                        bookMonitor.invokeMethodAsync("InformSetupFinish", null);
                        break;
                    }
                }
                break;
            }
            case (objMessage.candidate !== undefined): {
                worker.postMessage({ setupVariant: params.isUpdate ? "update" : "install" });
                break;
            }
        }
    });
    _workers.push({ worker, id: bookRef.id, monitor: bookMonitor });
    worker.postMessage({ bookRef: bookRef, params: { ...params, dbName: _dbName, dbVersion: _dbVersion }, cryptoKey: getCryptoKey() });
}
export async function abort(bookId) {
    const wcase = _workers.find((item) => item.id === bookId);
    if (wcase) {
        _closeWorker(wcase.worker);
        if (wcase.monitor)
            wcase.monitor.invokeMethodAsync("InformSetupAborted");
    }
}
export async function uninstallBook(bookId, bookName, params) {
    function processWorkerError(w, msg) {
        if (w)
            _closeWorker(w);
        _refBookSetupper.invokeMethodAsync("InformUninstallError", bookName, msg);
    }
    const worker = new Worker("./script/bookrt/workers/uninstall-worker.js");
    worker.onerror = (ev) => {
        processWorkerError(worker, Helper.extractMessage(ev));
    };
    _workers.push({ worker, id: bookId, monitor: null });
    worker.addEventListener("message", async (ev) => {
        const objMessage = ev.data;
        switch (objMessage.msgtype) {
            case "done": {
                setTimeout(() => {
                    _refBookSetupper.invokeMethodAsync("InformUninstalled", objMessage.bookCase);
                }, 0);
                break;
            }
            case "error": {
                processWorkerError(worker, objMessage.message);
                break;
            }
        }
        _closeWorker(worker);
    });
    worker.postMessage({ bookId, bookName, params: { ...params, dbName: _dbName, dbVersion: _dbVersion } });
}
async function uninstallLibrary(libBrief) {
    function processWorkerError(w, msg) {
        if (w)
            _closeWorker(w);
        _refBookSetupper.invokeMethodAsync("InformLibUnnstallError", libBrief, msg);
    }
    const worker = new Worker("./script/bookrt/workers/uninstall-worker.js");
    worker.onerror = (ev) => {
        processWorkerError(worker, Helper.extractMessage(ev));
    };
    _workers.push({ worker, id: libBrief.key, monitor: null });
    worker.addEventListener("message", async (ev) => {
        const objMessage = ev.data;
        switch (objMessage.msgtype) {
            case "done": {
                _closeWorker(worker);
                setTimeout(() => {
                    _refBookSetupper.invokeMethodAsync("InformLibUninstallFinish", libBrief);
                }, 0);
                break;
            }
            case "error": {
                processWorkerError(worker, objMessage.message);
                break;
            }
        }
    });
    worker.postMessage({ libBrief: libBrief, params: { dbName: _dbName, dbVersion: _dbVersion } });
}
export function invokeLibraryInstall() {
    if (_inputLibrary)
        _inputLibrary.click();
}
export function invokeLibraryUninstall(libBrief) {
    if (LibraryPool.hasLibrary(libBrief.key)) {
        throw new Error(`You cannot delete a library that is in use! (library: ${libBrief.key})`);
    }
    uninstallLibrary(libBrief);
}
export async function initialize(refBookSetupper, params) {
    _refBookSetupper = refBookSetupper;
    _dbName = params.dbName;
    _dbVersion = params.dbVersion;
}
//# sourceMappingURL=installer.js.map