import React, { useState, useEffect } from 'react';
import { Button, View } from 'react-native';
import Report from './components/report/Report';
import FleetRequest from './components/FleetRequest/FleetRequest';
import AuthScreen from './components/auth/AuthScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { auth } from './utilis/Firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      {user ? (
        <Tab.Navigator>
          <Tab.Screen name="Report" component={Report} />
          <Tab.Screen name="Fleet Request" component={FleetRequest} />
          <Tab.Screen 
            name="Logout" 
            component={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Button title="Logout" onPress={() => signOut(auth)} />
              </View>
            )} 
          />
        </Tab.Navigator>
      ) : (
        <AuthScreen />
      )}
    </NavigationContainer>
  );
}