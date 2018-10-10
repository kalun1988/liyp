(function() {
    'use strict';
    S.DataManager = function() {
        var self = this;
        self.timer = 0;
        self.init();
    };

    var dataManager = {
        init: function() {
            var self = this;
            self.clear();
        },
        clear: function() {
            var self = this;
            self.timer = 0;
            self.store = {
                "x": {
                    "actual": [],
                    "display": []
                },
                "y": {
                    "actual": [],
                    "display": []
                },
                "z": {
                    "actual": [],
                    "display": []
                },
                "a0": {
                    "actual": [],
                    "display": []
                },
                "a1": {
                    "actual": [],
                    "display": []
                },
                "a2": {
                    "actual": [],
                    "display": []
                },
                "a3": {
                    "actual": [],
                    "display": []
                },
                "a4": {
                    "actual": [],
                    "display": []
                },
                "a5": {
                    "actual": [],
                    "display": []
                },
                "a6": {
                    "actual": [],
                    "display": []
                },
                "a7": {
                    "actual": [],
                    "display": []
                },
                "m": {
                    "actual": [],
                    "display": []
                },
                "t": {
                    "actual": [],
                    "display": []
                }
            };
            self.current = {
                "x": {
                    "actual": 0,
                    "display": 0
                },
                "y": {
                    "actual": 0,
                    "display": 0
                },
                "z": {
                    "actual": 0,
                    "display": 0
                },
                "a0": {
                    "actual": 0,
                    "display": 0
                },
                "a1": {
                    "actual": 0,
                    "display": 0
                },
                "a2": {
                    "actual": 0,
                    "display": 0
                },
                "a3": {
                    "actual": 0,
                    "display": 0
                },
                "a4": {
                    "actual": 0,
                    "display": 0
                },
                "a5": {
                    "actual": 0,
                    "display": 0
                },
                "a6": {
                    "actual": 0,
                    "display": 0
                },
                "a7": {
                    "actual": 0,
                    "display": 0
                },
                "m": {
                    "actual": 0,
                    "display": 0
                },
                "t": {
                    "actual": 0,
                    "display": 0
                }
            };
        },
        watch: function(data) {
            var self = this;
            //temporary store data to current
            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    self.current[k].actual = data[k];
                    if (k != "t") {
                        self.current[k].display = Math.round(data[k] * 100) / 100;
                    }
                }
            }
        },
        record: function(period) {
            var self = this;
            //push current to store
            for (var k in self.current) {
                if (self.current.hasOwnProperty(k)) {
                    if (k != "t") {
                        self.store[k].actual.push(self.current[k].actual);
                        self.store[k].display.push(self.current[k].display);
                    } else { //push time
                        var t = Math.round(self.timer*1000)/1000;
                        self.store[k].actual.push(t);
                        self.store[k].display.push(t);
                    }
                }
            }
            self.timer = self.timer + period;  //in ms
        }
    };
    S.DataManager.prototype = Object.create(dataManager);
}());
