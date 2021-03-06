function increase_size() {
    set_size(parseInt(get_size()) - 1)
}

function decrease_size() {
    set_size(parseInt(get_size()) + 1)
}

function set_size(value) {
    document.documentElement.style
        .setProperty('--images-per-row', value);
    updateSettings({size: value});
}

function get_size() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue('--images-per-row');
}

function show_only_favs(active = undefined) {
    $("#files")
        .toggleClass("show-only-favs", active);
    updateFilterIcons();
}

function show_only_videos(active = undefined) {
    $("#files")
        .toggleClass("show-only-videos", active)
        .removeClass("show-only-images")
    updateFilterIcons();
}

function show_only_images(active = undefined) {
    $("#files")
        .toggleClass("show-only-images", active)
        .removeClass("show-only-videos")
    updateFilterIcons();
}

function updateFilterIcons() {
    let video = $(".video-filter").removeClass("active")
    let image = $(".image-filter").removeClass("active")
    let fav = $(".fav-filter").removeClass("active")

    let files = $("#files")

    if (files.hasClass("show-only-favs"))
        fav.addClass("active")

    let type
    if (files.hasClass("show-only-images")) {
        image.addClass("active")
        type = "images"
    } else if (files.hasClass("show-only-videos")) {
        video.addClass("active")
        type = "videos"
    } else {
        image.addClass("active")
        video.addClass("active")
        type = "all"
    }

    updateSettings({show_only_favs: files.hasClass("show-only-favs"), show_only: type})
}

function show_all() {
    $("#files")
        .removeClass("show-only-favs")
        .removeClass("show-only-images")
        .removeClass("show-only-videos")
    updateFilterIcons();
}

function set_fav() {
    let element = $(this)
    let fav = element.hasClass("fas")
    let file_element = element.parents(".file")
    let path = file_element.data("path")

    $.ajax("/fav", {
        data: {file: path, value: fav ? "false" : "true"},
        success: function () {
            if (fav) {
                element.removeClass("fas").addClass("far")
                file_element.removeClass("fav")
            } else {
                element.addClass("fas").removeClass("far")
                file_element.addClass("fav")
            }
        },
        error: function (data) {
            alert(data)
            console.log(data)
        }
    })
}

function setPathDisplay(pathString) {
    let path = $("#current-path").html("")
    let folders = pathString.split("/")
    // root folder
    path.append(
        $("<span>").text("Root").addClass("folder-name")
            .on("click", () => loadFolder("."))
    )

    // rest of path
    folders.forEach((folder, index) => {
        if (folder === ".") return;
        path.append($("<span>").text(">").addClass("divider"))
        path.append($("<span>").text(folder).addClass("folder-name")
            .on("click", (data) => loadFolder(folders.slice(0, index + 1).join("/")))
        )
    })

    window.history.pushState({"path": pathString}, "", "?path=" + encodeURI(pathString));
}

window.onpopstate = function (e) {
    if (e.state) {
        loadFolder(e.state.path)
    }
};

function displayFolders(folders) {
    let folders_dom = $('#folders');
    //cleaning
    folders_dom.html("")
    //filling
    folders.forEach(folder => {
        folders_dom.append(
            $("<div>").addClass("folder").text(folder['name']).on("click", function () {
                loadFolder(folder['path'])
            })
        )
    })
    folders_dom.append(
        $("<div>").addClass("folder").text("+").prop("title", "New Folder")
            .on("click", function () {
                alert("Not implemented")
            })
    )
}

function displayFiles(files) {
    let files_dom = $('#files');
    //cleaning
    files_dom.html("")
    //filling

    let year = -1
    let folder
    files.forEach((file, index) => {
        let date = new Date(file.date);

        // Insert divider if year changes
        if (year !== date.getFullYear()) {
            year = date.getFullYear()
            if(year===1970)
                year = "WhatsApp (no date)"
            folder = $('<div>')
                .append($('<div>').text(year).addClass("files-divider"))
                .appendTo(files_dom)

            if (files.length > 500) {
                folder
                    .addClass("load-later")
                    .append($("<a>")
                        .addClass("load-more")
                        .text("load year")
                        .click(function(){
                            $(this).closest(".load-later").removeClass("load-later")
                        })
                    )

            }
        }

        folder.append(makeFileElement(file, index))
    })
}

