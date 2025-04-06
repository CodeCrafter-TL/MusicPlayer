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
const rightContent = document.querySelector(".rightcontent");
const mainDiv = document.querySelector(".main");
const processedLines = new Set();
let needProcess = undefined;
let width = 1280;
let height = 720;

function mainDivScalePosition(width, height) {
    // width: 1280, height: 720 (Image loaded)
    // width: 325, height: 437 (Image unloaded)
    const scaleX = mainDiv.clientWidth / width;
    const scaleY = mainDiv.clientHeight / height;
    const scale = Math.max(scaleX, scaleY);

    mainDiv.style.transform = `scale(${scale})`;
    mainDiv.style.top = `calc(50% - ${mainDiv.clientHeight / 2}px)`;
    mainDiv.style.left = `calc(50% - ${mainDiv.clientWidth / 2}px)`;
    if (width === 1280) {
        mainDiv.style.marginLeft = `${7.5 * scaleX}%`;
    }

    rightContent.style.paddingLeft = `${10 / scaleX}%`;
}

window.addEventListener("resize", () => {
    mainDivScalePosition(width, height);
});
mainDivScalePosition(width, height);

let bgImg = new Image();
let playing = false;
let isDragging = false;
let lrcData;
let lyrics = [];
let lyricsElement = document.querySelector(".lyrics");
let reader;
let imageLoaded = false;
let audioLoaded = false;
let lrcLoaded = false;

svgcontainer.addEventListener("click", async () => {
    // const filePaths = await window.electron.openDialog();
    // if (filePaths && filePaths.length > 0) {
    //     // 处理选中的文件
    //     for (const filePath of filePaths) {
    //         const file = new File([await fetch(filePath).then(r => r.blob())], filePath.split('/').pop());
    //         const event = { target: { files: [file] } };
    //         audioFileInput.dispatchEvent(new CustomEvent('change', { detail: event }));
    //     }
    // }
    audioFileInput.click();
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
        alert("请选择音频文件");
    }
});

audioFileInput.addEventListener("change", (event) => {
    const files = event.target.files;
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
            if (filename.length > 15) {
                filename = filename.substring(0, 15) + "...";
            }
            audioName.textContent = filename;
            audioLoaded = true;
        } else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith(".lrc")) {
            reader = new FileReader();
            reader.onload = function(e) {
                const buffer = e.target.result;
                // 常见编码检测顺序：UTF-8 > GBK > Big5 > Shift_JIS
                const encodings = ['utf-8', 'gbk', 'big5', 'shift_jis'];
                let decodedText = '';
                
                for (const encoding of encodings) {
                    try {
                        const decoder = new TextDecoder(encoding, {fatal: true});
                        decodedText = decoder.decode(new Uint8Array(buffer));
                        break; // 解码成功则退出循环
                    } catch (e) {
                        continue; // 尝试下一种编码
                    }
                }

                if (!decodedText) {
                    // 所有编码尝试失败，使用默认UTF-8并替换非法字符
                    decodedText = new TextDecoder('utf-8', {fatal: false}).decode(new Uint8Array(buffer));
                }

                enableLyric();
                lrcData = decodedText;
                lyrics = parseLrc(lrcData);
                lyricsElement = document.querySelector(".lyrics");
                lyricsElement.innerHTML = lyrics.map(line => `<div>${line.text}</div>`).join('');
            };
            reader.readAsArrayBuffer(file); // 改为读取ArrayBuffer
            lrcLoaded = true;
        }
    }
});

function disableLyric() {
    rightContent.style.display = "none";
    leftContent.style.paddingLeft = "none";
}

function enableLyric() {
    rightContent.style.display = "";
    leftContent.style.paddingLeft = "";
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

    lines.forEach(line => {
        const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);

        if (timeMatch) {
            const minutes = parseInt(timeMatch[1], 10);
            const seconds = parseInt(timeMatch[2], 10);
            const milliseconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

            const text = line.replace(timeMatch[0], '').trim();

            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
            if (text) {
                lrcArray.push({ time: timeInSeconds, text });
            }
        }
    });
    
    return lrcArray;
}


