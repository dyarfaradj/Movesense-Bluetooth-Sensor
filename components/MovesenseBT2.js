import React, {Component} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Button,
  Alert,
} from 'react-native';

import {BleManager} from 'react-native-ble-plx';

export default class MovesenseBT2 extends Component {
  constructor() {
    super();
    this.manager = new BleManager();
    this.state = {
      deviceConnected: null,
      connected: false,
      deviceId: 0,
    };
  }

  // componentDidMount() {
  // 	const subscription = this.manager.onStateChange((state) => {
  // 		if (state === 'PoweredOn') {
  // 			this.scanAndConnect();
  // 			subscription.remove();
  // 			// alert("Patate")
  // 		}
  // 	}, true);
  // }

  info(message) {
    this.setState({info: message});
  }

  error(message) {
    this.setState({info: 'ERROR: ' + message});
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        // Handle error (scanning will be stopped automatically)
        alert('Error : ', error);
        return;
      }
      // Check if it is a device you are looking for based on advertisement data
      // or other criteria.
      // if (device.id === 'A4:CF:12:32:19:9E') {
      // if (device.name === 'TrickyRoad') {
      if (device.name === 'Movesense 192830000232') {
        // Stop scanning as it's not necessary if you are scanning for one device.
        this.manager.stopDeviceScan();

        // Proceed with connection.
        console.log('Connecting to ' + device.name);
        device
          .connect()

          .then(device => {
            this.info('Discovering services and characteristics');
            return device.discoverAllServicesAndCharacteristics();
          })
          .then(device => {
            this.info(device.id);
            device
              .writeCharacteristicWithoutResponseForService(
                '61353090-8231-49cc-b57a-886370740041',
                '17816557-5652-417f-909f-3aee61e5fa85',
                'aGVsbG8gbWlzcyB0YXBweQ==',
              )
              .then(characteristic => {
                this.info(characteristic.value);
                return;
              });
            // Do work on device with services and characteristics
            this.setState({connected: true});
            this.setState({deviceConnected: device});
            this.setState({deviceId: device.id});
          })
          .catch(error => {
            console.log(error);
          });
      }
    });
  }

  disconnect() {
    console.log(this.state.deviceConnected);
    // this.state.deviceConnected.cancelConnection()
    this.manager
      .cancelDeviceConnection(this.state.deviceId)
      .then(() => console.log('disconnected'))
      .then(this.setState({connected: false}))
      .then(this.setState({deviceConnected: null}))
      .then(this.setState({}));
  }

  render() {
    console.log('ETAT CONNEXION : ', this.state.connected);
    if (this.state.connected === false) {
      return (
        <SafeAreaView style={styles.container}>
          <View>
            <Button
              onPress={() => {
                this.scanAndConnect();
              }}
              title="Connect"></Button>

            <Button
              onPress={() => {
                this.disconnect();
              }}
              title="Disconnect !
						"></Button>
            <View style={styles.statusFalse}>
              <Text>SHIBAS</Text>
            </View>
          </View>
        </SafeAreaView>
      );
    } else {
      return (
        <SafeAreaView style={styles.container}>
          <View>
            <Button
              onPress={() => {
                this.scanAndConnect();
              }}
              title="Connect"></Button>

            <Button
              onPress={() => {
                this.disconnect();
              }}
              title="Disconnect !
						"></Button>
            <View style={styles.statusTrue}>
              <Text>SHIBAS</Text>
            </View>
          </View>
        </SafeAreaView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    //   backgroundColor: '#a92a35',
    padding: 5,
  },

  statusTrue: {
    backgroundColor: 'green',
    height: 100,
  },
  statusFalse: {
    backgroundColor: 'red',
    height: 100,
  },
});
