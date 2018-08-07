//                                   _                                       _          _   _   _ 
//                                  | |       ______                        | |        | | | | (_)
//   _ __ ___  _   _    ___ ___   __| | ___  |______|  ___ _ __   __ _  __ _| |__   ___| |_| |_ _ 
//  | '_ ` _ \| | | |  / __/ _ \ / _` |/ _ \  ______  / __| '_ \ / _` |/ _` | '_ \ / _ \ __| __| |
//  | | | | | | |_| | | (_| (_) | (_| |  __/ |______| \__ \ |_) | (_| | (_| | | | |  __/ |_| |_| |
//  |_| |_| |_|\__, |  \___\___/ \__,_|\___|          |___/ .__/ \__,_|\__, |_| |_|\___|\__|\__|_|
//              __/ |                                     | |           __/ |                     
//             |___/                                      |_|          |___/                      
var length, settings, frameindex = 0, zip = new JSZip();
$("document").ready(function() {
    $("input[value='color']").click();
    $("input[value='low']").click();
    $("input[value='smooth']").click();
    $("#file").change(function(evt) {
        //var file = evt.target.files[0];
        //processZip(file);
        UIkit.accordion($('.accordion')[0]).toggle(1);
    });
    $(document).on('input', '#timeout-frame', function() {
        $('#timeout-frame-desc').text($(this).val()  + " seconds")
    });
    $(document).on('input', '#line-width', function() {
        $('#line-width-desc').text($(this).val())
    });
    $(document).on('input', '#line-speed', function() {
        $('#line-speed-desc').text($(this).val())
    });
    $(document).on('input', '#line-count', function() {
        $('#line-count-desc').text($(this).val())
    });

    $(".button-render").click(function() {
        UIkit.accordion($('.accordion')[0]).toggle(3);
        $(".button-render").hide();
        settings = {
            colorMode: $('input[name=radio2]:checked').val(),
            compositeOperation: 'lighten', 
            iterationLimit: 0,
            key: $('input[name=radio1]:checked').val(), 
            lineWidth: $('#line-width').val(), 
            lineMode: $('input[name=radio3]:checked').val(), 
            origin: ['bottom, 50% 50%, top'],
            outputSize: 'original', 
            pathFinderCount: $('#line-count').val(), 
            speed: $('#line-speed').val(),
            turningAngle: eval($('#turning-angle option:selected').val()),
            timeout: $('#timeout-frame').val() * 1000
        };
        //console.log(settings);
        var file = $('#file').prop('files')[0]
        processZip(file)
      });

});


//IMAGES IN ZIP TO BLOB ARRAY
function processZip(file) {
    
    $('.accordion').hide();
    
    JSZip.loadAsync(file).then((zip, i = 0) => {
        length = Object.keys(zip.files).length
        var frames = new Array;
        $('.uk-container').append(`<p class="uk-text-right progress-frames">0/${length} frames processed | 0% | ETA: ${settings.timeout/1000 * length} seconds</p><progress class="uk-progress" value="0" max="${length}"></progress>`);
        zip.forEach((relativePath, zipEntry) => {
            zipEntry.async('arraybuffer').then(out => {
                i++;
                var blob = new Blob([out], {
                    'type': 'image/png'
                });

                frames.push({
                    blob: URL.createObjectURL(blob),
                    path: relativePath
                });
                if (i == length) {
                    processImages(frames);
                }
            })
        });
    })
}

function processImages(frames) {
    frames.reduce(
        (chain, e) => chain.then(() => asyncFn(e)),
        Promise.resolve()
    )
}



function asyncFn(e, framebuffer) {
    return new Promise((res, rej) => {
        //do stuff 
        console.log("Rendering: " + e.path)
        $(".framebuffer").attr("src", e.blob);
        var imageElement = document.querySelector(".framebuffer");
        var chromata = new Chromata(imageElement, settings);
        chromata.start();
        setTimeout(() => {
            frameindex++;
            chromata.stop();
            var canvas = $('canvas')[0];
            zip.file(e.path, canvas.toDataURL("image/jpeg").split(',')[1], {
                base64: true
            });
            //console.log(`${framebuffer} saved:  ${e.path}`);
            chromata.reset()
            res(e);
            $('.uk-progress').val(frameindex)
            $('.progress-frames').text(`${frameindex}/${length} frames processed | ${Math.round(frameindex/length*100)}% | ETA: ${(settings.timeout/1000 * length) - frameindex * settings.timeout/1000} seconds`)
            //save the zip
            if (frameindex == length) {
                console.log('done processing frames');
                zip.generateAsync({
                    type: "blob"
                }).then(function(blob) {
                    saveAs(blob, "output.zip");
                    location.reload();
                });
            }
        }, settings.timeout);
    });

}