
class CyberShelfAgent {
    _hteWelcome = null;
    _hteApp = null;
    _hteLogo = null;
    _hteFlash = null;
    _bReleased = false;
    _nStartTime = 0;
    _bDead = false;
    _observer = null;

    _hteSpinner = null;

    _audioContext = undefined;

    getStartTime() {
        return this._nStartTime;
    }

    // No artificial minimum: the app is shown as soon as Blazor has mounted (work-plan 4.15). Kept as a
    // method because Runtime.informAppReady still receives it.
    getMinTime() {
        return 0;
    }

    die() {
        this._bDead = true;
        if (this._hteWelcome && this._hteWelcome.parentElement) {
            this._hteWelcome.parentElement.removeChild(this._hteWelcome);
        }
    }

    stop() {
        if (this._hteWelcome) {
            this._hteWelcome.classList.add("fadeout");
            this._hteWelcome.classList.remove("fadein");

            if (this._hteApp) {
                this._hteApp.classList.add("running");
            }

            setTimeout(() => {
                this.die();
            }, 2000);
        }
    }

    async _showVersion() {
        const response = await fetch("appsettings.json");
        if (response.ok) {
            const appsettings = await response.json();
            if (this._hteWelcome && appsettings && appsettings.AppVersion) {
                const hteVersion = this._hteWelcome.querySelector("#AppVersion");
                if (hteVersion) {
                    hteVersion.innerText = appsettings.AppVersion;
                    hteVersion.classList.add("visible");
                }
            }
        }
    }

    // Blazor has rendered into #Application: hand over at once. The logo "zoom" animation used to run
    // here first (2.5 s plus a 1.5 s pause), which delayed every start by ~4 s for decoration only.
    _onMutation = (mutationList, observer) => {
        if (this._observer) {
            for (const mutation of mutationList) {
                if (mutation.type === 'childList') {
                    observer.disconnect();
                    this._observer = null;

                    if (this._hteSpinner)
                        this._hteSpinner.classList.add("hidden");

                    window.DotNet.invokeMethodAsync("CyberShelf", "informAppReady", this.getStartTime(), this.getMinTime());
                    return;
                }
            }
        }
    };

    async start() {
        this._nStartTime = Date.now();
        try {
            this._hteWelcome = document.getElementById("Welcome");
            this._hteApp = document.getElementById("Application");
            this._hteLogo = document.getElementById("Logo");
            this._hteFlash = document.getElementById("Flash");
            this._hteSpinner = document.getElementById("Spinner");

            this._showVersion();

            if (this._hteWelcome && this._hteApp) {
                // Tracking the end of the application download
                this._observer = new MutationObserver(this._onMutation.bind(this));
                const config = { attributes: false, childList: true, subtree: false };
                this._observer.observe(this._hteApp, config);

                setTimeout(() => {
                    this._hteWelcome.classList.add("fadein");
                }, 0);
            }
            else {
                throw new Error("Incorrect structure the index.html (Welcome or Application elements not found)!");
            }
        }
        catch (err) {
            console.error(err);
        }
    }

} // class CyberShelfAgent

//

/* Protection for a non-root path logon */
//const basePath = "/";
//const pathname = window.location.pathname;
//if (pathname !== basePath) {
//    window.location.replace(basePath);
//}

//

window.getBrowserLanguage = () => navigator.language;

// The document language follows the app's UI language (work-plan 4.12): screen readers pick their voice and
// the browser its hyphenation/translation offers from <html lang>. The app sets the final value once its
// configuration is loaded (AppConfigService); this early guess from the saved setting (or the browser)
// covers the splash screen before that.
window.setDocumentLanguage = (lang) => {
    if (typeof lang === "string" && lang.length >= 2)
        document.documentElement.lang = lang.substring(0, 2).toLowerCase();
};

(function () {
    let culture = "";
    try {
        const shared = JSON.parse(localStorage.getItem("shared") || "null");
        if (shared && typeof shared.Culture === "string") culture = shared.Culture;
    } catch { /* unreadable settings: fall back to the browser language */ }
    window.setDocumentLanguage(culture || navigator.language || "en");
})();

window.CyberShelfAgent = new CyberShelfAgent();

function startWelcome() {
    window.CyberShelfAgent.start();
}

if (document.readyState !== "loading") {
    startWelcome();
} else {
    document.addEventListener("DOMContentLoaded", startWelcome);
}

// ====================================================================
