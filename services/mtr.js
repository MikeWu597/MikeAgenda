const express = require('express');
const axios = require('axios');

const router = express.Router();

// Function to fetch MTR schedule
async function fetchMTRSchedule(line, station) {
  try {
    const response = await axios.get(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${station}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch MTR schedule: ${error.message}`);
  }
}

// GET /mtr/next-train-to-hh - Get the next train from Austin to Hung Hom
router.get('/next-train-to-hh', async (req, res) => {
  try {
    // Fetch schedule for Austin Station (AUS)
    const austinData = await fetchMTRSchedule('TML', 'AUS');
    
    // Fetch schedule for Hung Hom Station (HUH)
    const hungHomData = await fetchMTRSchedule('TML', 'HUH');
    
    // Extract DOWN direction trains from Austin (towards WKS)
    const austinTrains = austinData.data['TML-AUS'].DOWN;
    
    // Extract DOWN direction trains from Hung Hom (towards WKS)
    const hungHomTrains = hungHomData.data['TML-HUH'].DOWN;
    
    // Get the first train departing from Austin
    if (austinTrains.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No departing trains from Austin'
      });
    }
    
    // Sort Austin trains by departure time
    austinTrains.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Get the earliest departing train
    const firstAustinTrain = austinTrains[0];
    const departureTime = new Date(firstAustinTrain.time);
    
    // Calculate estimated arrival time at Hung Hom (approximately 5 minutes)
    const estimatedArrivalTime = new Date(departureTime.getTime() + 5 * 60 * 1000); // Add 5 minutes
    
    // Find the train at Hung Hom with the closest arrival time to our estimate
    let closestTrain = null;
    let minTimeDifference = Infinity;
    
    for (const train of hungHomTrains) {
      const arrivalTime = new Date(train.time);
      const timeDifference = Math.abs(arrivalTime.getTime() - estimatedArrivalTime.getTime());
      
      if (timeDifference < minTimeDifference) {
        minTimeDifference = timeDifference;
        closestTrain = train;
      }
    }
    
    // Get current time from MTR API response
    const currentTime = new Date(austinData.sys_time);
    
    // Calculate time until first departure
    const timeUntilDeparture = Math.floor((departureTime - currentTime) / 1000);
    
    if (closestTrain) {
      res.json({
        status: 'success',
        data: {
          departAustin: firstAustinTrain.time,
          actualArrivalAtHungHom: closestTrain.time,
          timeUntilDeparture: timeUntilDeparture // Time until first departure in seconds
        },
        message: 'Next train from Austin to Hung Hom'
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'No matching trains found'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});



// GET /mtr/next-train-to-aus - Get the next train from Austin to Hung Hom
router.get('/next-train-to-aus', async (req, res) => {
  try {
    // Fetch schedule for Austin Station (AUS)
    const austinData = await fetchMTRSchedule('TML', 'AUS');
    
    // Fetch schedule for Hung Hom Station (HUH)
    const hungHomData = await fetchMTRSchedule('TML', 'HUH');
    
    // Extract UP direction trains from Hung Hom (towards AUS)
    const hungHomTrains = austinData.data['TML-AUS'].UP;
    
    // Extract UP direction trains from Austin (towards HUH)
    const austinTrains = hungHomData.data['TML-HUH'].UP;
    
    // Get the first train departing from Hung Hom
    if (hungHomTrains.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No departing trains from Hung Hom'
      });
    }
    
    // Sort Hung Hom trains by departure time
    hungHomTrains.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Get the earliest departing train
    const firstHungHomTrain = hungHomTrains[0];
    const departureTime = new Date(firstHungHomTrain.time);
    
    // Calculate estimated arrival time at Austin (approximately 5 minutes)
    const estimatedArrivalTime = new Date(departureTime.getTime() + 5 * 60 * 1000); // Add 5 minutes
    
    // Find the train at Austin with the closest arrival time to our estimate
    let closestTrain = null;
    let minTimeDifference = Infinity;
    
    for (const train of austinTrains) {
      const arrivalTime = new Date(train.time);
      const timeDifference = Math.abs(arrivalTime.getTime() - estimatedArrivalTime.getTime());
      
      if (timeDifference < minTimeDifference) {
        minTimeDifference = timeDifference;
        closestTrain = train;
      }
    }
    
    // Get current time from MTR API response
    const currentTime = new Date(hungHomData.sys_time);
    
    // Calculate time until first departure
    const timeUntilDeparture = Math.floor((departureTime - currentTime) / 1000);
    
    if (closestTrain) {
      res.json({
        status: 'success',
        data: {
          departHungHom: firstHungHomTrain.time,
          actualArrivalAtAustin: closestTrain.time,
          timeUntilDeparture: timeUntilDeparture // Time until first departure in seconds
        },
        message: 'Next train from Hung Hom to Austin'
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'No matching trains found'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;