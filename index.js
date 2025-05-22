const svgcontainer = document.querySelector(".svgcontainer");
const audioFileInput = document.querySelector(".audiofile");
const audioPlayer = document.querySelector(".player");
audioPlayer.loop = true;
const progressBar = document.querySelector(".processbar");
const process = document.querySelector(".process");
const startTime = document.querySelector(".start");
const endTime = document.querySelector(".end");
const justSvg = document.querySelector(".svg");
const playBtn = document.querySelector(".play");
const pauseBtn = document.querySelector(".pause");
const audioName = document.querySelector(".name");
const leftContent = document.querySelector(".leftcontent");
const lyricsContainer = document.querySelector(".lyricscontainer");
const rightContent = document.querySelector(".rightcontent");
const mainDiv = document.querySelector(".main");
const processedLines = new Set();
let needProcess = undefined;
let width = 1280;
let height = 720;
let called = false;

var mouse_pos = {"x": 0, "y": 0};

// function mainDivScalePosition(width, height) {
//     // width: 1280, height: 720 (Image loaded)
//     // width: 325, height: 437 (Image unloaded)
//     const scaleX = width / mainDiv.clientWidth;
//     const scaleY = height / mainDiv.clientHeight;
//     const scale = Math.max(scaleX, scaleY);

//     mainDiv.style.transform = `scale(${scale})`;
//     // mainDiv.style.top = `calc(50% - ${mainDiv.clientHeight / 2}px)`;
//     // mainDiv.style.left = `calc(80% - ${mainDiv.clientWidth / 2}px)`;

//     // rightContent.style.paddingLeft = `${10 / scaleX}%`;
// }

// window.addEventListener("resize", () => {
//     mainDivScalePosition(width, height);
// });
// mainDivScalePosition(width, height);

let bgImg = new Image();
// bgImg.src = "./default.svg";
let playing = false;
let isDragging = false;
let lrcData;
let lyrics = [];
let allTimes = [];
let lyricsElement = document.querySelector(".lyrics");
let reader;
let imageLoaded = false;
let audioLoaded = false;
let lrcLoaded = false;

svgcontainer.addEventListener("click", async (event) => {
    // const filePaths = await window.electron.openDialog();
    // if (filePaths && filePaths.length > 0) {
    //     // 处理选中的文件
    //     for (const filePath of filePaths) {
    //         const file = new File([await fetch(filePath).then(r => r.blob())], filePath.split('/').pop());
    //         const event = { target: { files: [file] } };
    //         audioFileInput.dispatchEvent(new CustomEvent('change', { detail: event }));
    //     }
    // }
    // audioFileInput.click();
    showChoosefileMenu(event);
});

audioPlayer.addEventListener("loadedmetadata", () => {
    endTime.textContent = `-${formatTime(audioPlayer.duration)}`;
    // if (imageLoaded && audioLoaded && lrcLoaded) {
    //     setTimeout(() => {
    //         playBtn.click();
    //     }, 100);
    // } else if (!lrcLoaded && imageLoaded && audioLoaded) {
    //     window.dispatchEvent(new Event("resize"));
    //     setTimeout(() => {
    //         playBtn.click();
    //     }, 100);
    // }
    if (audioLoaded) {
        if (!lrcLoaded) {
            width = 325;
            height = 437;
            window.dispatchEvent(new Event("resize"));
            mainDiv.style.marginLeft = "0";
        }
        playBtn.click();
    } else {
        alert("Choose audio file!");
    }
});

audioFileInput.addEventListener("change", async (event) => {
    hideChoosefileMenu();
    setLoadingState(true);
    const files = event.target.files;
    await loadFiles(files);
    setLoadingState(false);
});

