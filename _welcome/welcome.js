
class WelcomeScreen {
    _hteWelcome = null;
    _hteApp = null;
    _bStarted = false;
    _nStartTime = 0;
    _bDead = false;
    //
    _observer = null;
    //

    getStartTime() {
        return this._nStartTime;
    }

    async start() {
        if (!this._bStarted) {
            this._nStartTime = Date.now();
            this._bStarted = true;
            try {
                if (!this._hteWelcome) {
                    this._hteWelcome = document.getElementById("Welcome");
                }
                //
                if (this._hteWelcome) {
                    this._hteApp = document.getElementById('Application');
                    if (this._hteApp) {
                        // Tracking the end of the application download
                        this._observer = new MutationObserver(this._onMutation.bind(this));
                        const config = { attributes: false, childList: true, subtree: false };
                        this._observer.observe(this._hteApp, config);
                    }
                    //
                    setTimeout(() => {
                        this._hteWelcome.classList.add("fadein");
                    }, 10);
                }
                else {
                    throw new Error("Error loading the Welcome Markup!");
                }
            }
            catch (err) {
                console.error(err);
            }
        }
    }

    stop() {
        if (this._bStarted && !this._bDead) {
            if (this._hteWelcome) {
                this._hteWelcome.classList.add("fadeout");
                this._hteWelcome.classList.remove("fadein");
                //
                if (this._hteApp) {
                    this._hteApp.classList.add("running");
                }
                //
                setTimeout(() => {
                    this._bStarted = false;
                    this.die();
                }, 2000);
            }
        }
    }

    die() {
        this._bDead = true;
        if (this._hteWelcome && this._hteWelcome.parentElement) {
            this._hteWelcome.parentElement.removeChild(this._hteWelcome);
        }
        //
        this._hteWelcome = null;
        window.MPClassWelcome = null;
    }

    //

    _onMutation = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === 'childList') {
                observer.disconnect();
                this._observer = null;
                //
                this.stop();
            }
        }
    };
} // class WelcomeScreen

//

window.MPClassWelcome = new WelcomeScreen();

function startWelcome() {
    window.MPClassWelcome.start();
}

//

if (document.readyState !== "loading") {
    startWelcome();
} else {
    document.addEventListener("DOMContentLoaded", startWelcome);
}

// ====================================================================
