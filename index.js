"use strict";
import { initCustomCharacteristic } from "./CustomCharacteristic";
const fetch = require("node-fetch");
let Service, Characteristic;
var CustomCharacteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  CustomCharacteristic = initCustomCharacteristic(homebridge);
  homebridge.registerAccessory("homebridge-sevsensor", "SevSensor", SevSensor);
};

function SevSensor(log, config) {
  this.pollingInterval = 10;
  this.lastUpdate = 0;
  this.sensors = {};
  this.log = log;
  this.ip = config.ip || "http://localhost:8080";
  this.data = {};
}

SevSensor.prototype = {
  
  setData: function(params) {
    if (
      this.lastUpdate === 0 ||
      this.lastUpdate + this.pollingInterval < new Date().getTime() / 1000
    ) {
      this.fetchData(params);
      return;
    }

    this.updateData(params);
  },

  
  updateData: function(params) {
    let self = this;

    if (params["key"] in self.data) {
      let widget = self.sensors[params["key"]];

      widget.setCharacteristic(Characteristic.StatusFault, 0);
      widget.setCharacteristic(Characteristic.StatusActive, 1);
      let value = params.formatter(this.data[params["key"]]);
      this.log.info("calling callback from ",params["key"]);
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
      this.sensors[params["key"]].setCharacteristic(
        Characteristic.StatusActive,
        0
      );
      this.log.info("calling null callback from ",params["key"]);
      params.callback(null);
    }
  },
  
  fetchData: function(params) {
    let self = this;

    self.log.info('Fetching from:', self.ip);
    fetch(this.ip)
    .then(response => response.json())
    .then(data => {
      self.log.info('Fetched from:', JSON.stringify(data));
      self.data = data;
      self.lastUpdate = new Date().getTime() / 1000;
      self.updateData(params);
    }).catch(e => self.log.error("error",e.message));
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
      characteristics: [
        {
          key: "airPressure",
          characteristic: CustomCharacteristic.AtmosphericPressureLevel,
          formatter: (value) => Math.round(parseFloat(value)),
        }
      ],
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
    temperatureSensorService
      .addCharacteristic(CustomCharacteristic.AtmosphericPressureLevel);
    this.sensors["temperature"] = temperatureSensorService;


    //pressure
    

    return Object.values(this.sensors);
  },
};