function loadFiles(files) {
    console.log(`Load files: `, files);
    disableLyric();
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileURL = URL.createObjectURL(file);
        console.log(file.name);

        if (file.type.startsWith('image/')) {
            bgImg.src = fileURL;
            imageLoaded = true;
        } else if (file.type.startsWith('audio/')) {
            audioPlayer.src = fileURL;

            let filename = file.name.split('.')[0];
            if (filename.length > 30) {
                filename = filename.substring(0, 30) + "...";
            }
            audioName.textContent = filename;
            audioLoaded = true;
        } else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith(".lrc")) {
            reader = new FileReader();
            reader.onload = function (e) {
                enableLyric();
                const buffer = e.target.result;
                // 常见编码检测顺序：UTF-8 > GBK > Big5 > Shift_JIS
                const encodings = ['utf-8', 'gbk', 'big5', 'shift_jis'];
                let decodedText = '';

                for (const encoding of encodings) {
                    try {
                        const decoder = new TextDecoder(encoding, { fatal: true });
                        decodedText = decoder.decode(new Uint8Array(buffer));
                        break; // 解码成功则退出循环
                    } catch (e) {
                        continue; // 尝试下一种编码
                    }
                }

                if (!decodedText) {
                    // 所有编码尝试失败，使用默认UTF-8并替换非法字符
                    decodedText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));
                }

                lrcData = decodedText;
                let parsedData = parseLrc(lrcData);
                lyrics = parsedData.lyrics;
                allTimes = parsedData.allTimes;
                lyricsElement = document.querySelector(".lyrics");
                lyricsElement.innerHTML = lyrics.map(line => `<p class="lyrics" data-text="${line.text}">${line.text}</p>`).join('');
            };
            reader.readAsArrayBuffer(file);
            lrcLoaded = true;
        }
    }
}

function disableLyric() {
    rightContent.style.display = "none";
    // leftContent.style.paddingLeft = "none";
}

function enableLyric() {
    rightContent.style.display = "";
    // leftContent.style.paddingLeft = "";
}

function fetchLrcFile(filename) {
    return new Promise((resolve, reject) => {
        const lrcFileUrl = `${filename}`;
        fetch(lrcFileUrl)
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    reject("No such lrc file");
                    disableLyric();
                }
            })
            .then(lrcData => resolve(lrcData))
            .catch(error => reject(error));
    });
}

audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
        process.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        startTime.textContent = formatTime(audioPlayer.currentTime);
        endTime.textContent = `-${formatTime(audioPlayer.duration - audioPlayer.currentTime)}`;
    }
});

progressBar.addEventListener("mousedown", (event) => {
    if (Number.isNaN(audioPlayer.duration)) {
        return;
    }
    isDragging = true;
    updateProgress(event);
});

document.addEventListener("mousemove", (event) => {
    if (isDragging) {
        updateProgress(event);
    }
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

playBtn.addEventListener("click", () => {
    if (Number.isNaN(audioPlayer.duration)) {
        return;
    }
    playing = true;
    audioPlayer.play();
    pauseBtn.style.display = "block";
    playBtn.style.display = "none";
});

pauseBtn.addEventListener("click", () => {
    playing = false;
    audioPlayer.pause();
    pauseBtn.style.display = "none";
    playBtn.style.display = "block";
});

function updateProgress(event) {
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const progressBarWidth = rect.width;
    const percentage = (clickPosition / progressBarWidth) * 100;
    process.style.width = `${percentage}%`;
    audioPlayer.currentTime = (percentage / 100) * audioPlayer.duration;

    if (!playing) {
        playBtn.click();
    }
}

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function parseLrc(lrcText) {
    const lines = lrcText.trim().split('\n');
    const lrcArray = [];
    const allTimes = [];

    lines.forEach(line => {
        const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);

        if (timeMatch) {
            const minutes = parseInt(timeMatch[1], 10);
            const seconds = parseInt(timeMatch[2], 10);
            const milliseconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

            const text = line.replace(timeMatch[0], '').trim();

            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;

            allTimes.push(timeInSeconds);

            if (text) {
                lrcArray.push({ time: timeInSeconds, text });
            }
        }
    });

    // mainDivScalePosition(width, height);

    return {
        lyrics: lrcArray,
        allTimes: allTimes
    };
}

function updateLyrics() {
    if (!playing) return;

    const currentTime = audioPlayer.currentTime + (0.75 / 2);
    // To make lyrics get 0.75/2 seconds (half of the duration of animations) 
    // advanced than audio, in order to avoid delay due to animation.
    const lyricLines = lyricsElement.querySelectorAll('*');
    if (called) {
        lyricsElement.style.transition = "all 1s cubic-bezier(0.25, 0.8, 0.25, 1)";
    } else {
        centerActiveLine(lyricLines[0]);
    }
    let activeIndex = -1;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    lyricLines.forEach((line, index) => {
        const distance = Math.abs(activeIndex - index);
        const thisTime = allTimes[activeIndex];

        if (distance > 8) {
            line.style.visibility = "hidden";
            return;
        }

        if (index === activeIndex) {
            applyActiveLineStyle(line, index, lyricLines, thisTime);
        } else {
            applyNearbyLineStyle(line, distance);
        }
    });

    if (activeIndex >= 0) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                centerActiveLine(lyricLines[activeIndex]);
            }, 70);
        });
    }

    requestAnimationFrame(updateLyrics);
}

