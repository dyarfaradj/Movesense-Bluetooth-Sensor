import React, {Component} from 'react';
import {Platform, View, Text} from 'react-native';
import {BleManager} from 'react-native-ble-plx';
import {Buffer} from 'buffer';
// import base64 from 'react-native-base64';
// var base64 = require('base-64');

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

    const service = '00001809-0000-1000-8000-00805f9b34fb';
    const characteristicW = '00002a21-0000-1000-8000-00805f9b34fb';
    const characteristicN = '00002a1c-0000-1000-8000-00805f9b34fb';

    console.log(Uint16Array.of(902));

    // const characteristic = await .writeCharacteristicWithResponseForDevice(
    //   device,
    //   service,
    //   characteristicW,
    //   'OTAy',
    // );

    const characteristic = await device.writeCharacteristicWithResponseForService(
      service,
      characteristicW,
      'OTAy' /* 0x01 in hex */, //zoY=
    );

    device.monitorCharacteristicForService(
      service,
      characteristicN,
      (error, characteristic) => {
        if (error) {
          this.error(error.message);
          return;
        }
        // const bytes = base64.toByteArray(characteristic.value);
        // const view = new DataView(bytes.buffer);
        // const value = view.getFloat32();

        // const buffer = new Buffer(characteristic.value, 'base64');
        // const bufStr = buffer;

        const value = this.b64toBlob(characteristic.value, 'image/jpeg;base64');
        // console.log('AAAA: ' + characteristic.uuid + ' VALUE: ' + value);
        this.updateValue(characteristic.uuid, characteristic.value);
      },
    );
  }

  atob = input => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 == 1) {
      throw new Error(
        "'atob' failed: The string to be decoded is not correctly encoded.",
      );
    }
    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
  };

  b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
    const byteCharacters = this.atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    // console.log('LL: ' + byteArrays);

    this.convertUint8ToUintArray16Array(byteArrays[0]);

    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
  };

  convertUint8ToUintArray16Array(event) {
    const value = event;
    const arr16 = new Uint16Array(10);
    arr16[0] = (value[1] << 8) + value[0];
    arr16[1] = (value[3] << 8) + value[2];
    arr16[2] = (value[5] << 8) + value[4];
    arr16[3] = (value[7] << 8) + value[6];
    arr16[4] = (value[9] << 8) + value[8];
    arr16[5] = (value[11] << 8) + value[10];
    arr16[6] = (value[13] << 8) + value[12];
    arr16[7] = (value[15] << 8) + value[14];
    arr16[8] = (value[17] << 8) + value[16];
    arr16[9] = (value[19] << 8) + value[18];

    let xAccNy = this.convert16bitIntToFloat(arr16[1]) / 10.0; // 1G accelleration
    let yAccNy = this.convert16bitIntToFloat(arr16[2]) / 10.0;
    let zAccNy = this.convert16bitIntToFloat(arr16[3]) / 10.0;
    let xGyroNy = this.convert16bitIntToFloat(arr16[4]); // microtestla
    let yGyroNy = this.convert16bitIntToFloat(arr16[5]);
    let zGyroNy = this.convert16bitIntToFloat(arr16[6]);

    console.log(xAccNy, yAccNy, zAccNy, xGyroNy, yGyroNy, zGyroNy);
    // console.log('arr: ' + arr16);
    return arr16;
  }

  byteToUint8Array(byteArray) {
    console.log(typeof byteArray);
    var uint8Array = new Uint8Array(byteArray.length);
    for (var i = 0; i < uint8Array.length; i++) {
      console.log('LALAL: ' + byteArray[i]);
      uint8Array[i] = byteArray[i];
    }

    return uint8Array;
  }

  convert16bitIntToFloat(num) {
    var SPAN = 4000;
    var NR_SIZE = 65535;
    return (num * SPAN) / NR_SIZE - SPAN / 2;
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
