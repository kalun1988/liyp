(function() {
    'use strict';
    $(document).ready(function() {
        
        //save data modal
        $('#modal-data-save').on('shown.bs.modal', function() {
            $('#modal-data-save').find("#filename").focus();

            S.sensor.preview_data_table = "<table>";
            S.sensor.preview_data_table += "<tr>";
            S.sensor.preview_data_table += "<th>Time sec</th>";
            for(var m in S.measurments){
                S.sensor.preview_data_table += "<th>"+S.measurments[m].name+" "+S.measurments[m].unit+"</th>";   
            }
            S.sensor.preview_data_table += "</tr>";
            S.sensor.preview_data_csv = "";
            S.sensor.preview_data_csv += "Time sec,";
            for(var m in S.measurments){
                S.sensor.preview_data_csv += S.measurments[m].name+" "+S.measurments[m].unit+",";   
            }
            S.sensor.preview_data_csv += "\n";
            for (var i = 0; i < S.dataWithTime.length; i++) {
                S.sensor.preview_data_table += "<tr>";
                S.sensor.preview_data_table += "<td>" + S.dataWithTime[i][0] + "</td>";
                S.sensor.preview_data_table += "<td>" + S.dataWithTime[i][1] + "</td>";
                S.sensor.preview_data_table += "<td>" + S.dataWithTime[i][2] + "</td>";
                S.sensor.preview_data_table += "</tr>";
                S.sensor.preview_data_csv += S.dataWithTime[i][0] + "," + S.dataWithTime[i][1] + "," + S.dataWithTime[i][2] + "\n";
            }
            S.sensor.preview_data_table += "</table>";
            $("#data-preview").html(S.sensor.preview_data_table);
        });
        $("#confirm-save-btn").click(function() {
            var filename = $('#modal-data-save').find("#filename").val();
            var fm = new S.FileManager(function() {
                fm.write(filename+".csv", S.sensor.preview_data_csv, function() {
                    fm.read(filename+".csv",function(){
                    	//fm.shareFileInList([0,1]);
                    });
                });
            });
        });
    });
}());
