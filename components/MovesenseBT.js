import React, {Component} from 'react';
import {Platform, View, Text} from 'react-native';
import {BleManager} from 'react-native-ble-plx';

export default class MovesenseBT extends Component {
  constructor() {
    super();
    this.manager = new BleManager();
    this.state = {info: '', values: {}};
    this.prefixUUID = 'f000aa';
    this.suffixUUID = '-0451-4000-b000-000000000000';
    this.sensors = {
      0: 'Accelerometer',
      2: 'Gyroscope',
    };
    this.deviceList = [{}];
  }

  serviceUUID(num) {
    return this.prefixUUID + num + '0' + this.suffixUUID;
  }

  notifyUUID(num) {
    return this.prefixUUID + num + '1' + this.suffixUUID;
  }

  writeUUID(num) {
    return this.prefixUUID + num + '2' + this.suffixUUID;
  }

  info(message) {
    this.setState({info: message});
  }

  error(message) {
    this.setState({info: 'ERROR: ' + message});
  }

  updateValue(key, value) {
    this.setState({values: {...this.state.values, [key]: value}});
  }

  UNSAFE_componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange(state => {
        if (state === 'PoweredOn') this.scanAndConnect();
      });
    } else {
      this.scanAndConnect();
    }
  }

  scanAndConnect() {
    // this.manager
    //   .discoverAllServicesAndCharacteristicsForDevice('0C:8C:DC:2E:85:E6')
    //   .then(data => console.log(data));
    this.manager.startDeviceScan(null, null, (error, device) => {
      this.info('Scanning...');
      if (error) {
        this.error(error.message);
        return;
      }
      var found = this.deviceList.some(item => item.name === device.name);
      if (!found) this.deviceList.push({name: device.name, id: device.id});
    });
  }

  async test(device) {
    const service = '61353090-8231-49cc-b57a-886370740041';
    const characteristicW = '00002a1c-0000-1000-8000-00805f9b34fb';
    const characteristicN = '00002a1c-0000-1000-8000-00805f9b34fb';

    const characteristic = await device.writeCharacteristicWithResponseForService(
      service,
      characteristicW,
      'AQ==' /* 0x01 in hex */,
    );

    device.monitorCharacteristicForService(
      service,
      characteristicN,
      (error, characteristic) => {
        if (error) {
          this.error(error.message);
          return;
        }
        this.updateValue(characteristic.uuid, characteristic.value);
      },
    );
  }

  async connectToDevice(item) {
    console.log(item);
    const {id} = await this.manager.connectToDevice(item.id);

    const device = await this.manager.discoverAllServicesAndCharacteristicsForDevice(
      item.id,
    );

    const wasConnected = await device.isConnected();

    // if (wasConnected) {
    //   storeDevice(device);
    // }

    // todo - temp for test
    const services = await device.services();

    const charPromises = services.map(service => service.characteristics());

    const characteristics = await Promise.all(
      charPromises.map(p => p.catch(e => console.error(e) || e)),
    );

    // here I see connected devices services and characteristics UUIDs and there are my hardcoded too!
    console.log(characteristics);

    const service = '00001800-0000-1000-8000-00805f9b34fb';
    const characteristicW = '00002a1c-0000-1000-8000-00805f9b34fb';
    const characteristicN = '00002a1c-0000-1000-8000-00805f9b34fb';

    const characteristic = await device.writeCharacteristicWithResponseForService(
      service,
      characteristicW,
      'AQ==' /* 0x01 in hex */,
    );

    device.monitorCharacteristicForService(
      service,
      characteristicN,
      (error, characteristic) => {
        if (error) {
          this.error(error.message);
          return;
        }
        this.updateValue(characteristic.uuid, characteristic.value);
      },
    );
  }

  async setupNotifications(device) {
    for (const id in this.sensors) {
      const service = this.serviceUUID(id);
      const characteristicW = this.writeUUID(id);
      const characteristicN = this.notifyUUID(id);

      const characteristic = await device.writeCharacteristicWithResponseForService(
        service,
        characteristicW,
        'AQ==' /* 0x01 in hex */,
      );

      device.monitorCharacteristicForService(
        service,
        characteristicN,
        (error, characteristic) => {
          if (error) {
            this.error(error.message);
            return;
          }
          this.updateValue(characteristic.uuid, characteristic.value);
        },
      );
    }
  }

  render() {
    return (
      <View>
        <Text>{this.state.info}</Text>
        {Object.keys(this.sensors).map(key => {
          return (
            <Text key={key}>
              {this.sensors[key] +
                ': ' +
                (this.state.values[this.notifyUUID(key)] || '-')}
            </Text>
          );
        })}
        {this.deviceList &&
          this.deviceList.map((item, i) => {
            return (
              <Text key={i} onPress={() => this.connectToDevice(item)}>
                {' '}
                {item.name}{' '}
              </Text>
            );
          })}
      </View>
    );
  }
}
