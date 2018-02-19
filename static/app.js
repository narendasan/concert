var socket;
var currentUrl;
var currentSong;
var currentTime;
var currentEndTime;
var currentProgressInterval;

function updateProgress() {
    //console.log("Called")
    currentTime += 1000;
    $('#progress-slider').val(currentTime/currentEndTime);
}

$(document).ready(function () {
    socket = io.connect('http://' + document.domain + ':' + location.port);
    socket.on('connected', function(state) {
        updateClient(state);
    });

    $('#play-pause-button').click(function(e) {
        socket.emit('pause');
    });

    $('#next').click(function(e) { 
        socket.emit('skip');
    });

    $('#previous-button').click(function(e) { 
        socket.emit('previous');
    });

    $("#volume-slider").on("input", function() {
        socket.emit('volume', parseInt(this.value));
    });

    $("#import-button").click(function(e) {
        if ($('#url-textbox').val().trim() != ""){
            currentUrl = $('#url-textbox').val();
            socket.emit('download', currentUrl);
            $('#url-textbox').val("");
        }
        else
            return false;
    });

    socket.on('downloaded', function(state) {
        console.log("Download emitted");
        updateClient(state);
    });

    socket.on('download_error', function() {
        //TODO: Better error handling
        console.log("Invalid URL");
    });

    socket.on('played', function(state) {
        updateClient(state);
        $('#play-pause-button').addClass('pause');
        $('#play-pause-button').removeClass('play');
        clearInterval(currentProgressInterval);
        currentProgressInterval = setInterval(updateProgress, 1000);
    });

    socket.on('heartbeat', function(state) {
        console.log("HEARTBEATING");
        updateClient(state);
    })

    socket.on('paused', function(state) {
        //change to toggle
        var playState = JSON.parse(state);
        if (playState.is_playing && (playState.audio_status == "State.Playing" || playState.audio_status == "State.Opening")){
            currentProgressInterval = setInterval(updateProgress, 1000); 
            $('#play-pause-button').removeClass('fa-play').addClass('fa-pause');
        }
        else{
            clearInterval(currentProgressInterval);
            $('#play-pause-button').addClass('fa-play').removeClass('fa-pause');
        }

        currentTime = playState.current_time;
        currentEndTime = playState.duration;
    });

    socket.on('skipped', function(state) {
        updateClient(state);
    });

    socket.on('previous', function() {
        
    });

    socket.on('volume_changed', function(volumeResponse) {
        volumeState = JSON.parse(volumeResponse)
        $('#volume-slider').val(volumeState.volume);
    });

    socket.on('position_changed', function() {
        var curTime = jsonState.current_time;
        var totalTime = jsonState.duration;
        $('#progress-slider').val(curTime/totalTime);
    });

    
    function updateClient(state) {
        var jsonState = JSON.parse(state);
        if (jsonState != null)
        {
            console.log(jsonState);
            $('#volume-slider').val(jsonState.volume.toString());

            if(jsonState.media != null){
                currentSong = jsonState.current_track
                currentTime = jsonState.current_time;
                currentEndTime = jsonState.duration;
                $('#progress-slider').val(currentTime/currentEndTime);
                clearInterval(currentProgressInterval);
                currentProgressInterval = setInterval(updateProgress, 1000);
            }else{
                currentSong = null;
                currentTime = 0;
                currentEndTime = 0;
            }

            if(jsonState.media != null && jsonState.is_playing == true){
                currentUrl = jsonState.media;
                $('#title').text(jsonState.current_track);
            } else{
                currentUrl = null;
                $('#title').text("None");
            }
    
            if (jsonState.is_playing && (jsonState.audio_status == "State.Playing" || jsonState.audio_status == "State.Opening")) {
                $('#play-pause-button').removeClass('fa-play').addClass('fa-pause');
            } else{
                $('#play-pause-button').addClass('fa-play').removeClass('fa-pause');
            }
        }
    }
});