function applyActiveLineStyle(line, index, allLines, thisTime) {
    void line.offsetWidth;
    setTimeout(() => {
        line.classList.add("highlight");
        line.style.filter = "none";
        line.style.marginLeft = "0";
        line.style.visibility = "visible";
        line.style.opacity = "1";
        line.style.setProperty("--type-time", `${thisTime / 2}s`);
    }, 300);

    if (!processedLines.has(index)) {
        processedLines.add(index);

        const start = Math.max(0, index - 3);
        const end = Math.min(allLines.length - 1, index + 3);
        const displayingLines = Array.from(allLines).slice(start, end + 1);

        // Commented by rgzz666: These code seems controls the line spacing.
        //                       However no code comments are provided by the original author.
        displayingLines.forEach((nline, i) => {
            setTimeout(() => {
                // Commented by rgzz666: This place seems controls the "bouncing back" effect.
                //                       BTW code comments are always suggested to be written.
                // Commented by rgzz666: According to my own experiments, line.clientHeight is 40px 
                //                       per line, and IS NOT affected by the browser zoom or size.
                //                       Therefore hard-code it to 40px can avoid excessive bouncing 
                //                       effect on multi-line lyrics.
                nline.style.marginTop = `40px`;
                // nline.style.marginTop = `${line.clientHeight}px`;

                setTimeout(() => {
                    nline.style.marginTop = "0.7rlh";
                }, 250);
            }, i * 75);
        });
    }
}

function applyNearbyLineStyle(line, distance) {
    void line.offsetWidth;
    line.classList.remove("highlight");
    line.style.filter = `blur(${distance * 0.5}px)`;
    line.style.marginLeft = `${distance * 1.25}px`;
    line.style.opacity = `${0.3 - distance / 100}`;
    line.style.visibility = "visible";
}

function centerActiveLine(activeLine) {
    if (!activeLine) return;
    if (!called) called = true;

    const container = document.querySelector(".lyricscontainer");
    const containerHeight = container.clientHeight;
    const activeLineOffset = activeLine.offsetTop;
    const offset = (containerHeight / 2) - activeLineOffset - (0.1 * containerHeight);

    lyricsElement.style.transform = `translateY(${offset}px)`;
}

audioPlayer.addEventListener('play', () => {
    requestAnimationFrame(updateLyrics);
});

window.addEventListener('resize', () => {
    lyricsElement.classList.add("noTransition");
    updateLyrics();
    lyricsElement.classList.remove("noTransition");
});

updateLyrics();

