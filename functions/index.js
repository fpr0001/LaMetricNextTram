process.env.TZ = "Europe/Amsterdam";

const {onRequest} = require("firebase-functions/v2/https");
const request = require('request');

function isTrainGoingToAmsCentraal(departure) {
  if (departure.cancelled) return false;
  if (departure.direction === "Amsterdam Centraal") return true;
  return departure.routeStations.map(function (station) {
    return station.uicCode
  }).includes("8400058"); //uicCode Amsterdam Centraal
};

function getIconId(index) {
  switch (index) {
    case 0:
      return "38257"
    case 1:
      return "9004"
    case 2:
      return "9007"
    default:
      return "5101"
  }
} 

function getFrameDepartureTime(departure, index) {
  const date = new Date(departure.actualDateTime);
  return {
    "text": "At " + date.toLocaleTimeString("NL", {hour12: false, hour: '2-digit', minute: '2-digit'}),
    "icon": getIconId(index),
  };
};

function minutesDiff(dateTimeValue2, dateTimeValue1) {
  var differenceValue =(dateTimeValue2.getTime() - dateTimeValue1.getTime()) / 1000;
  differenceValue /= 60;
  return Math.abs(Math.round(differenceValue));
}

function isTrainDepartingInMoreThan5Minutes(dateTimeValue, departure) {
  return minutesDiff(new Date(departure.actualDateTime), dateTimeValue) >= 5;
}

function byActualDateTime(departure1, departure2) {
  return new Date(departure1.actualDateTime) - new Date(departure2.actualDateTime);
}

const nextTrainFromZaandamToAmsterdamCentraal = onRequest((req, res) => {
  
  const options = {
    url: 'https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/departures?uicCode=8400731', //this code is station zaandam
    headers: {
      'Ocp-Apim-Subscription-Key': '<api_key_here>'
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

      const currentDateTime = new Date();
      const trainsToAmsCentraal = body.payload.departures.filter(isTrainGoingToAmsCentraal).filter(departure => isTrainDepartingInMoreThan5Minutes(currentDateTime, departure)).slice(0, 3).sort(byActualDateTime);

      if(trainsToAmsCentraal.length === 0) {
        const frame0 = {
          "text": "No trains!",
          "icon": "5101",
        };
        responseObj.frames.push(frame0);
        return res.status(200).send(responseObj);
      } else {
        trainsToAmsCentraal.forEach((element, index) => {
          responseObj.frames.push(getFrameDepartureTime(element, index))
        });
        return res.status(200).send(responseObj);
      }
    }
  });
});

exports.nextTrain = nextTrainFromZaandamToAmsterdamCentraal;