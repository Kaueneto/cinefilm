import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // Importe o Stack
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './src/lib/supabase';

// telas
import AuthScreen from './src/screens/Auth/AuthScreen';
import HomeScreen from './src/screens/Home/HomeScreen';
import SearchScreen from './src/screens/Search/SearchScreen';
import MovieDetailScreen from './src/screens/MovieDetail/MovieDetailScreen';

// Definição dos Navegadores
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

//criamso componentes para abas inferiores
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
      <Tab.Screen name="Pesquisar" component={SearchScreen} />
      <Tab.Screen name="Meu Perfil" component={HomeScreen} />
    </Tab.Navigator>
  );
}

//o componente principal usa o stack para gerenciar as tabs e o detalhe
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
        {/* a tela principal contém o menu de abas */}
        <Stack.Screen name="Main" component={TabRoutes} />
        
        {/* a tela de detalhe fica no stack para cobrir o menu inferior */}
        <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}