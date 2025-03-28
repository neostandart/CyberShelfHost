export class Helper {
    static VERLENGTH = 4;
    static parseVersion(strVersion) {
        let aVersion = strVersion.split(".").map((item) => parseInt(item));
        while (aVersion.length < this.VERLENGTH)
            aVersion.push(0);
        aVersion.length = this.VERLENGTH;
        return aVersion;
    }
    static isBaseVersionEqual(strVerTarget, strVerAnother) {
        const aTarget = this.parseVersion(strVerTarget);
        const aAnother = this.parseVersion(strVerAnother);
        for (let i = 0; i < 2; i++) {
            if (aTarget[i] !== aAnother[i])
                return false;
        }
        return true;
    }
    static compareVersion(strVerTarget, strVerAnother) {
        const aTarget = this.parseVersion(strVerTarget);
        const aAnother = this.parseVersion(strVerAnother);
        for (let i = 0; i < this.VERLENGTH; i++) {
            if (aTarget[i] === aAnother[i])
                continue;
            return (aTarget[i] < aAnother[i]) ? -1 : 1;
        }
        return 0;
    }
    static createDynamicID() {
        return Date.now().toString();
    }
    static convertBase64ToArrayBuffer(strdata) {
        var binaryString = atob(strdata);
        var bytes = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    static convertDateToString(theDate) {
        let yyyy = theDate.getFullYear().toString();
        let nmm = theDate.getMonth() + 1;
        let ndd = theDate.getDate();
        let dd = (ndd < 10) ? `0${ndd}` : `${ndd}`;
        let mm = (nmm < 10) ? `0${nmm}` : `${nmm}`;
        let strDate = yyyy + "-" + mm + "-" + dd;
        return strDate;
    }
    static convertDateTimeToString(theDate) {
        let yyyy = theDate.getFullYear().toString();
        let nmm = theDate.getMonth() + 1;
        let ndd = theDate.getDate();
        let dd = (ndd < 10) ? `0${ndd}` : `${ndd}`;
        let mm = (nmm < 10) ? `0${nmm}` : `${nmm}`;
        let nh = theDate.getHours();
        let nm = theDate.getMinutes();
        let ns = theDate.getSeconds();
        let h = (nh < 10) ? `0${nh}` : `${nh}`;
        let m = (nm < 10) ? `0${nm}` : `${nm}`;
        let s = (ns < 10) ? `0${ns}` : `${ns}`;
        let strDateTime = yyyy + "-" + mm + "-" + dd + " " + h + ":" + m + ":" + s;
        return strDateTime;
    }
    static convertDateToTimestamp(date) {
        return date.getTime();
    }
    static formatString(str, ...args) {
        if (!str) {
            return "undefined!";
        }
        let a = Array.prototype.slice.call(args, 0);
        if (a.length === 0) {
            return str;
        }
        if (Array.isArray(a[0])) {
            a = a[0];
        }
        return str.replace(/\{(\d+)\}/g, (match, index) => {
            const param = a[index];
            if (param !== undefined && param !== null) {
                return (param.toString());
            }
            return "";
        });
    }
    static hasString(value) {
        return (typeof (value) === "string");
    }
    static hasText(value) {
        return (typeof (value) === "string" && value.length > 0);
    }
    static fetchString(val) {
        if (this.isString(val)) {
            return val;
        }
        return "";
    }
    static ensureStartsWith(strTarget, strStart) {
        return (strTarget.startsWith(strStart)) ? strTarget : (strStart + strTarget);
    }
    static ensureEndsWith(strTarget, strEnd) {
        return (strTarget.endsWith(strEnd)) ? strTarget : (strTarget + strEnd);
    }
    static cutEnd(strTarget, strEnd) {
        if (strTarget.endsWith(strEnd)) {
            strTarget = strTarget.substring(0, strTarget.length - strEnd.length);
        }
        return strTarget;
    }
    static cutFromEnd(strTarget, strSubj) {
        let nPos = strTarget.lastIndexOf(strSubj);
        if (nPos >= 0) {
            strTarget = strTarget.substring(0, nPos);
        }
        return strTarget;
    }
    static cutStart(strTarget, strStart, bUntil) {
        if (strTarget.startsWith(strStart)) {
            __execute();
        }
        if (bUntil) {
            while (strTarget.startsWith(strStart)) {
                __execute();
            }
        }
        return strTarget;
        function __execute() {
            strTarget = strTarget.substring(strStart.length);
        }
    }
    static cutFromStart(strTarget, strSubj) {
        let nPos = strTarget.indexOf(strSubj);
        if (nPos < 0) {
            return null;
        }
        nPos += strSubj.length;
        strTarget = strTarget.substring(nPos);
        return strTarget;
    }
    static getDateNowString() {
        return this.convertDateToString(new Date(Date.now()));
    }
    static getDateTimeNowString() {
        return this.convertDateTimeToString(new Date(Date.now()));
    }
    static compareStringsForced(str1, str2) {
        return (str1.replace(/\s+/g, '').toLowerCase()) === (str2.replace(/\s+/g, '').toLowerCase());
    }
    static isString(str) {
        return (typeof str === "string");
    }
    static isNumber(val) {
        return (typeof val === "number");
    }
    static isObject(val) {
        return (this.isArray(val)) ? false : (val instanceof Object);
    }
    static isArray(val) {
        return (val && Array.isArray(val));
    }
    static isBoolean(val) {
        return (val instanceof Boolean);
    }
    static asType(a) {
        return a;
    }
    static parseEnum(enm, valueKey, bCaseSensitive = false) {
        if (!valueKey)
            return undefined;
        if (valueKey === undefined || valueKey === null)
            return undefined;
        const a = (Object.values(enm));
        const bNumberType = this.isNumber(a[a.length - 1]);
        const aKeys = (bNumberType) ? (a.slice(0, a.length / 2)) : Object.keys(enm);
        const nPos = (bCaseSensitive) ?
            aKeys.indexOf(valueKey) :
            aKeys.findIndex((strKey) => { return strKey.toLowerCase() === valueKey.toLowerCase(); });
        return (nPos >= 0) ? (bNumberType ? a[nPos + aKeys.length] : a[nPos]) : undefined;
    }
    static parseEnumEnsure(enm, valueKey, def, bCaseSensitive = false) {
        if (valueKey === undefined || valueKey === null)
            return def;
        const a = (Object.values(enm));
        const bNumberType = this.isNumber(a[a.length - 1]);
        const aKeys = (bNumberType) ? (a.slice(0, a.length / 2)) : Object.keys(enm);
        const nPos = (bCaseSensitive) ?
            aKeys.indexOf(valueKey) :
            aKeys.findIndex((strKey) => { return strKey.toLowerCase() === valueKey.toLowerCase(); });
        return (nPos >= 0) ? (bNumberType ? a[nPos + aKeys.length] : a[nPos]) : def;
    }
    static extractEnumKeys(obj) {
        return Object.keys(obj).filter((k) => Number.isNaN(+k));
    }
    static convertEnumToString(value, enumType) {
        let keys = Object.keys(enumType);
        let strKey = value.toString();
        let nThreshold = keys.length / 2;
        let nValIndex = 0;
        for (let i = 0; i < nThreshold; i++) {
            if (keys[i] === strKey) {
                nValIndex = i;
                break;
            }
        }
        let nKeyIndex = nValIndex + nThreshold;
        return keys[nKeyIndex];
    }
    static getObjectName(obj) {
        if (obj && obj.constructor) {
            return obj.constructor.name;
        }
        return "Unknown";
    }
    static isObjectEmpty(obj) {
        return (this.isObject(obj)) ? Object.keys(obj).length === 0 : true;
    }
    static extractUrlRoot(location) {
        let root = this.cutFromEnd(location.href, "?");
        root = this.cutFromEnd(location.href, "index.");
        root = this.ensureEndsWith(root, "/");
        return root;
    }
    static combinePath(path1, path2) {
        path1 = this.ensureEndsWith(path1, "/");
        path2 = this.cutStart(path2, "/");
        return path1 + path2;
    }
    static concatPaths(path1, path2, path3) {
        let pathIntermediate = this.combinePath(path1, path2);
        return this.combinePath(pathIntermediate, path3);
    }
    static combinePathDir(path1, path2) {
        let path = this.combinePath(path1, path2);
        path = this.ensureEndsWith(path, "/");
        return path;
    }
    static extractExtension(path) {
        let iIndex = path.lastIndexOf(".");
        return (iIndex > 0) ? path.substring(iIndex + 1) : "";
    }
    static changeExtension(path, strNew) {
        const strCurrent = this.extractExtension(path);
        if (strCurrent === strNew)
            return path;
        if (strCurrent.length > 0) {
            path = path.substring(0, path.length - (strCurrent.length + 1));
        }
        if (strNew.length > 0) {
            path = path + "." + strNew;
        }
        return path;
    }
    static isAbsoluteUri(uri) {
        const pattern = /^((http|https|ftp):\/\/)/;
        return pattern.test(uri);
    }
    static isFullPath(path) {
        return (path.indexOf("://") > 0 || path.startsWith("data:") || path.startsWith("key@"));
    }
    static extractDirectory(path) {
        try {
            let pos = path.lastIndexOf("/");
            if (pos < 0) {
                pos = path.lastIndexOf("\\");
            }
            return (pos > path.lastIndexOf(".")) ?
                path :
                path.substring(0, pos + 1);
        }
        catch (err) {
            return "???";
        }
    }
    static extractFileName(path) {
        const nIndexDot = path.lastIndexOf(".");
        if (nIndexDot < 0)
            return path;
        const nIndexSep = path.lastIndexOf("/");
        if (nIndexDot < nIndexSep)
            return path;
        return path.substring(0, nIndexDot);
    }
    static clearHTMLElement(hte) {
        if (hte) {
            while (hte.firstChild) {
                hte.removeChild(hte.firstChild);
            }
        }
    }
    static disableUI(hte) {
        if (hte) {
            if (!hte.classList.contains("ui-disabled")) {
                hte.classList.add("ui-disabled");
            }
        }
    }
    static enableUI(hte) {
        if (hte) {
            if (hte.classList.contains("ui-disabled")) {
                hte.classList.remove("ui-disabled");
            }
        }
    }
    static applyAnimation(hteTarget, strClassStart, strClassFinish, bSaveAnimation = false) {
        return new Promise((resolve, reject) => {
            let _strClassStart = strClassStart;
            let _strClassFinish = strClassFinish;
            let _bSaveAnimation = bSaveAnimation;
            let onAnimationEnd = (ev) => {
                if (strClassFinish) {
                    hteTarget.classList.add(strClassFinish);
                }
                clear();
                resolve(ev);
            };
            let onAnimationCancel = (ev) => {
                clear();
                reject(ev);
            };
            function clear() {
                hteTarget.removeEventListener("animationcancel", onAnimationCancel);
                hteTarget.removeEventListener("animationend", onAnimationEnd);
                if (!_bSaveAnimation) {
                    hteTarget.classList.remove(strClassStart);
                }
            }
            hteTarget.addEventListener("animationend", onAnimationEnd);
            hteTarget.addEventListener("animationcancel", onAnimationCancel);
            hteTarget.classList.add(strClassStart);
        });
    }
    static MIMEMap = new Map([
        ["css", "text/css"],
        ["js", "application/x-javascript"],
        ["json", "application/json"],
        ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        ["ico", "image/x-icon"],
        ["jpeg", "image/jpeg"],
        ["jpg", "image/jpeg"],
        ["png", "image/png"],
        ["svg", "image/svg+xml"],
        ["bmp", "image/bmp"],
        ["mp3", "audio/mpeg"],
        ["mpeg", "video/mpeg"],
        ["mpg", "video/mpeg"],
        ["wma", "audio/x-ms-wma"],
        ["wav", "audio/wav"]
    ]);
    static parseMIME(mime) {
        let a = mime.split("/");
        if (a.length !== 2)
            return null;
        return [a[0], a[1]];
    }
    static extractMessage(errcase) {
        let strMessage = "";
        if (errcase instanceof Event) {
            if (errcase.target instanceof IDBOpenDBRequest) {
                const target = errcase.target;
                if (target.error) {
                    errcase = target.error;
                }
            }
        }
        else if (errcase instanceof Error) {
            const errorInstance = errcase;
            strMessage = errorInstance.name;
            if (!strMessage.endsWith("."))
                strMessage += ".";
            if (errorInstance.message) {
                strMessage += " " + errorInstance.message;
            }
        }
        else if (errcase instanceof Response) {
            const responseInstance = errcase;
            strMessage = __addSection(`Response: ok=${responseInstance.ok}; status=${responseInstance.status}; statusText=${responseInstance.statusText}; type=${responseInstance.type}; url=${responseInstance.url}.`);
        }
        else {
            if (typeof errcase === 'string') {
                strMessage = errcase;
            }
            else {
                if (errcase && errcase.name) {
                    strMessage = __addSection(errcase.name);
                }
                if (errcase && errcase.status) {
                    strMessage = __addSection(`status=${errcase.status}`);
                }
                if (errcase && errcase.statusText) {
                    strMessage = __addSection(`statusText=${errcase.statusText}`);
                }
            }
        }
        return strMessage;
        function __addSection(section) {
            return (strMessage.length > 0) ? strMessage += ` | ${section}` : section;
        }
    }
    static flatten(target, opts) {
        opts = opts || {};
        const delimiter = opts.delimiter || '.';
        const maxDepth = opts.maxDepth;
        const transformKey = opts.transformKey || keyIdentity;
        const output = {};
        function isBuffer(obj) {
            return obj &&
                obj.constructor &&
                (typeof obj.constructor.isBuffer === 'function') &&
                obj.constructor.isBuffer(obj);
        }
        function keyIdentity(key) {
            return key;
        }
        function step(object, prev, currentDepth) {
            currentDepth = currentDepth || 1;
            Object.keys(object).forEach(function (key) {
                const value = object[key];
                const isarray = opts.safe && Array.isArray(value);
                const type = Object.prototype.toString.call(value);
                const isbuffer = isBuffer(value);
                const isobject = (type === '[object Object]' ||
                    type === '[object Array]');
                const newKey = prev
                    ? prev + delimiter + transformKey(key)
                    : transformKey(key);
                if (!isarray && !isbuffer && isobject && Object.keys(value).length &&
                    (!opts.maxDepth || currentDepth < maxDepth)) {
                    return step(value, newKey, currentDepth + 1);
                }
                output[newKey] = value;
            });
        }
        step(target, undefined, undefined);
        return output;
    }
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static getOrientation() {
        return Math.abs(screen.orientation.angle) - 90 == 0 ? "landscape" : "portrait";
    }
    ;
    static getMobileWidth() {
        return this.getOrientation() == "landscape" ? screen.availHeight : screen.availWidth;
    }
    ;
    static getMobileHeight() {
        return this.getOrientation() == "landscape" ? screen.availWidth : screen.availHeight;
    }
    ;
    static get isExtraSmall() {
        const nThreshold = 576;
        return (window.visualViewport.width < nThreshold);
    }
}
//# sourceMappingURL=helper.js.map