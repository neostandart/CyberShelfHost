let _cryptoKey = undefined;
export function hasCryptoKey() {
    return !!_cryptoKey;
}
export function getCryptoKey() {
    return _cryptoKey;
}
export async function importCryptoKey(keydata) {
    function convertBase64ToArrayBuffer(strdata) {
        var binaryString = atob(strdata);
        var bytes = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    const rawKey = convertBase64ToArrayBuffer(keydata);
    const algparams = "AES-CBC";
    _cryptoKey = await window.crypto.subtle.importKey("raw", rawKey, algparams, true, [
        "encrypt",
        "decrypt"
    ]);
}
export async function discardCryptoKey() {
    _cryptoKey = undefined;
}
export async function decrypt(iv, data) {
    if (!_cryptoKey)
        throw new Error("The decryption key is missing!");
    const algorithm = { name: "AES-CBC", iv };
    return await window.crypto.subtle.decrypt(algorithm, _cryptoKey, data);
}
//# sourceMappingURL=crypto.js.map