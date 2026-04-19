
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
        // CyberShelf specific: since each package opened by H5P is deployed in a separate "iframe", the "iframe.contentWindow" property will contain one global ActivePackage object.
        if (window.ActivePackage) {
            // Here, we request the library from the open package by "this.libraryInfo.versionedNameNoSpaces" 
            // (this is actually "libtoken"), and from there we get the ObjectURL of the file!
            const lib = window.ActivePackage.getActiveLibrary(this.libraryInfo.versionedNameNoSpaces);
            return (lib) ? ((filePath) ? lib.getObjectURL(filePath) : lib.token + "/") : "";
        }
        else {
            console.error("(CyberShelf specific) The ActivePackage object was not found!");
        }
    };
    return ContentType;
};

H5P.getPath = function (path, contentId) {
    // CyberShelf specific: he contentId parameter is not used.
    if (window.ActivePackage) {
        if (hasProtocol(path))
            return path;
        return window.ActivePackage.getObjectURL(path);
    }
    else {
        console.error("(CyberShelf specific) The ActivePackage object was not found!");
    }
};
