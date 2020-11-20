// Example Air Quality Sensor Plugin

module.exports = (api) => {
  api.registerAccessory('homebridge-sevsensor', SevSensorAccessory);
};

class SevSensorAccessory {

  constructor(log, config, api) {
      this.log = log;
      this.config = config;
      this.api = api;

      this.Service = this.api.hap.Service;
      this.Characteristic = this.api.hap.Characteristic;

      // extract name from config
      this.name = config.name;

      // your accessory must have an AccessoryInformation service
      this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(this.api.hap.Characteristic.Model, "Custom Model");


      // create a new Air Quality Sensor service
      this.service = new this.Service(this.Service.AirQualitySensor);

      // create handlers for required characteristics
      this.service.getCharacteristic(this.Characteristic.AirQuality)
        .on('get', this.handleAirQualityGet.bind(this));

  }

  /**
   * Handle requests to get the current value of the "Air Quality" characteristic
   */
  handleAirQualityGet(callback) {
    this.log.debug('Triggered GET AirQuality');

    // set this to a valid value for AirQuality
    const currentValue = 1;

    callback(null, currentValue);
  }


}