function updateLyrics() {
    const currentTime = audioPlayer.currentTime;
    const lyricLines = document.querySelectorAll('.lyrics > *');
    let activeIndex = 0;
    needProcess = false;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    lyricLines.forEach((line, index) => {
        const distance = Math.abs(activeIndex - index);

        if (distance <= 8) {
            if (index === activeIndex) {
                if (!processedLines.has(index) && lyricLines[index + 1])
                    needProcess = true;

                if (needProcess && index >= 1) {
                    line.style.marginTop = `${lyricLines[index - 1].clientHeight * 2}px`;
                    console.log(1);

                    setTimeout(() => {
                        line.style.marginTop = "6px";
                        processedLines.add(index);
                    }, 100);
                }

                void line.offsetWidth;
                line.classList.add("highlight");
                line.style.filter = "none";
                line.style.marginLeft = "0";
                line.style.visibility = "visible";

                setTimeout(() => {
                    if (needProcess) {
                        lyricLines[index + 1].style.marginTop = `${line.clientHeight - 6}px`;
                        console.log(2);

                        setTimeout(() => {
                            lyricLines[index + 1].style.marginTop = "6px";
                            processedLines.add(index);
                        }, 100);
                    }
                }, 200);
            } else {
                void line.offsetWidth;
                line.classList.remove("highlight");
                line.style.filter = `blur(${distance * 0.5}px)`;
                line.style.marginLeft = `${distance * 1.25}px`;
                line.style.visibility = "visible";

                if (distance >= 9) {
                    line.style.visibility = "hidden";
                }
            }
        } else {
            line.style.visibility = "hidden";
        }
    });

    if (activeIndex >= 0) {
        // setTimeout(() => {
        //     const activeLine = lyricLines[activeIndex];
        //     if (activeLine) {
        //         const containerHeight = document.querySelector(".lyricscontainer").clientHeight;
        //         const activeLineOffset = activeLine.offsetTop;
        //         const offset = (containerHeight / 2) - activeLineOffset - 0.1 * containerHeight;
        //         lyricsElement.style.top = `${offset}px`;
        //     }
        // }, 100);
        const activeLine = lyricLines[activeIndex];
        if (activeLine) {
            const containerHeight = document.querySelector(".lyricscontainer").clientHeight;
            const activeLineOffset = activeLine.offsetTop;
            const offset = (containerHeight / 2) - activeLineOffset - 0.1 * containerHeight;
            lyricsElement.style.top = `${offset}px`;
        }
    }

    if (playing) {
        requestAnimationFrame(updateLyrics);
    }
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

function getDominantColors(imageData, colorCount = 5) {
    const pixels = imageData.data
    const colorMap = {}
    const minColorDistance = 45

    for (let i = 0; i < pixels.length; i += 4 * 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const key = `${r},${g},${b}`

        let isUnique = true
        for (const existingColor of Object.keys(colorMap)) {
            const [er, eg, eb] = existingColor.split(',').map(Number)
            const distance = Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2)
            if (distance < minColorDistance) {
                isUnique = false
                break
            }
        }

        if (isUnique) {
            colorMap[key] = (colorMap[key] || 0) + 1
        }
    }

    return Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount)
        .map(([color]) => {
            const [r, g, b] = color.split(',')
            return `rgba(${r}, ${g}, ${b}, 0.9)`
        })
}

bgImg.onload = () => {
    justSvg.style.display = "none";
    svgcontainer.style.background = `url(${bgImg.src}`;
    svgcontainer.style.backgroundSize = "cover";
    svgcontainer.style.backgroundPosition = "center";
    svgcontainer.style.backgroundRepeat = "no-repeat";

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')

    tempCanvas.width = 100
    tempCanvas.height = 100 * (bgImg.height / bgImg.width)

    tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height)
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

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
}