function getDominantColors(imageData, colorCount = 5, minColorDistance = 100) {
    const pixels = imageData.data;
    const sampledColors = []; // 存储采样后的颜色（未去重）
    const dominantColors = []; // 最终返回的主色调（去重后）

    // 1. 每隔 16 个像素采样一次（减少计算量）
    for (let i = 0; i < pixels.length; i += 4 * 13) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        sampledColors.push([r, g, b]);
    }

    for (const sampleIndex in sampledColors) {
        // console.log(sampledColors[sampleIndex])
        const sample = sampledColors[sampleIndex]
        const r = sample[0]; const g = sample[1]; const b = sample[2];
        // console.log(`Considering color: (${r},${g},${b})`);
        const isPassed = dominantColors.every(([er, eg, eb]) => {
            const distance = Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2);
            const isUnique = (distance >= minColorDistance); // Avoid repeated colors
            const isTooLight = (r > 200 && g > 200 && b>200); // Avoid light colors
            // if (isTooLight) {console.log(`Avoided color (${r},${g},${b}) as it is too light for background.`);}
            return (isUnique && (!isTooLight)); // 颜色差异足够大且不要太浅才保留
        });

        if (isPassed) {
            // console.log(`(${r},${g},${b}) is selected, with isPassed=${isPassed}`);
            dominantColors.push([r, g, b]);
            if (dominantColors.length >= colorCount) {
                console.log(`Stopped picking colors as there are already enough for the requirement of ${colorCount} colors.`);
                break;
            } // 提前终止
        }

        // console.log(r, g, b);
    }

    console.log("Chosen background colors: ", dominantColors.map(([r, g, b]) => `(${r},${g},${b})`));
    return dominantColors.map(([r, g, b]) => `rgba(${r},${g},${b},0.9)`);
}

bgImg.onload = () => {
    justSvg.style.display = "none";
    svgcontainer.style.background = `url(${bgImg.src})`;
    svgcontainer.style.backgroundSize = "cover";
    svgcontainer.style.backgroundPosition = "center";
    svgcontainer.style.backgroundRepeat = "no-repeat";

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = 100;
    tempCanvas.height = 100 * (bgImg.height / bgImg.width);

    tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    let colors = getDominantColors(imageData);
    document.body.style.setProperty('--background', colors[0]);
    document.body.style.setProperty('--color1', colors[0]);
    document.body.style.setProperty('--color2', colors[1]);
    document.body.style.setProperty('--color3', colors[2]);
    document.body.style.setProperty('--color4', colors[3]);
    document.body.style.setProperty('--color5', colors[4]);
    document.body.style.setProperty('--color1-rgba', colors[0].replace("0.9", "0"));
    document.body.style.setProperty('--color2-rgba', colors[1].replace("0.9", "0"));
    document.body.style.setProperty('--color3-rgba', colors[2].replace("0.9", "0"));
    document.body.style.setProperty('--color4-rgba', colors[3].replace("0.9", "0"));
    document.body.style.setProperty('--color5-rgba', colors[4].replace("0.9", "0"));
};

// Code for new file choosing menu
async function createFileFromURL(url, filename) {
    try{
        const response = await fetch(url);
        if (!response.ok) {
            console.log("Fetch error!");
            return false;
        }
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type });
        return file;
    } catch (error) {
        return false;
    }
}

async function getTestAudioFiles(testAudioName) {
    const files = ["audio", "cover", "lyrics"];
    const possible_extensions = {"audio": ["mp3", "flac", "ape", "wav", "aac", "m4a", "mid", "ogg", "alac", "opus", "wma", "aiff"],
                                 "cover": ["jpg", "jpeg", "png", "gif", "giff", "bmp", "webp", "tiff", "avif"],
                                 "lyrics": ["lrc"]
                                };
    fileObjects = [];
    for (const filename of files) {
        for (const extension of possible_extensions[filename]) {
            fileObject = await createFileFromURL(`./TestAudio/${testAudioName}/${filename}.${extension}`, `${filename}.${extension}`);
            console.log(`${filename}.${extension} ==> `, fileObject);
            if (fileObject != false) {
                fileObjects.push(fileObject);
                break;
            }
        };
    };
    return fileObjects;
}

