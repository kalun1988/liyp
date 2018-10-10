"use strict";

    S.found_devices = [];
    S.auto = false;
    S.ble_buffer =""; //use on HC-05 send 20 characters each tim case
    S.ble_buffer_prepending = false;
    S.register_queue = [];
    S.register_queue_index = 0;

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
		if (typeof(universalLinks) != "undefined"){
			universalLinks.subscribe('qrEvent', function (eventData) {
			  register(S.registering_device_name,eventData.params.code);
			});
		}
    }

/*
////////////////////////
Register BOX
////////////////////////
*/


    //should make a BleManager and put these back to modal init
        $("body").on("click",".btn_register_by_enter_address",function(){
            var prefilled_address = S.config.devices[$(".btn_register_by_enter_address").index($(this))].prefilled_address;
            if(!$(this).hasClass("entered")){
                var target_address = prompt("Please enter sensor address", prefilled_address);
                if(target_address!=null){
                    register($(this).data("device-name"),target_address);
                }
                $(this).data("address",target_address).addClass("entered").html(target_address);
            }else{
                location.reload();
            }
        });
        $("body").on("click",".btn_register_by_scan_qr",function(){
            S.registering_device_name = $(this).data("device-name");
            var url =encodeURIComponent( "http://ap.polyu.edu.hk/labpocket?code={CODE}");
            window.location ="http://zxing.appspot.com/scan?ret=" + url + "&SCAN_FORMATS=QR_CODE_MODE";
        });

	$("#btn-hide").click(function(){
		
			$("#modal-init").hide();
	});
	$("#btn-start-connect").click(function(){
		$("#btn-initialize-ble").trigger('click');
	});
    function register(name, address){
    	S.register_queue.push({
            name:name,
            address:address
        });
    	// $("#address_list").append(address+"<br />");
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
        state("Searching...");
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
        // console.log("startScanSuccess");
        if (result.status === "scanStarted") {
            console.log("scanStarted");
        } else if (result.status === "scanResult") {
            if (!S.found_devices.some(function(device) {
                    return device.address === result.address;
            })) {
            	if(S.auto){
            		
	            	if(result.address==S.register_queue[S.register_queue_index].address){		//whitelist device
		                
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

    function connect(address) {
        console.log('Connecting to device: ' + address + "...", "status");
       // stopScan();	//problem here
        state("Connecting ...");
        new Promise(function(resolve, reject) {
            bluetoothle.connect(resolve, reject, { address: address });
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
            // html+="address:"+result.address+"<br />";
            // html+="name:"+result.name+"<br />";

            $("#services").append("<h3>"+result.name+"</h3>");
            $("#services").append("<p>"+result.address+"</p>");

            for(var s in result.services){
            	var $service_card = $("#store-ble-config").find(".card-service").clone();
            	$service_card
            	.find(".card-header").html("service uuid:"+result.services[s].uuid)
            	.find(".card-body").html("")
            	.appendTo("#services");
            	for(var c in result.services[s].characteristics){
            		var $characteristic_btn = $("#store-ble-config").find(".btn-characteristic").clone();
            		$characteristic_btn
            		.data("address",result.address)
            		.data("service",result.services[s].uuid)
            		.data("characteristic",result.services[s].characteristics[c].uuid)
                    .addClass(result.services[s].characteristics[c].uuid.toLowerCase())       //add class charUUID (for StandardBLE case)
                    .addClass(result.services[s].uuid+"-"+result.services[s].characteristics[c].uuid)       //add class serviceUUID-charUUID
            		.addClass(result.address.replace(/:/g, "")+"-"+result.services[s].uuid+"-"+result.services[s].characteristics[c].uuid)		//add class address(remove:)-serviceUUID-charUUID
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
            $("#services").append("<div class='clearfix'></div>");
        }

        if(S.auto){
            if(S.config.name!="BLEStandard"){
        	   $("."+S.config.read_characteristic).trigger("click");
            	$("#field-write").val("rd"); 
            	$("#btn-write").trigger("click");
            }else{  //bypass write command 'rd'
            console.log("skipped");
                writeSuccess();
            }
        }
    }

    $(".app").on("click",".btn-device",function(){
        connect($(this).data("address"));
    });
    $(".app").on("click",".btn-device-disconnect",function(){
        $("#services").html("");
        disconnect();
    });

    $(".app").on("click",".btn-characteristic",function(){
        S.address = $(this).data("address");
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
            "address": S.address	//problem go array
        });

    }
    function writeSuccess(){
    	console.log("write success");
    	if(S.auto){
            if(S.config.name=="BLEStandard"){

                $("."+S.config.devices[0].write_characteristic[0]).trigger("click");
                $("#btn-read").trigger("click");
                setTimeout(function(){
                    $("."+S.config.devices[0].write_characteristic[1]).trigger("click");
                    $("#btn-read").trigger("click");
                },2000);
                setTimeout(function(){
                    $("."+S.config.devices[0].write_characteristic[2]).trigger("click");
                    $("#btn-read").trigger("click");
                },4000);
                setTimeout(function(){
                    $("."+S.config.devices[0].write_characteristic[3]).trigger("click");
                    $("#btn-read").trigger("click");
                },6000);
                setTimeout(function(){
                    $("."+S.config.devices[0].write_characteristic[4]).trigger("click");
                    $("#btn-read").trigger("click");
                },8000);
                setTimeout(function(){
                    $("."+S.config.devices[0].write_characteristic[5]).trigger("click");
                    $("#btn-read").trigger("click");
                },10000);
                //should use register queue concept

            }else{
                $("."+S.config.write_characteristic).trigger("click");
                console.log(S.config.write_characteristic);
                $("#btn-read").trigger("click");

                //for connect next device or stopscan
            }
            if(S.register_queue_index<S.register_queue.length-1){
                S.register_queue_index ++;
            }else{
                console.log("stopScan");
                stopScan();
                $("#modal-init").hide();
            }
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
        //create an element for display value
        $("#result").append("<div id='"+result.name.replace(/ /g,'')+"-"+result.service+"-"+result.characteristic+"'></div>");
        bluetoothle.subscribe(subscribeSuccess, handleError, {
          "address": S.address,
          "service": S.service,
          "characteristic": S.characteristic, //GSJ required
        });
    }
    function subscribeSuccess(result) {
        // console.log(bluetoothle.encodedStringToBytes(result.value));

        //depends on name (remove space)
        var $target = $("#"+result.name.replace(/ /g,'')+"-"+result.service+"-"+result.characteristic);
        
        var arr=bluetoothle.encodedStringToBytes(result.value);
        S.ble_raw_data="";
        for(var i in arr){
            // ble_raw_data+=arr[i]+"|";
            S.ble_raw_data+=String.fromCharCode(arr[i]);
        }

        var device_index = S.devices.indexOf(result.name);
        // console.log("subscribeSuccess");
        //UPDATE HERE NEXT TIME
        if(S.config.name=="em"){


            if(device_index==0){    //Hall Sensor
                $(".ble_raw_data").eq(0).html(S.ble_raw_data);
                S.values[0] =parseFloat(S.ble_raw_data.substring(2).split(";")[0])+S.zeros[0]; //for deubg 
                // S.value1 = S.value1 /10000;  //Gauss
            }else{  //Current Sensor
                $(".ble_raw_data").eq(1).html(S.ble_raw_data);
                S.values[1] = parseFloat(S.ble_raw_data.substring(2).split(";")[0])+S.zeros[1]; //for deubg
            }

            
        }else if(S.config.name=="gas_law"){



            S.values[0] = parseFloat(S.ble_raw_data.substring(2).split(",")[0])+S.zeros[0];
            S.values[1] = S.ble_raw_data.substring(2).split(",")[1].split(";")[0];
            S.values[1] = parseInt(S.values[1])/1000+S.zeros[1];



        }else if(S.config.name=="environment"){ 
            if(!S.auto){    //debug
                var previous_data = $("#debug_raw_data").val();
                previous_data = result.name+":"+ S.ble_raw_data + "\n" + previous_data;
                $("#debug_raw_data").val(previous_data);
            }else{
                if(device_index==0){    //EnvironmentA
                    $(".ble_raw_data").eq(0).html(S.ble_raw_data);
                    S.values[0] = S.ble_raw_data.substring(2).split(",")[0];
                    S.values[1] = S.ble_raw_data.substring(2).split(",")[1];
                    S.values[2] = S.ble_raw_data.substring(2).split(",")[1].split(";")[0];
                }else{   //EnvironmentB
                    $(".ble_raw_data").eq(1).html(S.ble_raw_data);
                    S.values[3] = S.ble_raw_data.substring(2).split(",")[0];
                    S.values[4] = S.ble_raw_data.substring(2).split(",")[1];
                    S.values[5] = S.ble_raw_data.substring(2).split(",")[1];
                    S.values[6] = S.ble_raw_data.substring(2).split(",")[1];
                    S.values[7] = S.ble_raw_data.substring(2).split(",")[1].split(";")[0];
                }
            }
        }else if(S.config.name=="Universal Reader"){
            if(!S.auto){    //debug
                var previous_data = $("#debug_raw_data").val();
                previous_data = result.name+":"+ S.ble_raw_data + "\n" + previous_data;
                $("#debug_raw_data").val(previous_data);
            }else{
                    
                    if(S.ble_raw_data.indexOf("|")==-1){ //NOT consist | in 20 characters
                        S.ble_buffer += S.ble_raw_data.substring(S.ble_raw_data.indexOf("|"));  //middle
                    }else{
                        S.ble_buffer += S.ble_raw_data.substring(S.ble_raw_data.indexOf("|"),0);    //tail
                        //assign to S.values
                            S.values[0] = S.ble_buffer.split(",")[0];   //A0
                            S.values[1] = S.ble_buffer.split(",")[1];   //A1
                            S.values[2] = S.ble_buffer.split(",")[2];   //A2
                            S.values[3] = S.ble_buffer.split(",")[3];   //A3
                            S.values[4] = S.ble_buffer.split(",")[4];   //A4
                            S.values[5] = S.ble_buffer.split(",")[5];   //A5
                            $(".ble_raw_data").eq(0).html(S.ble_buffer);


                        //Data processing
                        //1)normalization: (v-min)*100/(max-min)
                        //2)multiply
                            // S.values[0] = S.values[0]*100/1024;

                        //reset
                        S.ble_buffer = S.ble_raw_data.substring(S.ble_raw_data.indexOf("|")+1); //head
                    }
            }

        }else if(S.config.name=="BLEStandard"){
            if(!S.auto){    //debug
                var previous_data = $("#debug_raw_data").val();
                previous_data = result.name+":"+ S.ble_raw_data + "\n" + previous_data;
                $("#debug_raw_data").val(previous_data);
            }
            if(result.characteristic.toLowerCase()==S.config.devices[0].write_characteristic[0]){
                S.values[0] =parseFloat(S.ble_raw_data); 
            }
            else if(result.characteristic.toLowerCase()==S.config.devices[0].write_characteristic[1]){
                S.values[1] =parseFloat(S.ble_raw_data); 
            }
            else if(result.characteristic.toLowerCase()==S.config.devices[0].write_characteristic[2]){
                S.values[2] =parseFloat(S.ble_raw_data); 
            }
            else if(result.characteristic.toLowerCase()==S.config.devices[0].write_characteristic[3]){
                S.values[3] =parseFloat(S.ble_raw_data); 
            }
            else if(result.characteristic.toLowerCase()==S.config.devices[0].write_characteristic[4]){
                S.values[4] =parseFloat(S.ble_raw_data); 
            }
            else if(result.characteristic.toLowerCase()==S.config.devices[0].write_characteristic[5]){
                S.values[5] =parseFloat(S.ble_raw_data); 
            }
        }

        watch(S.values);	//only 1 value will be updated each time


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
