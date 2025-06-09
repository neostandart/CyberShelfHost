import { InstallPhase } from "./abstraction.js";
import * as h5penv from "./render/h5penv.js";
const _workers = [];
export async function install(bookRef, bookMonitor, params) {
    const worker = new Worker("./script/player/workers/install-worker.js");
    worker.addEventListener("message", (ev) => {
        const objMessage = ev.data;
        switch (objMessage.phase) {
            case InstallPhase.Download:
            case InstallPhase.Parsing:
            case InstallPhase.Setup:
                bookMonitor.invokeMethodAsync("informInstallProgress", objMessage.phase, objMessage.percent);
                break;
            case InstallPhase.Done:
                const iWorkerIndex = _workers.indexOf(ev.currentTarget);
                if (Number.isInteger(iWorkerIndex))
                    _workers[iWorkerIndex].terminate();
                _workers.splice(iWorkerIndex, 1);
                objMessage.newLibs.forEach((lib) => {
                    if (lib.isAddon) {
                        h5penv.regAddonLibrary(lib);
                    }
                });
                bookMonitor.invokeMethodAsync("informInstallDone", objMessage.bookCase);
                break;
            default:
                bookMonitor.invokeMethodAsync("informInstallError", ev.data.message || "no message");
                break;
        }
    });
    _workers.push(worker);
    worker.postMessage({ bookRef: bookRef, params: params });
}
export async function initialize() {
}
//# sourceMappingURL=installer-async.js.map