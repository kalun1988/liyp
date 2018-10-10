(function() {
    'use strict';
    S.FileManager = function(cb) {
        var self = this;
        self.fileSystem = null;
        self.dataDirectory = null;
        self.fileEntry = null;
        self.fileList = [];
        self.init(cb);
    };

    var fileManager = {
        init: function(cb) {
            var self = this;
            //IOS
            var dataDirectory = cordova.file.dataDirectory;
            if (device.platform == "Android") {
                dataDirectory = cordova.file.externalDataDirectory;
            }
            window.resolveLocalFileSystemURL(dataDirectory, function(fileSystem) {
                self.fileSystem = fileSystem;
                self.fileSystem.getDirectory("data", { create: true }, function(directory) {
                    self.dataDirectory = directory;
                    cb();
                });
            }, self.onError);
        },
        get: function(fileName, cb) {
            var self = this;
            self.fileSystem.getFile(self.dataDirectory.fullPath + fileName, { create: true }, function(file) {
                self.fileEntry = file;
                cb();
            });
        },
        write: function(fileName, content, cb) {
            var self = this;
            self.get(fileName, function() {
                self.fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = function() {
                        cb();
                    };
                    fileWriter.onerror = function(e) {
                        alert("Failed file write: " + e.toString());
                    };
                    fileWriter.write(new Blob([content], { type: 'text/plain' }));
                });
            });
        },
        read: function(fileName, cb) {
            var self = this;
            self.get(fileName, function() {
                self.fileEntry.file(function(file) {
                    var reader = new FileReader();
                    reader.onloadend = function(evt) {
                    	console.log(evt);
                    	console.log(self.fileEntry.fullPath);
                        window.plugins.socialsharing.share('share', 'App Data', evt.target.result);
                        // alert("File Saved \n" + self.fileEntry.fullPath + ": \n" + this.result);
                    };
                    reader.readAsDataURL(file);
                }, function(err) {
                    alert(err);
                });
            });
        },
        extractCSVToArray: function(fileName, cb) {
            var self = this;
            self.get(fileName, function() {
                self.fileEntry.file(function(file) {
                    var reader = new FileReader();
                    reader.onloadend = function() {
                        //convert csv to array
                        var return_array;
                        return_array = CSVToArray(this.result);
                        return_array = transposingArray(return_array);
                        // alert(JSON.stringify(return_array));
                        cb(return_array);
                    };
                    reader.readAsText(file);
                }, function(err) {
                    alert(err);
                });
            });
        },
        list: function(cb) {
            var self = this;
            var result_array = [];
            var current_name;
            var current_entry;
            var i = 0;
            var files;
            var reader = self.dataDirectory.createReader();
            reader.readEntries(
                function(entries) {
                    files = entries;
                    next(); //must do it one by one, otherwises send/delete wrong file
                },
                function(err) {
                    alert(err);
                }
            );

            function onMetaSuccess(meta) {
                result_array.push({
                    name: current_name,
                    modificationTime: meta.modificationTime,
                    size: meta.size
                });
                i++;
                next();
            }

            function next() {
                if (i < files.length) {
                    self.fileList.push(files[i]);
                    current_name = files[i].name;
                    files[i].getMetadata(onMetaSuccess);
                } else {
                    cb(result_array);
                }
            }

        },
        deleteFileInList: function(index_array) {
            var self = this;
            var attachment_array = [];
            var remove = function(i, index_array) {
                self.fileList[index_array[i]].remove(function() {
                    alert("File deleted");
                    location.reload();
                }, function() {
                    alert("deleted fail");
                });
            };
            for (var i in index_array) {
                remove(i, index_array);
            }
        },
        emailFileInList: function(index_array) {
            var self = this;
            var attachment_array = [];
            for (var i in index_array) {
                attachment_array.push(self.fileList[index_array[i]].toURL());
            }
            cordova.plugins.email.open({
                to: '',
                subject: 'Data',
                body: '<h1>Data is attached</h1>',
                attachments: attachment_array,
                isHtml: true
            });

        },
        shareFileInList: function(index_array) {
            var self = this;
            var attachment_array = [];
            for (var i in index_array) {
                attachment_array.push(self.fileList[index_array[i]].toURL());
            }

            window.plugins.socialsharing.share('share', 'App Data', attachment_array);
            

        },
        moveFile: function(fullPath, cb) {
            var self = this;
            alert(fullPath);
            self.fileSystem.getFile(fullPath, { create: true }, function(file) {
                self.fileEntry = file;
                alert(JSON.stringify(self.fileEntry));
                cb();
            },function(err){
                alert(JSON.stringify(err)); //ABORT_ERR

            });
        },
        onError: function(err) {
            alert("error:" + err);
        }
    };


    S.FileManager.prototype = Object.create(fileManager);


}());

function CSVToArray(strData, strDelimiter) {
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
    );


    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [
        []
    ];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;


    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec(strData)) {

        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[1];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
        ) {

            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push([]);

        }

        var strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[2]) {

            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[2].replace(
                new RegExp("\"\"", "g"),
                "\""
            );

        } else {

            // We found a non-quoted value.
            strMatchedValue = arrMatches[3];

        }


        // Now that we have our value string, let's add
        // it to the data array.

        //convert string to float
        strMatchedValue = parseFloat(strMatchedValue);

        arrData[arrData.length - 1].push(strMatchedValue);
    }

    // Return the parsed data.
    return (arrData);
}

function transposingArray(array) {
    var newArray = array[0].map(function(col, i) {
        return array.map(function(row) {
            return row[i]
        })
    });
    return newArray;
}
