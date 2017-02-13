var fs = require('fs');
var http=require('http');
var readline = require('readline');
var path = require('path');
var exec = require('child_process').exec;

var platform = require('os').platform();

// ------
var currentDir = '';
var currentPage = '';
var currentFileTime = '';
var currentMTime = '';
var currentATime = '';
var currentSongs = [];
// ------

// 获取控制台输入
// nodeJS 中从命令行等待并读入用户输入实现与用户交互的方法 @志文工作室: https://lzw.me/a/nodejs-stdin.html
function readSyncByRl(tips) {
    tips = tips || '> ';

    return new Promise(function(resolve) {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(tips, function(answer) {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// 读取文件的基本信息
function getFileInfo(file) {
    var info = (fs.statSync(file));
    console.log(info);
    currentMTime = info.mtime;
    currentATime = info.atime;

    var time = info.birthtime;
    if (+info.mtime < +time) {
        time = info.mtime;
    }
    if (+info.ctime < +time) {
        time = info.ctime;
    }
    if (+info.atime < +time) {
        time = info.atime;
    }
    console.error('【' + time + '】');
    return time;
}

function formatFile(fileName, newName) {

    // 修改创建时间
    fs.utimes(fileName, currentATime, currentMTime, function(err) {
        err && console.log('【error】' + err);

        // 打开文件，调起系统的音乐播放器
        // windows 的命令是 start ， mac 的命令是 open
        var openFileCommand = 'open';
        if (platform == 'win32') {
            openFileCommand = 'start';
        }
        exec(openFileCommand + ' ' + fileName, function(err) {
            if (err) {
                console.log('【error】' + err);
            }
            else {
                readSyncByRl('是否保存该文件？（回车保存，否则选择新id）').then(function(res) {
                    if (!res) {
                        // 修改文件名
                        fs.rename(fileName, currentDir + '/' + newName + '.mp3', function(err) {
                            err && console.log('【error】' + err);
                            readSyncByRl('确认删除源文件？（回车删除，其它保留）').then(function(res) {
                                !res && fs.rename(currentDir + '/' + currentFileName, currentDir + '/' + '__deleted/' + currentFileName);
                            });
                        });
                    }
                    else {
                        fs.unlinkSync(fileName);
                        getUrl(currentSongs, (+res - 1));
                    }
                });
            }
        });
    });
}

// windows 下文件名后面会带一串字符，mac下没有。
// 有这个方法恢复文件名
function fixFixeName(originName, newName) {
    var files = fs.readdirSync(process.cwd());
    for (var i = 0; i < files.length; i++) {
        if (files[i].indexOf(originName) == 0) {
            fs.rename(files[i], originName, function(err) {
                err && console.log(err);
                formatFile(originName, newName);
            });
            return files[i];
        }
    }
}

// 下载并存储文件
function saveFile(url, newName) {
    // 修改系统时间，以修改创建时间 for windows，mac 下会忽略
    var date = (currentFileTime.getFullYear() + '/' + (currentFileTime.getMonth() + 1) + '/' + currentFileTime.getDate());
    var time = (currentFileTime.getHours() + ':' + (currentFileTime.getMinutes()) + ':' + currentFileTime.getSeconds());

    exec('@date ' + date, function() {
        exec('@time ' + time, function() {

            exec('wget ' + url, function(err,stdout,stderr){
                if(err) {
                    console.log('error:'+stderr);
                } else {
                    console.log('download success');

                    // 取源文件名
                    var urlSplit = url.split('/');
                    var fileName = urlSplit[urlSplit.length - 1];

                    fixFixeName(fileName, newName);
                }
            });
        });
    });
}

function downloadUrl(data, name) {
    data = data.data[0];
    console.log('-- download url --: ' + data.url);
    if (!data.url) {
        readSyncByRl('直接从url下载？（输入url，否则回车取消并重新选个文件）').then(function(res) {
            if (res) {
                saveFile(res, name);
                return;
            }
            chooseFile();
        });
        return;
    }
    saveFile(data.url, name);
}

function getUrl(data, index) {
    var item = data[index];
    var id = item.id, br = item.l.br;
    var m = item;
    br = m.duration ? ((m.bMusic && m.bMusic.bitrate) || (m.lMusicm && m.lMusic.bitrate) || (m.mMusic && m.mMusic.bitrate) || (m.hMusic && m.hMusic.bitrate)) : (((m.b && m.b.br)) || (m.l && m.l.br) || (m.m && m.m.br) || (m.h && m.h.br));
    http.get('http://localhost:3000/v1/music/url?id=' + id + '&br=' + br, function(res) {
        res.on('data', function(data) {
            var name = item.name + ' - ' + item.ar[0].name;
            name = name.replace(/\:/g, '').replace(/\*/g, ' ');
            downloadUrl(JSON.parse(data), name);
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}

function chooseFile() {
    readSyncByRl('选择要下载的文件id：（n加载下一页）').then(function(res) {
        if (res == 'n') {
            search(currentPage + 1);
            return;
        }
        getUrl(currentSongs, (+res - 1));
    });
}

function showSearchList(data) {
    data = data.result;
    console.log('-- search result --: total : ' + data.songCount);

    var list = data.songs;
    currentSongs = list;
    for (var i = 0; i < list.length; i++) {
        var item = list[i];
        console.log((i + 1) + '\t' + item.name + ' - ' + item.ar[0].name);
    }

    chooseFile();

}

function search(page) {
    page = page || currentPage || 1;
    currentPage = page;
    console.log('-- search --: ' + curentSearchName);
    var pageSize= 10;
    http.get('http://localhost:3000/v1/search?offset=' + (pageSize * (currentPage - 1)) + '&limit=' + pageSize + '&type=1&keywords=' + encodeURIComponent(curentSearchName), function(res) {
        res.on('data', function(data) {
            data = JSON.parse(data);
            showSearchList(data);
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}

function handleFile(filePath) {
    currentDir = path.dirname(filePath);
    currentFileTime = getFileInfo(filePath);

    var file = path.basename(filePath);
    currentFileName = (file);
    console.log('【' + file + '】');

    curentSearchName = file.split('.')[0];
    search();
}

function start() {
    var args = process.argv.splice(2);
    if (args[0]) {
        handleFile(args[0]);
    }
}

start();
