import React, {Component} from 'react';
import {Platform, View, Text, StyleSheet, Button} from 'react-native';
import {BleManager} from 'react-native-ble-plx';

export default class MovesenseBT extends Component {
  constructor() {
    super();
    this.manager = new BleManager();
    this.deviceId = '';
    this.state = {
      scanning: false,
      info: '',
      xAccNy: 0,
      yAccNy: 0,
      zAccNy: 0,
      xGyroNy: 0,
      yGyroNy: 0,
      zGyroNy: 0,
      Cpitch: 0,
      Cpitch2: 0,
    };
    this.lastX = 0;
    this.lastY = 0;
    (this.lastZ = 0),
      (this.lastGyroX = 0),
      (this.lastGyroY = 0),
      (this.lastGyroZ = 0),
      (this.sensors = {
        0: 'Accelerometer',
        1: 'Gyroscope',
      });
    this.deviceList = [];
  }

  info(message) {
    this.setState({info: message});
  }

  error(message) {
    this.setState({info: 'ERROR: ' + message});
    this.manager.cancelDeviceConnection(this.deviceId);
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
      if (!found) {
        let deviceName = device.name;
        if (deviceName && deviceName.includes('Movesense'))
          this.deviceList.push({name: device.name, id: device.id});
      }
    });
  }

  async connectToDevice(item) {
    alert('Connecting to ' + item.name);
    this.setState({scanning: false});
    this.deviceId = item.id;

    const {id} = await this.manager.connectToDevice(item.id);

    const device = await this.manager.discoverAllServicesAndCharacteristicsForDevice(
      item.id,
    );

    const wasConnected = await device.isConnected();
    this.deviceList = [];

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

    let xAccNy = this.convert16bitIntToFloat(arr16[1]); // 1G accelleration
    let yAccNy = this.convert16bitIntToFloat(arr16[2]);
    let zAccNy = this.convert16bitIntToFloat(arr16[3]);
    let xGyroNy = this.convert16bitIntToFloat(arr16[4]); // microtestla
    let yGyroNy = this.convert16bitIntToFloat(arr16[5]);
    let zGyroNy = this.convert16bitIntToFloat(arr16[6]);

    this.calculateValue(xAccNy, yAccNy, zAccNy, xGyroNy, yGyroNy, zGyroNy);

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
    const isConnected = await this.manager.isDeviceConnected(this.deviceId);
    if (isConnected) {
      this.manager.cancelDeviceConnection(this.deviceId);
      this.deviceList = [];
    }
  };

  calculateValue(xAccNy, yAccNy, zAccNy, xGyroNy, yGyroNy, zGyroNy) {
    let a = 0.9;
    xAccNy = (1 - a) * this.lastX + a * xAccNy;
    yAccNy = (1 - a) * this.lastY + a * yAccNy;
    zAccNy = (1 - a) * this.lastZ + a * zAccNy;
    this.lastX = xAccNy;
    this.lastY = yAccNy;
    this.lastZ = zAccNy;

    let b = 0.9;
    xGyroNy = (1 - b) * this.lastGyroX + b * xGyroNy;
    yGyroNy = (1 - b) * this.lastGyroY + b * yGyroNy;
    zGyroNy = (1 - b) * this.lastGyroZ + b * zGyroNy;
    this.lastGyroX = xGyroNy;
    this.lastGyroY = yGyroNy;
    this.lastGyroZ = zGyroNy;

    let beta = 0.1;
    let dT = 1 / 52;
    let pitch =
      (180 * Math.atan(xAccNy / Math.sqrt(yAccNy * yAccNy + zAccNy * zAccNy))) /
      Math.PI;
    let roll =
      (180 * Math.atan(yAccNy / Math.sqrt(xAccNy * xAccNy + zAccNy * zAccNy))) /
      Math.PI;
    this.setState({
      Cpitch: (
        (1 - beta) * (this.state.Cpitch - dT * xGyroNy) +
        beta * pitch
      ).toFixed(0),
      Cpitch2: (
        (1 - beta) * (this.state.Cpitch2 - dT * yGyroNy) +
        beta * roll
      ).toFixed(0),
    });
  }

  render() {
    let {xAccNy, yAccNy, zAccNy, xGyroNy, yGyroNy, zGyroNy} = this.state;
    xAccNy = parseFloat(xAccNy).toFixed(0);
    yAccNy = parseFloat(yAccNy).toFixed(0);
    zAccNy = parseFloat(zAccNy).toFixed(0);
    xGyroNy = parseFloat(xGyroNy).toFixed(0);
    yGyroNy = parseFloat(yGyroNy).toFixed(0);
    zGyroNy = parseFloat(zGyroNy).toFixed(0);
    return (
      <View>
        <Text>{this.state.info}</Text>
        <Text style={styles.metaText}>
          {this.sensors[0] +
            '\n' +
            ': X: ' +
            xAccNy +
            ' Y: ' +
            yAccNy +
            ' Z: ' +
            zAccNy}
        </Text>
        <Text style={styles.metaText}>
          {this.sensors[1] +
            '\n' +
            ': X: ' +
            xGyroNy +
            ' Y: ' +
            yGyroNy +
            ' Z: ' +
            zGyroNy}
        </Text>
        <Text style={styles.deviceList}>Device list: </Text>
        {this.deviceList &&
          this.deviceList.map((item, i) => {
            return (
              <Text
                style={styles.listView}
                key={i}
                onPress={() => this.connectToDevice(item)}>
                {' '}
                {item.name}{' '}
              </Text>
            );
          })}
        <Button onPress={this.handleStart} title="Start scan!" color="green" />
        <Button onPress={this.handleStop} title="Stop!" color="red" />
        <Text style={styles.textDisplay}>Pitch: {this.state.Cpitch}°</Text>
        <Text style={styles.textDisplay}>Roll: {this.state.Cpitch2}°</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  listView: {
    color: 'blue',
    borderColor: 'red',
    borderWidth: 1,
    margin: 20,
  },
  textDisplay: {
    fontSize: 30,
    textAlign: 'center',
  },
  metaText: {
    textAlign: 'center',
  },
  deviceList: {
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
});
