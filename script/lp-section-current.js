S.color_array =["#FFFF00","#00FFFF"];
	setInterval(function(){
		if(S.sensor.dm){
			S.sensor.dm.record(30);
			time_plot([
                S.sensor.dm.store.a0.display,
                S.sensor.dm.store.a1.display,
                S.sensor.dm.store.a2.display,
                S.sensor.dm.store.a3.display,
                S.sensor.dm.store.a4.display,
                S.sensor.dm.store.a5.display,
                S.sensor.dm.store.a6.display,
                S.sensor.dm.store.a7.display
                ]); 
		}
	},30);



function time_plot(data) {
	S.display_t = false;
	S.display_x = false;
	S.display_y = false;
	S.display_z = false;
	S.display_m = false;
    S.max_magnitude = 0;
    var dataset = [];


dataset.push({
            data: constructCurve(data[0]), 
            color: S.color_array[0],
            lines: {
                show: true,
                fill: false,
                lineWidth:3
            }
        });
        dataset.push({
            data: constructCurve(data[1]),
            color: S.color_array[1],
            lines: {
                show: true,
                fill: false,
                lineWidth:3
            },
            yaxis: 2
        });
 S.plot = $.plot("#time_placeholder", 
 dataset, {
        series: {
            shadowSize: 0 // Drawing is faster without shadows
        },
        grid:{
            show:true,
            borderWidth:0
        },
        yaxes : [
        {
            position: "left",
            tickFormatter: function (val, axis) {
			    return parseInt(val*10)/10;
			}
            //min: 0, max: 1		//for zooming
        }, {
            position: "right",
            tickFormatter: function (val, axis) {
			    return parseInt(val*10)/10;
			}
        }],
        xaxis:{
            show:true,
             tickSize:100
        }
    });




}


function constructCurve(dataArray) { //appending index to form array for plot
    var resultArray = [];
    var offset = 0;
    if (dataArray.length > 300) {
        offset = dataArray.length - 300;
    }
    for (var i = offset; i <= offset + 300; i++) {
        if (Math.abs(dataArray[i - 1]) > S.max_magnitude) {
            S.max_magnitude = Math.abs(dataArray[i - 1]);
        }
        resultArray.push([i, dataArray[i - 1]]); //can be improved
    }
    return resultArray;
}

$(document).ready(function(){



    for(var i in S.measurments){
        var $html = $("#result-text-store").find(".content").clone();
        $html.find(".value_label").html(S.measurments[i].name+" "+S.measurments[i].unit);
        $("#result-text").append($html);
    }

    $("#result-text").find(".content").each(function(i){
        $(this).css("color",S.color_array[i]);
        console.log("color");
        console.log(S.color_array[i]);
    });

	$("#result-text").find(".btn-sz").click(function(){
		$self = $(this);
		var i = $("#result-text").find(".btn-sz").index($self);
		S.zeros[i] -= parseInt(S.values[i]*100)/100;		//user set zero

	});

    //Next Config Driven
    $("#btn_sz").click(function(){
        var class_name = S.register_queue[1].address.replace(/:/g, "")+"-"+S.config.read_characteristic;
        $("."+class_name).trigger("click");
        $("#field-write").val("sz");
        $("#btn-write").trigger("click");
    });
    $("#btn_fon").click(function(){
        var class_name = S.register_queue[0].address.replace(/:/g, "")+"-"+S.config.read_characteristic;
        $("."+class_name).trigger("click");
        $("#field-write").val("fo");
        $("#btn-write").trigger("click");
    });
    $("#btn_foff").click(function(){
        var class_name = S.register_queue[0].address.replace(/:/g, "")+"-"+S.config.read_characteristic;
        $("."+class_name).trigger("click");
        $("#field-write").val("fc");
        $("#btn-write").trigger("click");
    });
});