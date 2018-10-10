(function() {
    'use strict';
    $(document).ready(function() {

        //init
        S.display_x = true;
        S.display_y = true;
        S.display_z = true;
        S.display_m = true;
        S.zoom_factor = 1;
        setTimeout(function() {
            $("#y_axis").css("margin-left", -$("#y_axis").height() / 2 + 10);
        }, 100);

        function reset() {
            $("#start-btn").removeClass("disabled");
            $("#stop-btn").addClass("disabled");
            $("#reset-btn").addClass("disabled");
            $("#save-btn").addClass("disabled");
            S.sensor.dm.clear();
            plot();
        }

        // function plot() {
        //     S.max_magnitude = 0;
        //     var dataset = [];
        //     if (S.display_x) {
        //         dataset.push({
        //             // label: "data1",
        //             data: constructCurve(S.sensor.dm.store.x.actual),
        //             color: "#ff0000",
        //             lines: { show: true, fill: false }
        //         });
        //     }
        //     if (S.display_y) {
        //         dataset.push({
        //             // label: "data1",
        //             data: constructCurve(S.sensor.dm.store.y.actual),
        //             color: "#0000ff",
        //             lines: { show: true, fill: false }
        //         });
        //     }
        //     if (S.display_z) {
        //         dataset.push({
        //             // label: "data1",
        //             data: constructCurve(S.sensor.dm.store.z.actual),
        //             color: "#00ff00",
        //             lines: { show: true, fill: false }
        //         });
        //     }
        //     if (S.display_m) {
        //         dataset.push({
        //             // label: "data1",
        //             data: constructCurve(S.sensor.dm.store.m.actual),
        //             color: "#000000",
        //             lines: { show: true, fill: false }
        //         });
        //     }
        //     S.plot = $.plot("#placeholder", dataset, {
        //         series: {
        //             shadowSize: 0 // Drawing is faster without shadows
        //         },
        //         yaxis: {
        //             min: -Math.ceil(S.max_magnitude)/S.zoom_factor,
        //             max: Math.ceil(S.max_magnitude)/S.zoom_factor
        //         },
        //         xaxis: {
        //             show: false
        //         },
        //         grid: {
        //             show: true,
        //             color: "#FFFFFF",
        //             backgroundColor:"#CCCCCC",
        //             borderColor:"FFFFFF",
        //             borderWidth:2,  
        //             clickable: false,
        //             hoverable: false

        //         }
        //     });
        // }

        // function constructCurve(dataArray) { //appending index to form array for plot
        //     var resultArray = [];
        //     var offset = 0;
        //     if (dataArray.length > 300) {
        //         offset = dataArray.length - 300;
        //     }
        //     for (var i = offset; i <= offset + 300; i++) {
        //         if (Math.abs(dataArray[i - 1]) > S.max_magnitude) {
        //             S.max_magnitude = Math.abs(dataArray[i - 1]);
        //         }
        //         resultArray.push([i, dataArray[i - 1]]); //can be improved
        //     }
        //     return resultArray;
        // }

        // S.initRecordInterval = function() {
        //     var period = 1 / S.sampling_rate;
        //     S.sensor.inte = setInterval(function() {
        //         if(typeof S.sensor.dm !== 'undefined'){
        //             S.sensor.dm.record(period);
        //             S.sensor.cnt++;
        //             if (S.sensor.cnt % 2 === 0) { //for reducing lag effect on plotting
        //                 plot();
        //                 S.sensor.cnt = 0;
        //             }
        //         }
        //     }, period); //record rate
        // }
        // S.destroyRecordInterval = function() {
        //     clearInterval(S.sensor.inte);
        // }

        $("#start-btn").click(function() {
            if (!$(this).hasClass("disabled")) {
                $("#start-btn").addClass("disabled");
                $("#stop-btn").removeClass("disabled");
                $("#reset-btn").addClass("disabled");
                $("#save-btn").addClass("disabled");
                S.sensor.status = "start";
                $("#sensor-status").addClass("on");
                S.initRecordInterval();
                S.sensor.tm.startTimer();
            }
        });
        $("#stop-btn").click(function() {
            if (!$(this).hasClass("disabled")) {
                $("#start-btn").removeClass("disabled");
                $("#stop-btn").addClass("disabled");
                $("#reset-btn").removeClass("disabled");
                $("#save-btn").removeClass("disabled");
                S.sensor.status = "stop";
                S.destroyRecordInterval();
                $("#sensor-status").removeClass("on");
                S.sensor.tm.stopTimer();
            }
        });

        $("#reset-btn").click(function() {
            if (!$(this).hasClass("disabled")) {
                reset();
                S.sensor.status = "stop";
                S.sensor.tm.resetTimer();
            }
        });
        $("#save-btn").click(function() {
            if (!$(this).hasClass("disabled")) {
                $('#modal-data-save').modal('show');
            }
        });
        $('#modal-data-save').on('shown.bs.modal', function(e) {
            var filename = "";

            function getDateTime() {
                var now = new Date();
                var year = now.getFullYear();
                var month = now.getMonth() + 1;
                var day = now.getDate();
                var hour = now.getHours();
                var minute = now.getMinutes();
                var second = now.getSeconds();
                if (month.toString().length == 1) {
                    var month = '0' + month;
                }
                if (day.toString().length == 1) {
                    var day = '0' + day;
                }
                if (hour.toString().length == 1) {
                    var hour = '0' + hour;
                }
                if (minute.toString().length == 1) {
                    var minute = '0' + minute;
                }
                if (second.toString().length == 1) {
                    var second = '0' + second;
                }
                var dateTime = year + month + day + '_' + hour + minute + second;
                return dateTime;
            }
            filename += getDateTime();
            // filename += S.current_sensor + "_";
            // filename += S.sampling_rate + "Hz";
            $('#modal-data-save').find("#filename").val(filename);
        })

        $("#display_x").click(function() {
            if (!S.display_x) {
                S.display_x = true;
            } else {
                S.display_x = false;
            }
            if(S.sensor.status == "stop"){
                plot();
            }
        });
        $("#display_y").click(function() {
            if (!S.display_y) {
                S.display_y = true;
            } else {
                S.display_y = false;
            }
            if(S.sensor.status == "stop"){
                plot();
            }
        });
        $("#display_z").click(function() {
            if (!S.display_z) {
                S.display_z = true;
            } else {
                S.display_z = false;
            }
            if(S.sensor.status == "stop"){
                plot();
            }
        });
        $("#display_m").click(function() {
            if (!S.display_m) {
                S.display_m = true;
            } else {
                S.display_m = false;
            }
            if(S.sensor.status == "stop"){
                plot();
            }
        });

        //handle graph hammer
            // $("#graph").hammer({
            //     "threshold":1
            // }).bind("panup", function(){
            //     if(S.sensor.status == "stop"){
            //         S.zoom_factor+=0.2;
            //         plot();
            //     }
            // });
            // $("#graph").hammer({
            //     "threshold":1
            // }).bind("pandown", function(){
            //     if(S.sensor.status == "stop"){
            //         if(Math.ceil(S.max_magnitude)+S.zoom_factor>0.1){
            //             S.zoom_factor-=0.2;
            //             plot();
            //         }
            //     }
            // });



            $( "#slider" ).slider({
                orientation: "vertical",
                min: 1,
                max:100,
                step: 5,
                slide: function( event, ui ) {
                    // ui.value 0-100
                    if(Math.ceil(S.max_magnitude)/ui.value>0){
                        S.zoom_factor=ui.value;
                        plot();
                    }
                }
            });

    });
}());
