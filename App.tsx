import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // import do BlurView
import { StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';

// telas
import AuthScreen from './src/screens/Auth/AuthScreen';
import HomeScreen from './src/screens/Home/HomeScreen';
import SearchScreen from './src/screens/Search/SearchScreen';
import MovieDetailScreen from './src/screens/MovieDetail/MovieDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabRoutes() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
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
        // estilizacao efeito glass
        tabBarStyle: { 
          position: 'absolute',
          backgroundColor: 'transparent', 
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        // componente de fundo que cria o desfoque
        tabBarBackground: () => (
          <BlurView 
            tint="dark" // Pode ser 'light', 'dark' ou 'default'
            intensity={50} //nivel de desfoque
            style={StyleSheet.absoluteFill} 
          />
        ),
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#aaa',
      })}
    >
      <Tab.Screen name="Minhas listas" component={HomeScreen} />
      <Tab.Screen name="Sorteios" component={HomeScreen} /> 
      <Tab.Screen name="Pesquisar" component={SearchScreen} />
      <Tab.Screen name="Meu Perfil" component={HomeScreen} />
    </Tab.Navigator>
  );
}

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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabRoutes} />
        <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}