# music-updater

Personal usage for updating '.wma' file to '.mp3' in my old computure.

With great thanks to @sqaiyan for sharing `https://github.com/sqaiyan/netmusic-node`.

## Usage

1. run `git clone https://github.com/sqaiyan/netmusic-node.git` to anywhere to get http-server side
1. run `node netmusic-node/app.js` to start the server
1. run `node music-client/app.js 'path/to/file.mp3'`

## Dependence

- nodejs
- wget

On `windows`, you should add `wget.exe` file path to `System Path`, so that you can use `wget` command anywhere directly.