async function listTestAudio() {
    try {
        const response = await fetch('./TestAudio/TestAudioList.json' + `?nocache=${Math.random()}`);
        if (!response.ok) {
            console.warn(response);
            throw new Error('Failed to fetch TestAudioList.json');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to read test audio list: ', error);
        return {};
    }
}

async function selectTestAudio(testAudioName, testAudioDispName = "Unknown test audio") {
    console.log(`Selected test audio: ${testAudioName}`);
    hideChoosefileMenu();
    setLoadingState(true);
    const testAudioFiles = await getTestAudioFiles(testAudioName);
    await loadFiles(testAudioFiles);
    // Set track name text
    const name_disp = document.getElementsByClassName("name")[0];
    name_disp.textContent = testAudioDispName;
    setLoadingState(false);
}

async function choosefileMenuAddItems() {
    list = document.getElementById("testaudio_list");
    // console.log("Add items")
    list.innerHTML = `<p class="item died">Loading</p>`;
    items = await listTestAudio();
    // list.innerHTML = `<p class="item died">Pick an example</p>`;
    list.innerHTML = "";
    if (Object.keys(items).length == 0) {
        list.innerHTML += `<p class="item died" style="font-size: 1.1rem;">(Empty or failed to fetch)</p>`;
        return false;
    }
    for (const [trackName, dirName] of Object.entries(items)) {
        console.log(`Add item: ${trackName} - ${dirName}`);
        list.innerHTML += "\n" + `<p class="item" onclick="selectTestAudio('${dirName}', '${trackName}');">${trackName}</p>`;
    }
}

function hideChoosefileMenu() {
    const menu = document.getElementById("choosefile_menu");
    menu.classList.add("hidden");
    const cover = document.getElementById("page_cover");
    cover.classList.add("hidden");
}

function showChoosefileMenu(event) {
    const menu = document.getElementById("choosefile_menu");
    // Get the menu prepared
    choosefileMenuAddItems(menu);
    // Show the menu
    menu.style.left = `${event.clientX + 10}px`;
    menu.style.top = `${event.clientY + 10}px`;
    console.log(`Open menu at: left: "${event.clientX + 10}"; top: "${event.clientY + 10}"`);
    menu.classList.remove("hidden");
    // Show the page cover, and set when to hide it with the menu itself
    const cover = document.getElementById("page_cover");
    cover.classList.remove("hidden");
    cover.onclick = (function() {hideChoosefileMenu();})
}

var loadingChangeTipTimeout = null;

function setLoadingState(state) {
    console.log(`Setting loading state to ${state}`);
    const cover = document.getElementById("page_cover");
    const popup = document.getElementById("loading_popup");
    const tipText = document.getElementById("loading_tip");
    if (state) {
        cover.classList.remove("hidden");
        cover.onclick = "";
        popup.classList.remove("hidden");
        // Set loading tip
        tipText.textContent = "Have a cup of coffee?";
        tipText.classList.remove("clickable");
        loadingChangeTipTimeout = setTimeout(function () {
            tipText.textContent = "Actually working on it...";
            loadingChangeTipTimeout = setTimeout(function () {
                tipText.textContent = "Consider checking your network connection?";
                loadingChangeTipTimeout = setTimeout(function () {
                    tipText.textContent = "Waited too looooog? Click here to hide loading page";
                    tipText.onclick = function(){
                        setLoadingState(false);
                        alert("Please note that the loading process is still running in background!\n" + 
                              "To end it, consider refreshing the entire page.\n\n" + 
                              "Downloading files may be a long progress. However, if you kept waiting " + 
                              "this long for several times, consider checking your network connection " + 
                              "or our server condition.\n" + 
                              "If you sure this is a program issue, please report it to us on GitHub.");
                    };
                    tipText.classList.add("clickable");
                }, 20000);
            }, 10000);
        }, 5000);
    } else if (!state) {
        cover.classList.add("hidden");
        popup.classList.add("hidden");
        if (loadingChangeTipTimeout != null) {
            clearTimeout(loadingChangeTipTimeout);
        }
    } else {
        console.warn("Invalid state for loading screen!");
    }
}