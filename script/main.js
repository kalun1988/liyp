(function() {
    'use strict';
    // this function is strict...
    window.S = {};
    S.device = null;
    S.sensor = {};
    S.plot = null;
    S.accumulatedDataLimit = 100;
    S.accumulatedData = {
        x: [],
        y: [],
        z: [],
        m: [],
        t: []
    };
    S.current = {};
    S.current.x = 15;
    if (Cookies.get('lang') === undefined || Cookies.get('lang') === null) {
        Cookies.set('lang', 0, { expires: 9999 });  //0:en, 1:tc, 2:sc
        S.lang=0;       //cannot set cookie when device not allow cookies e.g. cocoon debug mode
    }else{
        S.lang = Cookies.get('lang');
    }

    if (window.cordova) {
        document.addEventListener("deviceready", main);
    }

    function main() {
        
        //when ios
        if (device.platform !== "Android") {
            document.ontouchmove = function(event){
                event.preventDefault();
            };
            $("#sensor-photometer-row").hide(); //hide photometer when ios
        }
        screen.orientation.lock('portrait');
        $("#screen_shot-btn").click(function(){
            /////////////// try uri
            navigator.screenshot.URI(function(error,res){
              if(error){
                console.error(error);
              }else{
                window.plugins.socialsharing.share('share', 'App Data', [res.URI]);
              }
            },50);
        });
    }
    //handle i18n on front end
    $(document).ready(function() {
        $(".i18n").each(function() {
            var data = $(this).data('i18n').split("||");
            $(this).html(data[S.lang]); //0:en, 1:tc, 2:sc
        });
    });

}());
