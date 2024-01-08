import { Helper } from "./helper.js";
//
export function readAsDataURL(hteFileInput) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
            reader.abort();
            reject(new Error("Error reading file."));
        };
        //
        reader.addEventListener("load", () => {
            resolve(reader.result);
        }, false);
        //
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
        //
        reader.addEventListener("load", () => {
            resolve(reader.result);
        }, false);
        //
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
                reject(Helper.extractMessage(res)[0]);
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
                reject(Helper.extractMessage(res)[0]);
            }
        });
    });
}
