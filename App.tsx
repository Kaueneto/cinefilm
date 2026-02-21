import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';  //biblioteca de icons
import { supabase } from './src/lib/supabase';

import AuthScreen from './src/screens/Auth/AuthScreen';
import HomeScreen from './src/screens/Home/HomeScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator 
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;


            //escolhendo os icons pra cada rota
            if (route.name === 'Minhas listas') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'Sorteios') {
              iconName = focused ? 'dice' : 'dice-outline';
            } else if (route.name === 'Pesquisar') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Meu Perfil') {
              iconName = focused ? 'person' : 'person-outline';
            }

 
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          headerShown: false,
          tabBarStyle: { 
            backgroundColor: '#000', 
            borderTopColor: '#333',
            height: 80,
            paddingBottom: 20,
            paddingTop: 10
          },
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#555',
        })}
      >
        <Tab.Screen name="Minhas listas" component={HomeScreen} />
        <Tab.Screen name="Sorteios" component={HomeScreen} /> 
        <Tab.Screen name="Pesquisar" component={HomeScreen} />
        <Tab.Screen name="Meu Perfil" component={HomeScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}