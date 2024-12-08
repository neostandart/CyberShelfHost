
class CyberShelfAgent {
    _hteWelcome = null;
    _hteApp = null;
    _bReleased = false;
    _nStartTime = 0;
    _bDead = false;
    _observer = null;

    getStartTime() {
        return this._nStartTime;
    }

    getMinTime() {
        return 3800;
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
            //
            if (this._hteApp) {
                this._hteApp.classList.add("running");
            }
            //
            setTimeout(() => {
                this.die();
            }, 2000);
        }
    }

    _onMutation = (mutationList, observer) => {
        if (this._observer) {
            for (const mutation of mutationList) {
                if (mutation.type === 'childList') {
                    observer.disconnect();
                    this._observer = null;
                    //
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
            //
            if (this._hteWelcome && this._hteApp) {
                // Tracking the end of the application download
                this._observer = new MutationObserver(this._onMutation.bind(this));
                const config = { attributes: false, childList: true, subtree: false };
                this._observer.observe(this._hteApp, config);

                setTimeout(() => {
                    this._hteWelcome.classList.add("fadein");
                }, 10);
            }
            else {
                throw new Error("Incorrect structure the index.html (Welcome or Application elements not found)!");
            }
        }
        catch (err) {
            console.error(err);
        }
    }

} // class WelcomeScreen

//

window.CyberShelfAgent = new CyberShelfAgent();

function startWelcome() {
    window.CyberShelfAgent.start();
}

//

if (document.readyState !== "loading") {
    startWelcome();
} else {
    document.addEventListener("DOMContentLoaded", startWelcome);
}

// END 
