import React, {Component} from 'react';
import {Platform, View, Text, Button} from 'react-native';
import {BleManager} from 'react-native-ble-plx';

export default class MovesenseBT extends Component {
  constructor() {
    super();
    this.manager = new BleManager();
    this.state = {
      deviceId: '',
      scanning: false,
      info: '',
      xAccNy: 0,
      yAccNy: 0,
      zAccNy: 0,
      xGyroNy: 0,
      yGyroNy: 0,
      zGyroNy: 0,
      lastX: 0,
      lastY: 0,
      lastZ: 0,
    };
    this.sensors = {
      0: 'Accelerometer',
      1: 'Gyroscope',
    };
    this.deviceList = [{}];
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
    alert('Connecting to ' + item.name);
    this.setState({deviceId: item.id, scanning: false});

    const {id} = await this.manager.connectToDevice(item.id);

    const device = await this.manager.discoverAllServicesAndCharacteristicsForDevice(
      item.id,
    );

    const wasConnected = await device.isConnected();
    this.deviceList = [{}];

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

    const characteristic = await device.writeCharacteristicWithResponseForService(
      service,
      characteristicW,
      'hgM=' /* 0x01 in hex */, //zoY=
    );

    device.monitorCharacteristicForService(
      service,
      characteristicN,
      (error, characteristic) => {
        if (error) {
          this.error(error.message);
          return;
        }
        this.b64toBlob(characteristic.value, 'image/jpeg;base64');
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

    this.setState({
      xAccNy: xAccNy,
      yAccNy: yAccNy,
      zAccNy: zAccNy,
      xGyroNy: xGyroNy,
      yGyroNy: yGyroNy,
      zGyroNy: zGyroNy,
    });

    //console.log(xAccNy, yAccNy, zAccNy, xGyroNy, yGyroNy, zGyroNy);
    return arr16;
  }

  byteToUint8Array(byteArray) {
    console.log(typeof byteArray);
    var uint8Array = new Uint8Array(byteArray.length);
    for (var i = 0; i < uint8Array.length; i++) {
      uint8Array[i] = byteArray[i];
    }

    return uint8Array;
  }

  convert16bitIntToFloat(num) {
    var SPAN = 4000;
    var NR_SIZE = 65535;
    return (num * SPAN) / NR_SIZE - SPAN / 2;
  }

  handleStart = () => {
    if (!this.state.scanning) {
      this.setState({scanning: true});
      if (Platform.OS === 'ios') {
        this.manager.onStateChange(state => {
          if (state === 'PoweredOn') this.scanAndConnect();
        });
      } else {
        this.scanAndConnect();
      }
    } else {
      alert('Scan is already running!');
    }
  };

  handleStop = async () => {
    const isConnected = await this.manager.isDeviceConnected(
      this.state.deviceId,
    );
    if (isConnected) {
      this.manager.cancelDeviceConnection(this.state.deviceId);
      this.deviceList = [{}];
    }
  };

  calculateAndFilter(x, y, z, yGyroNy) {
    let a = 0.1;
    x = (1 - a) * lastX + a * x;
    y = (1 - a) * lastY + a * y;
    z = (1 - a) * lastZ + a * z;
    this.setState({lastX: x, lastY: y, lastZ: z});

    let beta = 0.1;
    let dT = 1 / 52;
    let pitch = (180 * Math.atan(x / sqrt(y * y + z * z))) / Math.PI;
    this.setState({
      Cpitch: (1 - beta) * (this.state.Cpitch - dT * yGyroNy) + beta * pitch,
    });
    return this.state.Cpitch;
  }

  render() {
    let {xAccNy, yAccNy, zAccNy, xGyroNy, yGyroNy, zGyroNy} = this.state;
    xAccNy = parseFloat(xAccNy).toFixed(3);
    yAccNy = parseFloat(yAccNy).toFixed(3);
    zAccNy = parseFloat(zAccNy).toFixed(3);
    xGyroNy = parseFloat(xGyroNy).toFixed(3);
    yGyroNy = parseFloat(yGyroNy).toFixed(3);
    zGyroNy = parseFloat(zGyroNy).toFixed(3);
    return (
      <View>
        <Text>{this.state.info}</Text>
        <Text>
          {this.sensors[0] +
            ': X: ' +
            xAccNy +
            ' Y: ' +
            yAccNy +
            ' Z: ' +
            zAccNy}
        </Text>
        <Text>
          {this.sensors[1] +
            ': X: ' +
            xGyroNy +
            ' Y: ' +
            yGyroNy +
            ' Z: ' +
            zGyroNy}
        </Text>
        <Text>Device list: </Text>
        {this.deviceList &&
          this.deviceList.map((item, i) => {
            return (
              <Text key={i} onPress={() => this.connectToDevice(item)}>
                {' '}
                {item.name}{' '}
              </Text>
            );
          })}
        <Button onPress={this.handleStart} title="Start scan!" color="green" />
        <Button onPress={this.handleStop} title="Stop!" color="red" />
      </View>
    );
  }
}
