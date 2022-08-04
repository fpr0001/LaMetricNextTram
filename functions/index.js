process.env.TZ = "Europe/Amsterdam";

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
const request = require('request');

// https://maps.gvb.nl/api/v1/timetable_validities?linenumber=26&include=timetables

app.use(cors({origin: true}));

const rawdata = fs.readFileSync("26-away-timetable.json");
const timeTableJson = JSON.parse(rawdata).trips
    .map((trip) => getDateFromTime(trip.times[6]));

/**
     *
     * @param {*} time
     * @returns
     */
function getDateFromTime(time) {
  const splitTime = time.split(":");
  if (splitTime[0] == "24" || splitTime[0] == "00") {
    return new Date("2021-03-04T00:"+splitTime[1]+":"+splitTime[2]);
  } else {
    return new Date("2021-03-03T"+time);
  }
};

// app.get("/timeTableJson", (req, res) => {
//   return res.status(200).send(timeTableJson);
// });

// app.get("/next-26-to-central-v1", (req, res) => {
//   const currentDate = getDateFromTime((new Date()).toLocaleTimeString("NL", {hour12: false}));
//   const indexTimeScheduled = timeTableJson.findIndex((date) => date.getTime() > currentDate.getTime());

//   const responseObj={};
//   responseObj.frames=[];
  
//   if (indexTimeScheduled == -1) {
//     // only tomorrow
//     const frame0 = {
//       "text": "Only tomorrow!",
//       "icon": "5101",
//     };
//     responseObj.frames.push(frame0);
//     return res.status(200).send(responseObj);
//   } else {
//     const millisecondsForTheTrain = timeTableJson[indexTimeScheduled].getTime() - currentDate.getTime();
//     const frame0 = {
//       "text": "In " + (millisecondsForTheTrain / 1000 / 60).toFixed(1) + " min",
//       "icon": "5101",
//     };
//     responseObj.frames.push(frame0);
//     const frame1 = {
//       "text": "At " + timeTableJson[indexTimeScheduled].toLocaleTimeString("NL", {hour12: false, hour: '2-digit', minute: '2-digit'}),
//       "icon": "5101",
//     };
//     responseObj.frames.push(frame1);
//     return res.status(200).send(responseObj);
//   }
// });

function isTrainGoingToAmsCentraal(departure) {
  if (departure.cancelled) return false;
  if (departure.direction === "Amsterdam Centraal") return true;
  return departure.routeStations.map(function (station) {
    return station.uicCode
  }).includes("8400058"); //uicCode Amsterdam Centraal
};

function getFrameDepartureTime(departure) {
  const date = new Date(departure.actualDateTime);
  return {
    "text": "At " + date.toLocaleTimeString("NL", {hour12: false, hour: '2-digit', minute: '2-digit'}),
    "icon": "5101",
  };
};

function getFrameSpoor(departure) {
  return {
    "text": "Spoor " + departure.plannedTrack,
    "icon": "5101",
  };
};

app.get("/next-26-to-central", (req, res) => {  
  
  const options = {
    url: 'https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/departures?uicCode=8400731', //this code is station zaandam
    headers: {
      'Ocp-Apim-Subscription-Key': '<token here>'
    },
    json: true
  };

  request.get(options, (err, res2, body) => {
    if (err) { 
      console.log(err); 
      return res.status(res2.statusCode).send(res2.statusMessage)
    } else {

      const responseObj={};
      responseObj.frames=[];

      const trainsToAmsCentraal = body.payload.departures.filter(isTrainGoingToAmsCentraal);

      if(trainsToAmsCentraal.length === 0) {
        const frame0 = {
          "text": "No trains!",
          "icon": "5101",
        };
        responseObj.frames.push(frame0);
        return res.status(200).send(responseObj);
      } else {
        responseObj.frames.push(getFrameDepartureTime(trainsToAmsCentraal[0]))
        responseObj.frames.push(getFrameSpoor(trainsToAmsCentraal[0]))
        if (trainsToAmsCentraal.length > 1) {
          responseObj.frames.push(getFrameDepartureTime(trainsToAmsCentraal[1]))
          responseObj.frames.push(getFrameSpoor(trainsToAmsCentraal[1]))
        }
        return res.status(200).send(responseObj);
      }
    }
  });
});

exports.app = functions.https.onRequest(app);
