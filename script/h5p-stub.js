//
// H5P.SoundJS resolving
//
class SoundJS_Proxy {
    _mapSounds = new Map();
    constructor() {
    }
    initializeDefaultPlugins() {
        return true;
    }
    registerSound(filepath, key) {
        // Grigory. Since each package opened by H5P is deployed in a separate "iframe", 
        // the "iframe.contentWindow" property will contain one global ActivePackage 
        // object(which sets ActivePackage itself in its constructor).
        const pack = window.ActivePackage;
        if (pack) {
            // Here we assume that filepath starts with "library token".
            const nIndex = filepath.indexOf("/");
            if (nIndex > 0) {
                const token = filepath.substring(0, nIndex);
                filepath = filepath.substring(nIndex + 1);
                const lib = pack.getActiveLibrary(token);
                if (lib) {
                    const objurl = lib.getObjectURL(filepath);
                    if (objurl) {
                        this._mapSounds.set(key, new Audio(objurl));
                    }
                }
            }
        }
    }
    get INTERRUPT_NONE() {
        return "none";
    }
    play(type, unkprm1, delay) {
        const audio = this._mapSounds.get(type);
        if (audio) {
            if (delay > 0) {
                setTimeout((player) => {
                    player.play();
                }, delay, audio);
            }
            else {
                audio.play();
            }
        }
    }
} // class SoundJS_Proxy
if (window.H5P.SoundJS) {
    window.H5P.SoundJS = new SoundJS_Proxy();
}
