'use strict';

const bodyParser = require('body-parser');
const path = require('path');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const https = require('https');

const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const uri = `mongodb+srv://admin:@kabobcat-dhmqz.gcp.mongodb.net/test?retryWrites=true&w=majority`;

const app = express();

const upload = multer({
    storage: multer.memoryStorage()
});

const dateFormat = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: "numeric",
    minute: "numeric"
};

app.use(bodyParser.urlencoded({
    extended: true
}));

// app.use (function (req, res, next) {
//     if (req.secure || req.hostname === "localhost") {
//             // request was via https, so do no special handling
//             next();
//     } else {
//             // request was via http, so redirect to https
//             res.redirect('https://' + req.headers.host + req.url);
//     }
// });

mongodb.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err, client) => {
    if (err) {
        throw err;
    }

    const db = client.db("Kabobcat");

    app.get('/', (req, res) => {
        fs.readFile(path.join(__dirname, '/views/home.html'), 'utf8', function (err, htmlContent) {
            const collection = db.collection('Submissions');

            collection.find().project({
                imageData: 0
            }).toArray((err, dbRecords) => {
                if (err) {
                    res.send("<p>Error reading database.</p>");
                    throw err;
                }

                const options = {
                    hostname: 'api.radar.io',
                    path: '/v1/geofences',
                    method: 'GET',
                    headers: {
                        // 'Authorization': ''
                        'Authorization': ''
                    }
                }
                // Get the Geo Fences and put the maps into the HTML.
                const subReq = https.get(options, (subRes) => {
                    let data = "";
                    subRes.on('data', (d) => {
                        data += d;
                    });

                    subRes.on('end', () => {
                        data = JSON.parse(data);

                        let simplifiedData = [];
                        for (const entry of data.geofences) {
                            simplifiedData.push({
                                coords: entry.geometry.coordinates[0],
                                description: entry.description
                            })
                        }

                        // res.send(JSON.stringify(simplifiedData));
                        let entriesHtml = "";
                        dbRecords.forEach((entry) => {
                            let map = "";

                            let buildingAbbreviation = entry.location.match(/\S+/);
                            if (buildingAbbreviation) {
                                buildingAbbreviation = buildingAbbreviation[0];
                                if (buildingAbbreviation === "COB") {
                                    buildingAbbreviation = "COB1";
                                }
                                if (buildingAbbreviation === "SE") {
                                    buildingAbbreviation = "SE1";
                                }

                                const building = simplifiedData.find(x => x.description.includes(buildingAbbreviation));

                                if (building) {
                                    let path = "path=color:0xFF6347FF|weight:5|fillcolor:0xFFD70050"
    
                                    for (const coord of building.coords) {
                                        path += "|" + coord[1] + "," + coord[0];
                                    }
                       
                                    map = `<img class="food-map" src="https://maps.googleapis.com/maps/api/staticmap?size=300x300&key=-L9M-94&${path}">`
                                }
                            }


                            entriesHtml +=
                            `<div class="food-entry">
                            <div class="flip-card-inner">
                            <div class="flip-card-front">
                            <div class="food-image-container"><img class="food-image" src="/image?_id=${entry._id}"></div>
                            <div class="food-description"><h1 class="food-type">${entry.foodType}</h1>
                            <p class="time-and-location">${new Date(entry.datetime).toLocaleDateString("en-US", dateFormat)} @ ${entry.location}</p>
                            <p class="food-provider">From: ${entry.provider}</p>
                            <p class="poster">${entry.username}</p>
                            </div>${map}
                            </div>
                            <div class="flip-card-back"><a class="delete-link" href="/delete?_id=${entry._id}">Delete</a></div>
                            </div>
                            </div>`;
                        });

                        htmlContent = htmlContent.replace("$HOME_LIST", entriesHtml);

                        res.send(htmlContent);
                    });
                });

                subReq.on('error', (error) => {
                    console.error(error);
                });

                subReq.end();
            });
        });
    });

    app.get('/buildings', function (req, res) {
        res.set('Content-Type', 'text/html');

        const options = {
            hostname: 'api.radar.io',
            path: '/v1/geofences',
            method: 'GET',
            headers: {
            }
        }

        const subReq = https.get(options, (subRes) => {
            let data = "";
            subRes.on('data', (d) => {
                data += d;
            });

            subRes.on('end', () => {
                data = JSON.parse(data);

                let simplifiedData = [];
                for (const entry of data.geofences) {
                    simplifiedData.push({
                        coords: entry.geometry.coordinates.flat(),
                        description: entry.description
                    })
                }

                res.send(JSON.stringify(simplifiedData));
            });
        });

        subReq.on('error', (error) => {
            console.error(error);
        });

        subReq.end();
    });

    app.use('/public', express.static(path.join(__dirname, 'public')));
    app.use('/manifest.json', function (req, res) {
        res.setHeader('Access-Control-Allow-Headers', 'accept, authorization, content-type, x-requested-with');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        res.setHeader('Access-Control-Allow-Origin', req.header('origin'));

        res.sendFile(path.join(__dirname, '/manifest.json'));
    });

    app.get('/image', (req, res) => {
        const collection = db.collection('Submissions');
        collection.findOne({
            "_id": new ObjectId(req.query._id)
        }, (err, entry) => {
            if (err) {
                console.error(err);
                res.end();
            } else {
                res.send(entry.imageData.buffer);
            }
        });
    });

    app.get('/delete', (req, res) => {
        const collection = db.collection('Submissions');
        console.log("/delete?_id=" + req.query._id)
        collection.removeOne({
            "_id": new ObjectId(req.query._id)
        }, (err, entry) => {
            if (err) {
                console.error(err);
                res.end();
            }
            
            res.sendFile(path.join(__dirname, '/views/deletion-confirmed.html'));
        });
    });

    app.get('/submit', (req, res) => {
        fs.readFile(path.join(__dirname, '/views/submit.html'), 'utf8', function (err, htmlContent) {
            htmlContent = htmlContent.replace("$CURRENT_DATETIME", getCurrentTimeInDateTimeFormat());

            res.write(htmlContent);
            res.end();
        });
    });

    app.post('/submit', upload.single('image'), (req, res) => {
        const collection = db.collection('Submissions');
        const msg = {
            foodType: req.body["food-type"],
            provider: req.body["food-provider"],
            location: req.body.location,
            username: req.body.username,
            datetime: req.body.datetime || getCurrentTimeInDateTimeFormat()
        };

        if (req.file) {
            msg.imageData = req.file.buffer;
        }

        collection.insertOne(msg, (err) => {
            if (err) {
                throw err;
            }

            // push out a range
            res.sendFile(path.join(__dirname, '/views/submission-confirmed.html'));
        });
    });

    // Listen to the App Engine-specified port, or 8080 otherwise
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}...`);
    });
});


function getCurrentTimeInDateTimeFormat() {
    const now = new Date();
    let currentTime = now.getFullYear();
    currentTime += '-' + String(now.getMonth() + 1).padStart(2, '0');
    currentTime += '-' + String(now.getDate()).padStart(2, '0');
    currentTime += 'T' + String(now.getHours()).padStart(2, '0');
    currentTime += ':' + String(now.getMinutes()).padStart(2, '0');

    return currentTime;
}