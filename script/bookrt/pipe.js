import { Helper } from "./appshare/helper.js";
const _domParser = new DOMParser();
export function readAsDataURL(hteFileInput) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
            reader.abort();
            reject(new Error("Error reading file."));
        };
        reader.addEventListener("load", () => {
            resolve(reader.result);
        }, false);
        reader.readAsDataURL(hteFileInput.files[0]);
    });
}
export function readAsText(hteFileInput) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
            reader.abort();
            reject(new Error("Error reading file."));
        };
        reader.addEventListener("load", () => {
            resolve(reader.result);
        }, false);
        reader.readAsText(hteFileInput.files[0]);
    });
}
export function fetchTextFile(url) {
    return new Promise((resolve, reject) => {
        fetch(url).then((res) => {
            if (res.ok === true) {
                resolve(res.text());
            }
            else {
                reject(Helper.extractMessage(res));
            }
        });
    });
}
export function fetchJson(url) {
    return new Promise((resolve, reject) => {
        fetch(url).then((res) => {
            if (res.ok === true) {
                resolve(res.json());
            }
            else {
                reject(Helper.extractMessage(res));
            }
        });
    });
}
export async function fetchSvgFromFile(path, strId, strClass) {
    const strSvgSource = await fetchTextFile(path);
    const svg = _domParser.parseFromString(strSvgSource, "image/svg+xml").firstElementChild;
    if (strId) {
        svg.setAttribute("id", strId);
    }
    if (strClass) {
        svg.classList.add(...strClass.split(" "));
    }
    return svg;
}
//# sourceMappingURL=pipe.js.map