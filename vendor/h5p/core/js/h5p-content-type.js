/**
 * H5P.ContentType is a base class for all content types. Used by newRunnable()
 *
 * Functions here may be overridable by the libraries. In special cases,
 * it is also possible to override H5P.ContentType on a global level.
 *
 * NOTE that this doesn't actually 'extend' the event dispatcher but instead
 * it creates a single instance which all content types shares as their base
 * prototype. (in some cases this may be the root of strange event behavior)
 *
 * @class
 * @augments H5P.EventDispatcher
 */
H5P.ContentType = function (isRootLibrary) {

    function ContentType() { }

    // Inherit from EventDispatcher.
    ContentType.prototype = new H5P.EventDispatcher();

    /**
     * Is library standalone or not? Not beeing standalone, means it is
     * included in another library
     *
     * @return {Boolean}
     */
    ContentType.prototype.isRoot = function () {
        return isRootLibrary;
    };

    /**
     * Returns the file path of a file in the current library
     * @param  {string} filePath The path to the file relative to the library folder
     * @return {string} The full path to the file
     */
    ContentType.prototype.getLibraryFilePath = function (filePath) {
        // Grigory
        if (window.ActivePackage) {
            // здесь у открытого пакета запрашиваем библиотеку по "this.libraryInfo.versionedNameNoSpaces"
            // (это фактически "libtoken"), и оттуда получаем ObjectURL файла !!! 
            const lib = window.ActivePackage.getActiveLibrary(this.libraryInfo.versionedNameNoSpaces);
            if (!lib) return "";

            //return (lib) ? lib.getObjectURL(filePath) : "";
            return (filePath) ? lib.getObjectURL(filePath) : lib.token + "/"; // 2024-02-04 Grigory !
        }

        //
        // Native H5P code
        //

        return H5P.getLibraryPath(this.libraryInfo.versionedNameNoSpaces) + '/' + filePath;
    };

    return ContentType;
};
