import Report from './components/report/Report';
import FleetRequest from './components/FleetRequest/FleetRequest';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

const Tab = createBottomTabNavigator();
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Report" component={Report} />
        <Tab.Screen name="Fleet Request" component={FleetRequest} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

