"use strict";

let Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-sevsensor", "SevSensor", SevSensor);
};

function SevSensor(log, config) {
  this.pollingInterval = 1;
  this.lastUpdate = 0;
  this.sensors = {};
  this.data = undefined;
}

SevSensor.prototype = {
  // wrapper for updateData method (new data/cache)
  setData: function(params) {
    if (
      this.lastUpdate === 0 ||
      this.lastUpdate + this.pollingInterval < new Date().getTime() / 1000 ||
      this.data === undefined
    ) {
      this.fetchData(params);
      return;
    }

    this.updateData(params);
  },

  // update sensors data
  updateData: function(params) {
    let self = this;

    if (params["key"] in self.data) {
      let widget = self.sensors[params["key"]];

      widget.setCharacteristic(Characteristic.StatusFault, 0);
      let value = params.formatter(this.data[params["key"]]);
      params.callback(null, value);
      if ("characteristics" in params) {
        params["characteristics"].forEach(function(characteristic) {
          let value = characteristic.formatter(self.data[characteristic.key]);
          widget.setCharacteristic(characteristic.characteristic, value);
        });
      }
    } else {
      this.sensors[params["key"]].setCharacteristic(
        Characteristic.StatusFault,
        1
      );
      params.callback(null);
    }
  },

  // fetch new data from Airly
  fetchData: function(params) {
    let self = this;

    self.data = {
      airQualityIndex: Math.floor(Math.random() * (5 - 0 + 1)) + 0,
      pm25: Math.floor(Math.random() * (1000 - 0 + 1)) + 0,
      voc: Math.floor(Math.random() * (1000 - 0 + 1)) + 0,
      temperature: Math.floor(Math.random() * (100 - 0 + 1)) + 0,
      humidity: Math.floor(Math.random() * (100 - 0 + 1)) + 0,
      airPressure: Math.floor(Math.random() * (1200 - 500 + 1)) + 500,
      carbonDioxideLevel: Math.floor(Math.random() * (2000 - 400 + 1)) + 400,
      carbonDioxideDetected: 0,
    };
    self.lastUpdate = new Date().getTime() / 1000;
    self.updateData(params);
    /* request(
      {
        url:
          "https://airapi.airly.eu/v1/mapPoint/measurements?latitude=" +
          this.latitude +
          "&longitude=" +
          this.longitude,
        json: true,
        headers: {
          apikey: self.apikey,
        },
      },
      function(err, response, data) {
        if (!err && response.statusCode === 200) {
          self.data = data.currentMeasurements;
          self.lastUpdate = new Date().getTime() / 1000;
          self.updateData(params);
        } else {
          logger.log("error", "fetchData error");
        }
        self.fetchInProgress = false;
      }
    ); */
  },

  updateAirQualityIndex: function(callback) {
    this.setData({
      callback: callback,
      key: "airQualityIndex",
      characteristics: [
        {
          key: "pm25",
          characteristic: Characteristic.PM2_5Density,
          formatter: (value) => parseFloat(value),
        },
        {
          key: "voc",
          characteristic: Characteristic.VOCDensity,
          formatter: (value) => parseFloat(value),
        },
      ],
      formatter: (value) => Math.round(parseFloat(value)),
    });
  },

  updateCarbonDioxide: function(callback) {
    this.setData({
      callback: callback,
      key: "carbonDioxideDetected",
      characteristics: [
        {
          key: "carbonDioxideLevel",
          characteristic: Characteristic.CarbonDioxideLevel,
          formatter: (value) => parseFloat(value),
        }
      ],
      formatter: (value) => Math.round(parseFloat(value)),
    });
  },

  updateTemperature: function(callback) {
    this.setData({
      callback: callback,
      key: "temperature",
      formatter: (value) => Math.round(parseFloat(value)*10)/10,
    });
  },

  updateHumidity: function(callback) {
    this.setData({
      callback: callback,
      key: "humidity",
      formatter: (value) => Math.round(parseFloat(value)),
    });
  },


  identify: (callback) => callback(),

  getServices: function() {
    let informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "dboth")
      .setCharacteristic(Characteristic.Model, "API")
      .setCharacteristic(Characteristic.SerialNumber, "0000-0000-0000");
    this.sensors["information"] = informationService;

    //aqi, voc, pm25
    let airQualityIndexSensorService = new Service.AirQualitySensor(
      "Luftqualität"
    );
    airQualityIndexSensorService
      .getCharacteristic(Characteristic.AirQuality)
      .on("get", this.updateAirQualityIndex.bind(this));
    this.sensors["airQualityIndex"] = airQualityIndexSensorService;

    //co2
    let carbonDioxideSensorService = new Service.CarbonDioxideSensor("CO2");
    carbonDioxideSensorService
      .getCharacteristic(Characteristic.CarbonDioxideDetected)
      .on("get", this.updateCarbonDioxide.bind(this));
    this.sensors["carbonDioxideDetected"] = carbonDioxideSensorService;

    //humidity
    let humiditySensorService = new Service.HumiditySensor("Luftfeuchtigkeit");
    humiditySensorService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on("get", this.updateHumidity.bind(this));
    this.sensors["humidity"] = humiditySensorService;

    //temperature
    let temperatureSensorService = new Service.TemperatureSensor("Temperatur");
    temperatureSensorService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on("get", this.updateTemperature.bind(this));
    this.sensors["temperature"] = temperatureSensorService;

    //pressure
    

    return Object.values(this.sensors);
  },
};
