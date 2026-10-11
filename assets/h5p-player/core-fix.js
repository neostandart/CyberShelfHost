
//
// Utils
//

function hasProtocol(path) {
    return !!(path.match(/^[a-z0-9]+:\/\//i));
};

//
// Intercepting H5P.newRunnable to correct the inheritance mechanism of Runnable elements from H5P.ContentType
//

H5P.newRunnable = function (library, contentId, $attachTo, skipResize, extras) {
    var nameSplit, versionSplit, machineName;
    try {
        nameSplit = library.library.split(' ', 2);
        machineName = nameSplit[0];
        versionSplit = nameSplit[1].split('.', 2);
    }
    catch (err) {
        return H5P.error('Invalid library string: ' + library.library);
    }
    if ((library.params instanceof Object) !== true || (library.params instanceof Array) === true) {
        H5P.error('Invalid library params for: ' + library.library);
        return H5P.error(library.params);
    }
    // Find constructor function
    var constructor;
    try {
        nameSplit = nameSplit[0].split('.');
        constructor = window;
        for (var i = 0; i < nameSplit.length; i++) {
            constructor = constructor[nameSplit[i]];
        }
        if (typeof constructor !== 'function') {
            throw null;
        }
    }
    catch (err) {
        return H5P.error('Unable to find constructor for: ' + library.library);
    }
    if (extras === undefined) {
        extras = {};
    }
    if (library.subContentId) {
        extras.subContentId = library.subContentId;
    }
    if (library.userDatas && library.userDatas.state && H5PIntegration.saveFreq) {
        extras.previousState = library.userDatas.state;
    }
    if (library.metadata) {
        extras.metadata = library.metadata;
    }
    // Makes all H5P libraries extend H5P.ContentType:
    var standalone = extras.standalone || false;
    // This order makes it possible for an H5P library to override H5P.ContentType functions!
    // !!!CyberShelf specific. To be able to implement libraries as classes.
    Object.assign(constructor.prototype, H5P.ContentType(standalone).prototype);
    var instance;
    // Some old library versions have their own custom third parameter.
    // Make sure we don't send them the extras.
    // (they will interpret it as something else)
    if (H5P.jQuery.inArray(library.library, ['H5P.CoursePresentation 1.0', 'H5P.CoursePresentation 1.1', 'H5P.CoursePresentation 1.2', 'H5P.CoursePresentation 1.3']) > -1) {
        instance = new constructor(library.params, contentId);
    }
    else {
        instance = new constructor(library.params, contentId, extras);
    }
    if (instance.$ === undefined) {
        instance.$ = H5P.jQuery(instance);
    }
    if (instance.contentId === undefined) {
        instance.contentId = contentId;
    }
    if (instance.subContentId === undefined && library.subContentId) {
        instance.subContentId = library.subContentId;
    }
    if (instance.parent === undefined && extras && extras.parent) {
        instance.parent = extras.parent;
    }
    if (instance.libraryInfo === undefined) {
        instance.libraryInfo = {
            versionedName: library.library,
            versionedNameNoSpaces: machineName + '-' + versionSplit[0] + '.' + versionSplit[1],
            machineName: machineName,
            majorVersion: versionSplit[0],
            minorVersion: versionSplit[1]
        };
    }
    if ($attachTo !== undefined) {
        $attachTo.toggleClass('h5p-standalone', standalone);
        instance.attach($attachTo);
        H5P.trigger(instance, 'domChanged', {
            '$target': $attachTo,
            'library': machineName,
            'key': 'newLibrary'
        }, { 'bubbles': true, 'external': true });
        if (skipResize === undefined || !skipResize) {
            // Resize content.
            H5P.trigger(instance, 'resize');
        }
    }
    return instance;
};

//
// CyberShelf specific (no file system)
//

H5P.ContentType = function (isRootLibrary) {
    function ContentType() { }
    // Inherit from EventDispatcher.
    ContentType.prototype = new H5P.EventDispatcher();
    ContentType.prototype.isRoot = function () {
        return isRootLibrary;
    };
    // !!!CyberShelf specific
    ContentType.prototype.getLibraryFilePath = function (filePath) {
        // CyberShelf specific: each book runs in its own iframe, and the shell bootstrap
        // (player.html) sets THIS iframe's window.ActivePackage — the in-iframe contract
        // (Engine/Script/bookrt/appshare/iframe-contract.ts). There is no top-window copy.
        if (window.ActivePackage) {
            // Here, we request the library from the open package by "this.libraryInfo.versionedNameNoSpaces"
            // (this is actually "libtoken") and get a pack-bound access object (IActiveLibraryAccess).
            // A missing file is a console warning attributed to this book and a URL whose load
            // fails (the "deferred failure" miss policy — like a 404 on a regular H5P server);
            // nothing is thrown here and the book is not closed.
            const lib = window.ActivePackage.getActiveLibrary(this.libraryInfo.versionedNameNoSpaces);
            // An empty filePath asks for the library DIRECTORY: libraries then
            // concatenate their own file names onto it (SingleChoiceSet sounds,
            // SoundJS) — in virtual mode a real /vlib/<token>/ URL (ADR 0002 seam).
            return (lib) ? ((filePath) ? lib.getObjectURL(filePath) : lib.getDirectoryURL()) : "";
        }
        else {
            console.error("(CyberShelf specific) The ActivePackage object was not found!");
        }
    };
    return ContentType;
};

H5P.getPath = function (path, contentId) {
    // CyberShelf specific: the contentId parameter is not used — the per-iframe
    // window.ActivePackage IS this book (iframe-contract.ts). A missing content file:
    // console warning + a URL that fails to load, never a throw (see getLibraryFilePath).
    if (window.ActivePackage) {
        if (hasProtocol(path))
            return path;
        return window.ActivePackage.getObjectURL(path);
    }
    else {
        console.error("(CyberShelf specific) The ActivePackage object was not found!");
    }
};

//
// CyberShelf specific: local persistence of the content's state (work-plan 4.14)
//
// The core keeps "state" user data in H5PIntegration.contents[cid].contentUserData and would send it to a
// server endpoint; the PWA has none (H5PIntegration.user is undefined, so the core's request short-circuits
// with "Not signed in."). Every time the core stores a CHANGED root state — on its save interval, after
// progress events, on unload — hand the serialized string to the host's ActivePackage, which filters out
// the exam and keeps it in IndexedDB (render/bookstate.ts, view/activepack.ts). The host decides whether
// this book persists at all (H5PIntegration.saveFreq is false when it does not).
(function () {
    var originalSetUserData = H5P.setUserData;
    H5P.setUserData = function (contentId, dataId, data, extras) {
        var result = originalSetUserData.apply(this, arguments);
        try {
            var subContentId = (extras && extras.subContentId) || 0;
            if (dataId !== 'state' || subContentId !== 0 || !H5PIntegration.saveFreq) return result;
            var content = H5PIntegration.contents && H5PIntegration.contents['cid-' + contentId];
            var stored = content && content.contentUserData && content.contentUserData[0] && content.contentUserData[0].state;
            if (typeof stored !== 'string') {
                console.warn('(CyberShelf specific) The content state is not a string and was not saved.');
            }
            else if (window.ActivePackage && typeof window.ActivePackage.saveUserState === 'function') {
                window.ActivePackage.saveUserState(stored);
            }
        }
        catch (err) {
            console.warn('(CyberShelf specific) The book state could not be handed to the host:', err);
        }
        return result;
    };
})();
