import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import { TracelyProvider } from './src/context/TracelyContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function RootLayout() {
  return (
    <TracelyProvider>
      <AppNavigator />
    </TracelyProvider>
  );
}

registerRootComponent(RootLayout);
