import React from 'react';
import {SafeAreaView, StatusBar} from 'react-native';

import MovesenseBT from './components/MovesenseBT';

const App: () => React$Node = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <MovesenseBT />
      </SafeAreaView>
    </>
  );
};

export default App;
