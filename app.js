//                                   _                                       _          _   _   _ 
//                                  | |       ______                        | |        | | | | (_)
//   _ __ ___  _   _    ___ ___   __| | ___  |______|  ___ _ __   __ _  __ _| |__   ___| |_| |_ _ 
//  | '_ ` _ \| | | |  / __/ _ \ / _` |/ _ \  ______  / __| '_ \ / _` |/ _` | '_ \ / _ \ __| __| |
//  | | | | | | |_| | | (_| (_) | (_| |  __/ |______| \__ \ |_) | (_| | (_| | | | |  __/ |_| |_| |
//  |_| |_| |_|\__, |  \___\___/ \__,_|\___|          |___/ .__/ \__,_|\__, |_| |_|\___|\__|\__|_|
//              __/ |                                     | |           __/ |                     
//             |___/                                      |_|          |___/                      


var length, settings, frameindex = 0, zip = new JSZip(), renderers = {count: 0, instances: []};
var bc = new BroadcastChannel('videochromata');


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

    $(".button-add-renderer").click(function() {
        window.open('worker.html', 'worker' + renderers.count, "height=500,width=1000");
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
        var file = $('#file').prop('files')[0];
        processZip(file)
      });

});


//IMAGES IN ZIP TO BLOB ARRAY
function processZip(file) { 
    $('.accordion').hide();
    JSZip.loadAsync(file).then((zip, i = 0) => {
        length = Object.keys(zip.files).length
        var frames = new Array;
        $('.uk-container').append(`<p class="uk-text-right progress-frames">0/${length} frames processed | 0% | ETA: ${Math.round((settings.timeout/1000 * length)/renderers.count)} seconds</p><progress class="uk-progress" value="0" max="${length}"></progress>`);
        zip.forEach((relativePath, zipEntry) => {
            zipEntry.async('base64').then(out => {
                i++;
                /*var blob = new Blob([out], {
                    'type': 'image/png'
                }); */

                frames.push({
                    image: out,
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
    var chunkSize = Math.ceil(length/renderers.count);
    var cutframes = frames.reduce((resultArray, item, index) => { 
        const chunkIndex = Math.floor(index/chunkSize)
        if(!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []
        }
        resultArray[chunkIndex].push(item)
        return resultArray
    }, [])
    console.log(cutframes)
    for (const key in cutframes) {
        if (cutframes.hasOwnProperty(key)) {
            const element = cutframes[key];
            bc.postMessage({
                type: 'renderOrder',
                frames: element,
                settings: settings,
                renderer: renderers.instances[key]
            })
        }
    }
}


bc.onmessage = (ev) => {
    console.log(ev.data)
    switch (ev.data.type){
        case 'encodedImage':
            frameindex++;
            $(".framebuffer").attr("src", "data:image/png;base64," + ev.data.image);
            var data = ev.data.image.replace(/^data:image\/\w+;base64,/, "");
            zip.file(ev.data.path, data, {
                base64: true
            });
            $('.uk-progress').val(frameindex)
            $('.progress-frames').text(`${frameindex}/${length} frames processed | ${Math.round(frameindex/length*100)}% | ETA: ${(settings.timeout/1000 * length) - frameindex * settings.timeout/1000} seconds`)
            if (frameindex == length) {
                console.log('done processing frames');
                zip.generateAsync({
                    type: "blob"
                }).then(function(blob) {
                    saveAs(blob, "output.zip");
                    location.reload();
                });
            }
            break;
        case 'registerRenderer':
            renderers.count++;
            renderers.instances.push(ev.data.id);
            $('.renderers-count').text('Renderers: ' + renderers.count);
            console.log(renderers)
            break;
        case 'deregisterRenderer':
            renderers.count--;
            renderers.instances.remove(ev.data.id);
            $('.renderers-count').text('Renderers: ' + renderers.count);
            console.log(renderers)
            break;
    }
    
}

window.onbeforeunload = function(){
    bc.postMessage({type: 'processExit'})
};

//stack overflow
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};