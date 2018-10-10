"use strict";

var S={};       //global namespace
    S.found_devices = [];
    S.auto = false;
(function() {

    function state(msg){
        $("#state").html(msg);
    }
    function warn(msg, level) {
        if (typeof msg === "object") {
            msg = JSON.stringify(msg, null, "  ");
        }
        $("#warn").val(msg+"\n"+$("#warn").val());
    }

    function handleError(error) {
        console.log(error.error);
        console.log(error.message);
        var msg;
        if (error.error && error.message) {
            var errorItems = [];
            if (error.service) {
                errorItems.push("service: " + (uuids[error.service] || error.service));
            }
            if (error.characteristic) {
                errorItems.push("characteristic: " + (uuids[error.characteristic] || error.characteristic));
            }
            msg = "Error on " + error.error + ": " + error.message + (errorItems.length && (" (" + errorItems.join(", ") + ")"));
        } else {
            msg = error;
        }
        console.log(msg, "error");
        if (error.error === "read" && error.service && error.characteristic) {
            reportValue(error.service, error.characteristic, "Error: " + error.message);
        }
    }
    function reportValue(serviceUuid, characteristicUuid, value) {

        document.getElementById(serviceUuid + "." + characteristicUuid).textContent = value;
    }


    function main() {
    }



    //Life Cycle: Initalize
    function initializeSuccess(result) {
        console.log("initializeSuccess");
        state("Bluetooth: "+result.status);

        if (result.status === "enabled") {
            $("#btn-initialize-ble").addClass("hidden");
            $("#btn-request-location").removeClass("hidden");
            if(S.auto){
            	$("#btn-request-location").trigger("click");
            }
        }
    }
    function isLocationEnabledSuccess(result){
        console.log("isLocationEnabledSuccess");
        if(!result.isLocationEnabled){
            state("Location Service: disabled");
            bluetoothle.requestLocation(requestLocationSuccess, handleError);
        }else{
            state("Location Service: enabled");
            requestLocationSuccess({
                requestLocation:true
            });
        }
    }
    function requestLocationSuccess(result){
        console.log("requestLocationSuccess");
        if(result.requestLocation){
            state("Location Service: enabled");
            $("#btn-request-location").addClass("hidden");
            $("#btn-request-permission").removeClass("hidden");
            if(S.auto){
            	$("#btn-request-permission").trigger("click");
            }
        }
    }
    function hasPermissionSuccess(result){
        console.log("hasPermissionSuccess");
        if(!result.hasPermission){
            state("Location Permission: disallowed");
            bluetoothle.requestPermission(requestPermissionSuccess, handleError);
        }else{
            state("Location Permission: allowed");
            requestPermissionSuccess({
                requestPermission:true
            });
        }
    }
    function requestPermissionSuccess(result){
        console.log("requestPermissionSuccess");
        if(result.requestPermission){
            state("Location Permission: allowed");
            $("#btn-request-permission").addClass("hidden");
            $("#btn-start-scan").removeClass("hidden");
            if(S.auto){
            	$("#btn-start-scan").trigger("click");
            }

        }
    }

    $("#btn-init").click(function(){
        alert("start");

        
        $("#btn-initialize-ble").trigger("click");
    });
    $("#btn-initialize-ble").click(function(){
        bluetoothle.initialize(initializeSuccess, handleError, {
            "request": true,
            "statusReceiver": true,
            "restoreKey": "bluetoothleplugin"
        });
    });

    $("#btn-request-location").click(function(){
        bluetoothle.isLocationEnabled(isLocationEnabledSuccess, handleError);
    });

    $("#btn-request-permission").click(function(){
        bluetoothle.hasPermission(hasPermissionSuccess);
    });


    //Life Cycle: Scan


    function startScan() {
        state("Searching..."+S.config.device_name);
        S.found_devices = [];
        bluetoothle.startScan(startScanSuccess, handleError, {
            "services": null,   //whitelist
            "allowDuplicates": true,
            "scanMode": bluetoothle.SCAN_MODE_LOW_LATENCY,
            "matchMode": bluetoothle.MATCH_MODE_AGGRESSIVE,
            "matchNum": bluetoothle.MATCH_NUM_MAX_ADVERTISEMENT,
            "callbackType": bluetoothle.CALLBACK_TYPE_ALL_MATCHES,
        });
    }


    function startScanSuccess(result) {
        console.log("startScanSuccess");
        if (result.status === "scanStarted") {
            console.log("scanStarted");
        } else if (result.status === "scanResult") {
            if (!S.found_devices.some(function(device) {
                    return device.address === result.address;
            })) {
            	if(S.auto){
	            	if(result.name==S.config.device_name){		//whitelist device
		                S.found_devices.push(result);
		                var $button = addDevice(result.name, result.address);
						$button.trigger("click");
	            	}
            	}else{	//no whitelist
	                S.found_devices.push(result);
	                addDevice(result.name, result.address);
            	}
            }
        }
    }

    function addDevice(name, address, advertisment, rssi) {
        var $button = $("<button></button>")
            .addClass("btn btn-outline-primary btn-device")
            .addClass(address)
            .data("address",address)
            .data("advertisment",advertisment)
            .data("rssi",rssi)
            .data("name",name)
            .html(name+"-"+address)
            .wrap("<div class='col-8'></div>")
            .appendTo("#devices");
        $("<button></button>")
            .addClass("btn btn-device-disconnect")
            .data("address",address)
            .data("advertisment",advertisment)
            .data("rssi",rssi)
            .data("name",name)
            .html("Disconnect")
            .wrap("<div class='col-4'></div>")
            .appendTo("#devices");
         return $button;
    }


    function isScanning(result) {
        console.log(result.isScanning);
    }

    function stopScan() {
        new Promise(function(resolve, reject) {
            bluetoothle.stopScan(resolve, reject);
        }).then(stopScanSuccess, handleError);
    }

    function stopScanSuccess() {
        state("Scan Stopped");
        if (!S.found_devices.length) {
            console.log("NO DEVICES FOUND");
        } else {
            console.log("Found " + S.found_devices.length + " devices.", "status");
        }
    }

    $("#btn-start-scan").click(function(){
        startScan();
        $("#btn-start-scan").addClass("hidden");
        $("#btn-stop-scan").removeClass("hidden");
    });
    $("#btn-stop-scan").click(function(){
        stopScan();
        $("#btn-stop-scan").addClass("hidden");
        $("#btn-start-scan").removeClass("hidden");
    });



    //Life Cycle: Connect

    function connect() {
        console.log('Connecting to device: ' + S.address + "...", "status");
        stopScan();
        state("Connecting ...");
        new Promise(function(resolve, reject) {
            bluetoothle.connect(resolve, reject, { address: S.address });
        }).then(connectSuccess, handleError);
    }
    function connectSuccess(result) {
        console.log("connect success");
        state("Connected");
        if (result.status === "connected") {
            getDeviceServices(result.address);
        } else if (result.status === "disconnected") {
            console.log("Disconnected from device: " + result.address, "status");
        }
    }

    function getDeviceServices(address) {
        console.log("Getting device services");
        new Promise(function(resolve, reject) {
            bluetoothle.discover(resolve, reject, { address: address });
        }).then(discoverSuccess, handleError);
    }

    function discoverSuccess(result) {
        console.log("discoverSuccess");
        console.log(result);
        console.log("Discover returned with status: " + result.status);
        var html="";
        if (result.status === "discovered") {
            html+="address:"+result.address+"<br />";
            html+="name:"+result.name+"<br />";


            for(var s in result.services){
            	var $service_card = $("#temp").find(".card-service").clone();
            	$service_card
            	.find(".card-header").html("service uuid:"+result.services[s].uuid)
            	.find(".card-body").html("")
            	.appendTo("#services");
            	for(var c in result.services[s].characteristics){
            		var $characteristic_btn = $("#temp").find(".btn-characteristic").clone();
            		$characteristic_btn
            		.data("service",result.services[s].uuid)
            		.data("characteristic",result.services[s].characteristics[c].uuid)
            		.addClass(result.services[s].uuid+"-"+result.services[s].characteristics[c].uuid)		//add class serviceUUID-charUUID
            		.html("characteristic uuid:"+result.services[s].characteristics[c].uuid)
            		.appendTo($service_card.find(".card-body"));
        		    if(result.services[s].characteristics[c].descriptors){
                        $("<span>Descriptors:"+result.services[s].characteristics[c].descriptors+"</span>")
            			.appendTo($service_card.find(".card-body"));
            			console.log(result.services[s].characteristics[c].Descriptors);
                    }
                    if(result.services[s].characteristics[c].properties.read){
                        $("<span class='label label-success'>read</span>")
            			.appendTo($service_card.find(".card-body"));
                    }
                    if(result.services[s].characteristics[c].properties.write){
                        $("<span class='label label-success'>write</span>")
            			.appendTo($service_card.find(".card-body"));
                    }
                    if(result.services[s].characteristics[c].properties.notify){
                        $("<span class='label label-success'>notify</span>")
            			.appendTo($service_card.find(".card-body"));
                    }

            	}
            	$service_card
            	.appendTo("#services");
            }
        }

        if(S.auto){
        	$("."+S.config.read_characteristic).trigger("click");
        	$("#field-write").val("rd");
        	$("#btn-write").trigger("click");
        }
    }

    $(".app").on("click",".btn-device",function(){
        S.address = $(this).data("address");
        connect();
    });
    $(".app").on("click",".btn-device-disconnect",function(){
        $("#services").html("");
        disconnect();
    });

    $(".app").on("click",".btn-characteristic",function(){
        S.service = $(this).data("service");
        S.characteristic = $(this).data("characteristic");
    });


    //Life Cycle: Read / Write



    function write(string) {
        var bytes = bluetoothle.stringToBytes(string);
        var encodedString = bluetoothle.bytesToEncodedString(bytes);
        bluetoothle.write(function() {
            writeSuccess();
        }, function(error) {
            console.log("write error");
            console.log(error);
        }, {
            "value": encodedString,
            "service": S.service, //from log result of discoverSuccess
            "characteristic": S.characteristic,
            "type": "noResponse",
            "address": S.address
        });

    }
    function writeSuccess(){
    	console.log("write success");
    	if(S.auto){
    		$("."+S.config.write_characteristic).trigger("click");
    		$("#btn-read").trigger("click");
    	}
    }


    function read() {
        var readSequence = Promise.resolve();
        readSequence = readSequence.then(function() {
            return new Promise(function(resolve, reject) {
                bluetoothle.read(resolve, reject, { address: S.address, service: S.service, characteristic: S.characteristic });
            }).then(readSuccess, handleError);
        });
    }
    function readSuccess(result) {
        console.log(result);
        bluetoothle.subscribe(subscribeSuccess, handleError, {
          "address": S.address,
          "service": S.service,
          "characteristic": S.characteristic, //GSJ required
        });
        $("#modal-init").hide();        //should place at better place
    }
    function subscribeSuccess(result) {
        // console.log(bluetoothle.encodedStringToBytes(result.value));
        var arr=bluetoothle.encodedStringToBytes(result.value);
        S.ble_raw_data="";
        $("#value-read").html("");
        for(var i in arr){
            // ble_raw_data+=arr[i]+"|";
            S.ble_raw_data+=String.fromCharCode(arr[i]);
        }
        S.value1 = S.ble_raw_data.substring(2).split(",")[0];
        S.value2 = S.ble_raw_data.substring(2).split(",")[1].split(";")[0];
        S.value2 = parseInt(S.value2)/1000;
        //for testing
        // S.value2 = Math.floor((Math.random() * 100) + 100);     
        $("#value-read-1").html(S.value1);
        $("#value-read-2").html(S.value2);
    }

    $("#btn-write").click(function(){
        write($("#field-write").val());
    });
    $("#btn-read").click(function() {
        read();
    });


    //Life Cycle: Disconnect

    function disconnect() {
        state("Disconnecting ...");
        new Promise(function(resolve, reject) {
            bluetoothle.disconnect(resolve, reject, { address: S.address });
        }).then(disconnectSuccess, handleError);
    }
    function disconnectSuccess(result) {
        state("Disconnected");
        close();
    }

    //Life Cycle: Close

    function close() {
        state("Closing ...");
        new Promise(function(resolve, reject) {
            bluetoothle.close(resolve, reject, { address: S.address });
        }).then(closeSuccess, handleError);
    }
    function closeSuccess(result) {
        state("Closed");
    }



    if (window.cordova) {
        document.addEventListener("deviceready", main);

    }
})();