function makeFileElement(file) {
    let orientation = file['meta']['Orientation']
    let type = "other";
    let fav = file['is_fav'] ? "fas" : "far"
    let icons = $("<div>").addClass("overlay")

    if (file['is_video']) {
        type = "video"
        let icon = "fas fa-fw fa-play"
        if (file['meta']['VideoFrameRate'] > 80)
            icon = "fas fa-fw fa-forward"
        icons.append(
            // video length bubble
            $("<div>").addClass("length")
                .append("<i class=\"" + icon + "\"></i>")
                .append(parseMediaDuration(file['meta']['MediaDuration']))
        )
    } else if (file['is_image'])
        type = "image"

    // fav / heard icon
    icons.append(
        $("<div>").addClass("fav").append(
            $("<i class=\"" + fav + " fa-heart\"></i>").on("click", set_fav)
        )
    )

    let image_src = "src='/image?preview=true&path=" + file['path'] + "'"

    return $("<div>")
        .addClass("file")
        .addClass(file['is_fav'] ? "fav" : "")
        .addClass("type-" + type)
        .data("path", file['path'])
        .click(showInModal)
        .append(
            $("<img " + image_src + ">")
                .addClass("orientation-" + orientation)
                .prop("title", file['name'] + "\n" + file['date'])
        ).append(icons)
}

function loadFolder(path) {
    let loading = $("#loading-indicator").addClass("active")

    $.ajax("/files",
        {
            url: "",
            data: {path: path},
            complete: function () {
                loading.removeClass("active")
            },
            error: function (data, status_text, error) {
                console.log(data, status_text, error)
                if (status_text === "error") {
                    switch (data.status) {
                        case 401:
                            console.error("Login expired! Reloading Page")
                            alert("Login expired! Please login.")
                            location.reload();
                    }
                }
            },
            success: function (data) {
                setPathDisplay(path)
                console.log("Unknown files: ", data.unknown_files.length)

                displayFolders(data['folders'])
                displayFiles(data['files'])
            },
        });
}

function parseMediaDuration(duration) {
    let duration_parts = duration.split(" ")
    let number_parts = duration_parts[0].split(".")
    return $("<span>")
        .append($("<span>").addClass("number")
            .append($("<span>").addClass("full-number").text(number_parts[0]))
            .append($("<span>").addClass("separator").text("."))
            .append($("<span>").addClass("fraction").text(number_parts[1]))
        )
        .append($("<span>").addClass("unit").text(duration_parts[1]))
}

function get_url_parameter(param) {
    let key_value_pairs = window.location.search.substring(1).split('&');
    for (let i = 0; i < key_value_pairs.length; i++) {
        let key_value = key_value_pairs[i].split('=');
        if (key_value[0] === param)
            return decodeURI(key_value[1]);
    }
}

function updateSettings(new_settings) {
    let settings = getSettings();
    console.log("Settings:", settings)
    if (!settings) {
        settings = {}
    }
    if (new_settings.size !== undefined)
        settings.size = new_settings.size
    if (new_settings.show_only_favs !== undefined)
        settings.show_only_favs = new_settings.show_only_favs
    if (new_settings.show_only !== undefined)
        settings.show_only = new_settings.show_only


    document.cookie = "settings=" + JSON.stringify(settings) + "; expires=Thu, 18 Dec 2022 12:00:00 UTC; SameSite=Strict";
}

function getSettings() {
    let cookies = document.cookie.split(";")
    cookies = cookies.filter(str => str.trim().startsWith("settings="))
    if (cookies.length === 1)
        return JSON.parse(cookies[0].split("settings=", 2)[1])
    else
        return undefined
}

function loadSettings() {
    let settings = getSettings()
    if (settings) {
        if (settings.size)
            set_size(settings.size)

        if (settings.show_only === "all")
            show_all()
        else if (settings.show_only === "videos")
            show_only_videos(true)
        else if (settings.show_only === "images")
            show_only_images(true)

        if (settings.show_only_favs)
            show_only_favs(settings.show_only_favs)
    }
}

function closeModal() {
    $('#modal').removeClass('active')
}

function showInModal(e) {
    if (e.target.tagName !== "IMG") {
        return
    }
    let modal = $('#modal')
    let media = $(this)
    let path = "/image?path=" + media.data("path")

    let media_dom
    if (media.hasClass('type-video')) {
        media_dom = $('<video controls>')
        media_dom.append(
            $('<source>')
                .text("Your browser does not support this video.")
                .prop('src', path)
                .prop('type', "video/mp4")
        )

    } else if (media.hasClass('type-image')) {
        media_dom = $('<img>').prop('src', path)
    }

    modal.find('.media-container').html('').append(media_dom)
    modal.addClass('active')
}

$(document).ready(function () {
    loadSettings()
    let path = get_url_parameter("path") || "."
    loadFolder(path)
    updateFilterIcons();
})