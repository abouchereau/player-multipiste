// Developed by Michel Buffa

const fs = require("fs");
// We need to use the express framework: have a real web server that knows how to send mime types etc.
const express = require("express");
const path = require("path");
const { exec } = require("child_process");

// Init globals variables for each module required
const app = express(),
    http = require("http"),
    server = http.createServer(app);

// Config
const PORT = process.env.PORT,
    TRACKS_PATH = "/home/kim/data/abouchereau/files/player-multipiste",
    addrIP = process.env.IP;


if (PORT == 8009) {
    app.use(function(req, res, next) {
        const user = auth(req);

        if (user === undefined || user["name"] !== "super" || user["pass"] !== "secret") {
            res.statusCode = 401;
            res.setHeader("WWW-Authenticate", 'Basic realm="Super duper secret area"');
            res.end("Unauthorized");
        } else {
            next();
        }
    });
}

app.use(express.static(path.resolve(__dirname, "client")));

// launch the http server on given port
server.listen(PORT || 3001, addrIP || "0.0.0.0", () => {
    const addr = server.address();
});

// routing
app.get("/", (req, res) => {
    res.sendfile(__dirname + "/index.html");
});

// routing
app.get("/user/:user", (req, res) => {
	const user = req.params.user;
	//si l'alias n'existe pas on le crée
	if (!fs.existsSync(getAliasByUser(user)) && fs.existsSync(getPathByUser(user))) {			
		exec("ln -s "+getPathByUser(user)+" "+getAliasByUser(user));
	}	
    res.sendfile(__dirname + "/client/index.html")
});

// routing
app.get("/track", async (req, res) => {
    const trackList = await getTracks();

    if (!trackList) {
        return res.send(404, "No track found");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(trackList));
    res.end();
});

app.get("/tracks/user/:user", async (req, res) => {

    const user = req.params.user;
    const trackList = await getTracksByUser(user);

    if (!trackList) {
        return res.send(404, "No track found");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(trackList));
    res.end();
});

app.get("/track/:id", async (req, res) => {
    const id = req.params.id;
    const track = await getTrack(id);

    if (!track) {
        return res.send(404, 'Track not found with id "' + id + '"');
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(track));
    res.end();
});

// routing
app.get("/track/user/:user/id/:id", async (req, res) => {
    const id = req.params.id;
    const user = req.params.user;
    const track = await getTrackByUser(user, id);

    if (!track) {
        return res.send(404, 'Track not found with id "' + id + '"');
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(track));
    res.end();
});

const getTracks = async () => {
    if (fs.existsSync(TRACKS_PATH)) {
        const directories = await getFiles(TRACKS_PATH);
        return directories.filter(dir => !dir.match(/^.DS_Store$/));
    } else {
        return [];
    }
};

const getTracksByUser = async (user) => {
    let path = getPathByUser(user);
    if (fs.existsSync(path)) {
        const directories = await getFiles(path);
        return directories.filter(dir => !dir.match(/^.DS_Store$/));
    } else {
        return [];
    }
};

const endsWith = (str, suffix) => str.indexOf(suffix, str.length - suffix.length) !== -1;

isASoundFile = fileName => {
    if (endsWith(fileName, ".mp3")) return true;
    if (endsWith(fileName, ".ogg")) return true;
    if (endsWith(fileName, ".wav")) return true;
    if (endsWith(fileName, ".m4a")) return true;
    return false;
};

const getTrack = async id =>
    new Promise(async (resolve, reject) => {
        if (!id) reject("Need to provide an ID");

        const fileNames = await getFiles(`${TRACKS_PATH}/${id}`);

        if (!fileNames) {
            reject(null);
        }

        fileNames.sort();

        const track = {
            id: id,
            instruments: fileNames
                .filter(fileName => isASoundFile(fileName))
                .map(fileName => ({
                    name: fileName.match(/(.*)\.[^.]+$/, "")[1],
                    sound: fileName
                }))
        };

        resolve(track);
    });

const getTrackByUser = async (user, id) =>
    new Promise(async (resolve, reject) => {
        if (!id) reject("Need to provide an ID");

        const fileNames = await getFiles(getPathByUser(user)+"/"+id);

        if (!fileNames) {
            reject(null);
        }

        fileNames.sort();

        const track = {
            id: id,
            instruments: fileNames
                .filter(fileName => isASoundFile(fileName))
                .map(fileName => ({
                    name: fileName.match(/(.*)\.[^.]+$/, "")[1],
                    sound: fileName
                }))
        };

        resolve(track);
    });

const getFiles = async dirName =>
    new Promise((resolve, reject) =>
        fs.readdir(dirName, function(error, directoryObject) {
            if (error) {
                reject(error);
            }

            if (directoryObject !== undefined) {
                directoryObject.sort();
            }
            resolve(directoryObject);
        })
    );


function getPathByUser(user) {
    return "/home/kim/data/"+user+"/files/multipiste";
}

function getAliasByUser(user) {
	return "/home/kim/player-multipiste/client/alias/"+user;
}
