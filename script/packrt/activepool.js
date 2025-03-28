import { ActivePack } from "./render/activepack.js";
const _mapPacks = new Map();
export function render(refBookWnd, packId, iframe) {
    const pack = new ActivePack(refBookWnd, packId, iframe);
    _mapPacks.set(packId, pack);
}
export function hasPackage(packId) {
    return _mapPacks.has(packId);
}
export function remove(packId) {
    if (_mapPacks.has(packId)) {
        const pack = _mapPacks.get(packId);
        pack.dispose();
        _mapPacks.delete(packId);
    }
}
export function clear() {
    _mapPacks.forEach((pack) => pack.dispose());
    _mapPacks.clear();
}
//# sourceMappingURL=activepool.js.map