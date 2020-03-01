'use strict';

const bodyParser = require('body-parser');
const path = require('path');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const https = require('https');

const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const uri = `mongodb+srv://admin:ORKeaIb0LJtxSDmT@kabobcat-dhmqz.gcp.mongodb.net/test?retryWrites=true&w=majority`;

const app = express();

const upload = multer({
    storage: multer.memoryStorage()
});
// var redirectToHTTPS = require('express-http-to-https').redirectToHTTPS

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

// Don't redirect if the hostname is `localhost:port` or the route is `/insecure`
// app.use(redirectToHTTPS([/localhost:(\d{4})/], [/\/insecure/], 301));

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
                        // 'Authorization': 'prj_live_sk_839be5f8b1c16f3df252c567eb60c04bc82f1ea9'
                        'Authorization': 'prj_test_sk_9db46719ded3f185c0aaf3dfd116e91407554ff0'
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
                                coords: entry.geometry.coordinates.flat(),
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
                                let path = "path=color:0xFF6347FF|weight:5|fillcolor:0xFFD70050"

                                for (const coord of building.coords) {
                                    path += "|" + coord[1] + "," + coord[0];
                                }
                   
                                map = `<img class="food-map" src="https://maps.googleapis.com/maps/api/staticmap?size=300x300&key=AIzaSyDvpyVp8M7ZII_yJVwL0fkfZ2As-L9M-94&${path}">`
                            }


                            entriesHtml +=
                            `<div class="food-entry">
                            <div class="food-image-container"><img class="food-image" src="/image?_id=${entry._id}"></div>
                            <div class="food-description"><h1 class="food-type">${entry.foodType}</h1>
                            <p class="time-and-location">${new Date(entry.datetime).toLocaleDateString("en-US", dateFormat)} @ ${entry.location}</p>
                            <p class="food-provider">From: ${entry.provider}</p>
                            <p class="poster">${entry.username}</p>
                            </div>${map}</div>`;
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
                // 'Authorization': 'prj_live_sk_839be5f8b1c16f3df252c567eb60c04bc82f1ea9'
                'Authorization': 'prj_test_sk_9db46719ded3f185c0aaf3dfd116e91407554ff0'
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

    app.get('/submit', (req, res) => {
        fs.readFile(path.join(__dirname, '/views/submit.html'), 'utf8', function (err, htmlContent) {
            htmlContent = htmlContent.replace("$CURRENT_DATETIME", getCurrentTimeInDateTimeFormat());

            res.write(htmlContent);
            res.end();

            // const collection = db.collection('Submissions');

            // let msglist = '';
            // collection.find().toArray((err, dbRecords) => {
            //     if (err) {
            //         throw err;
            //     }

            //     dbRecords.forEach((msg) => {
            //         msglist += `<h1>${msg.name}</h1><p>${msg.message}</p><p><em>${msg.datetime}</em></p>`;
            //     });

            //     res.write(msglist);
            //     res.end();
            // });
        });
    });

    app.post('/submit', upload.single('image'), (req, res) => {
        // console.log({
        //     name: req.body.name,
        //     message: req.body.message
        // });

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