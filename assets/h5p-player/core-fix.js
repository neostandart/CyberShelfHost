
//
// Utils
//

function hasProtocol(path) {
    return !!(path.match(/^[a-z0-9]+:\/\//i));
};

//
// Intercepting H5P.newRunnable to correct the inheritance mechanism of Runnable elements from H5P.ContentType
//
// How a library gets the H5P.ContentType members (on/once/off/trigger, the xAPI helpers, isRoot,
// getLibraryFilePath). The same fix as VMB.Adapt 1.0.1 (js/library.js), which applies it outside
// CyberShelf; here it is part of the player, as VMB.Adapt steps aside when window.ActivePackage is set.
// One addition here: an isRoot answer every running call agrees on is kept (see runningAnswers).
//
// The core replaces the prototype on every call:
//   constructor.prototype = H5P.jQuery.extend({}, ContentType.prototype, constructor.prototype)
// That drops the library's prototype chain and cannot work for an ES class at all: a class
// `prototype` is non-writable. A plain Object.assign onto the prototype (used here before) copied
// only own properties, so the xAPI helpers that ContentType inherits from H5P.EventDispatcher.prototype
// never arrived (H5P.GuessTheAnswer 1.5 and H5P.DocumentationTool 1.8, which have no event dispatcher
// of their own, failed in attach); it also overwrote the library's own members. Here the prototype is
// kept and only the members it lacks are added to it, once.
//
// The core gives every instance its own event registry and its own isRoot answer; a member copied
// once onto a shared prototype would give one registry and one answer to all instances of the library.
// So on/once/off/trigger and isRoot go on the prototype as accessors that hand out the members of the
// instance they are read from: the closures of its own H5P.EventDispatcher (as in the core, they work
// when called unbound and the event does not bubble from them) and an isRoot answering its own
// newRunnable call. Assigning the member (H5P.EventDispatcher.call(this), super()) makes it an own
// property, as it would be without the accessor.
//
// The helpers live in this function scope: a classic script's top-level declarations would be globals
// of the book document (hasProtocol above is one on purpose).

(function () {
    // The newRunnable calls whose constructor is running, innermost last.
    var constructing = [];
    var standaloneOf = new WeakMap();
    var dispatchers = new WeakMap();
    var isRootFunctions = new WeakMap();
    var extendedPrototypes = new WeakSet();
    var dispatcherMembers = ['on', 'once', 'off', 'trigger'];

    function dispatcherOf(object) {
        var dispatcher = dispatchers.get(object);
        if (!dispatcher) {
            dispatcher = new H5P.EventDispatcher();
            dispatchers.set(object, dispatcher);
        }
        return dispatcher;
    }

    // The answers of the running calls whose constructor `object` is an instance of, innermost first.
    // An object still in its constructor is not in standaloneOf yet and is the instance of one of them;
    // which one is unknown, since newRunnable sees the object only after `new` returns. standaloneFor
    // takes the innermost call: wrong only while two constructors of one prototype chain with different
    // answers are running and the object belongs to the outer one (a root passed on as the parent of a
    // grandchild), and nothing wrong is stored (see newRunnable). An answer every matching call agrees
    // on is the object's own and is kept, so a later nested call of the same library cannot change it
    // once the answer has been read before that call started.
    function runningAnswers(object) {
        var answers = [];
        for (var i = constructing.length - 1; i >= 0; i--) {
            var prototype = constructing[i].constructor.prototype;
            if (prototype && Object.prototype.isPrototypeOf.call(prototype, object)) {
                answers.push(constructing[i].standalone);
            }
        }
        return answers;
    }

    function agreed(answers) {
        return answers.length > 0 && answers.every(function (answer) { return answer === answers[0]; });
    }

    function standaloneFor(object) {
        if (standaloneOf.has(object)) {
            return standaloneOf.get(object);
        }
        var answers = runningAnswers(object);
        if (agreed(answers)) {
            standaloneOf.set(object, answers[0]);
        }
        return answers.length > 0 && answers[0];
    }

    function memberAccessor(name, get) {
        return {
            get: get,
            set: function (value) {
                Object.defineProperty(this, name, { value: value, writable: true, enumerable: true, configurable: true });
            },
            enumerable: true,
            configurable: true
        };
    }

    var accessors = {
        isRoot: memberAccessor('isRoot', function () {
            var object = this;
            var answer = isRootFunctions.get(object);
            if (!answer) {
                answer = function () {
                    return standaloneFor(object);
                };
                isRootFunctions.set(object, answer);
            }
            return answer;
        })
    };
    dispatcherMembers.forEach(function (name) {
        accessors[name] = memberAccessor(name, function () {
            return dispatcherOf(this)[name];
        });
    });

    function extendContentType(prototype, standalone) {
        if (prototype === null || (typeof prototype !== 'object' && typeof prototype !== 'function') || extendedPrototypes.has(prototype)) {
            return;
        }
        // standalone only reaches the ContentType's isRoot, which the accessor replaces.
        var contentTypePrototype = H5P.ContentType(standalone).prototype;
        // for...in includes the inherited xAPI helpers; `in` keeps every member
        // the library defines or inherits (class methods are non-enumerable).
        for (var key in contentTypePrototype) {
            if (key in prototype) {
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(accessors, key)) {
                Object.defineProperty(prototype, key, accessors[key]);
            }
            else {
                prototype[key] = contentTypePrototype[key];
            }
        }
        extendedPrototypes.add(prototype);
    }

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
        // Missing members only, so an H5P library can override H5P.ContentType functions.
        // !!!CyberShelf specific. To be able to implement libraries as classes: the prototype is kept.
        extendContentType(constructor.prototype, standalone);
        var instance;
        // A parent still in its constructor builds this child: record its answer
        // now, before the child's call joins the stack and makes the prototype
        // match ambiguous (a child of the same library). Only when every running
        // call it could belong to gives the same answer.
        var parent = extras.parent;
        if (parent && typeof parent === 'object' && !standaloneOf.has(parent)) {
            var answers = runningAnswers(parent);
            if (agreed(answers)) {
                standaloneOf.set(parent, answers[0]);
            }
        }
        constructing.push({ constructor: constructor, standalone: standalone });
        try {
            // Some old library versions have their own custom third parameter.
            // Make sure we don't send them the extras.
            // (they will interpret it as something else)
            if (H5P.jQuery.inArray(library.library, ['H5P.CoursePresentation 1.0', 'H5P.CoursePresentation 1.1', 'H5P.CoursePresentation 1.2', 'H5P.CoursePresentation 1.3']) > -1) {
                instance = new constructor(library.params, contentId);
            }
            else {
                instance = new constructor(library.params, contentId, extras);
            }
        }
        finally {
            constructing.pop();
        }
        standaloneOf.set(instance, standalone);
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
})();

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
