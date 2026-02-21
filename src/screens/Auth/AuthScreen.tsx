import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSuccess, setIsSuccess] = useState(false); // estado para a animação de sucesso
  const [loading, setLoading] = useState(false); 

  async function handleAuth() {
    setLoading(true);
    if (activeTab === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: username } }
      });

      if (error) {
        Alert.alert("Erro", error.message);
      } else {

        setIsSuccess(true); 
        
   
        setEmail('');
        setPassword('');
        setUsername('');

        // espera 2.5 segundos mostrando o check verde e volta p o login

        setTimeout(() => {
          setIsSuccess(false);
          setActiveTab('login');
        }, 2500);
      }
    } else {

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert("Erro", error.message);
      else Alert.alert("Logado", "Bem-vindo ao CineFilm!");
    }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>CineFilm</Text>

      {isSuccess ? (
        // exibe animacao em caso de sucesso
        <View style={styles.successContainer}>
          <View style={styles.circle}>
            <Text style={styles.check}>✓</Text>
          </View>
          <Text style={styles.successText}>Cadastrado com sucesso!</Text>
        </View>
      ) : (
        // exibe o formulario normal 
        <View style={styles.authBox}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'login' && styles.activeTab]} 
              onPress={() => setActiveTab('login')}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'signup' && styles.activeTab]} 
              onPress={() => setActiveTab('signup')}
            >
              <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {activeTab === 'signup' && (
              <>
                <Text style={styles.label}>Nome de usuário</Text>
                <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Nome" placeholderTextColor="#555" />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

            <Text style={styles.label}>Senha</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

            <TouchableOpacity style={styles.mainButton} onPress={handleAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mainButtonText}>
                  {activeTab === 'login' ? "Login" : "Cadastre-se"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000', alignItems: 'center', paddingTop: 60 },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
  authBox: { width: '90%', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#222', borderRadius: 8, marginBottom: 25, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#ccc' },
  tabText: { color: '#888', fontWeight: 'bold' },
  activeTabText: { color: '#000' },
  form: { width: '100%' },
  label: { color: '#fff', marginBottom: 8, fontSize: 14, fontWeight: '500' },
  input: { backgroundColor: '#000', borderWidth: 1, borderColor: '#333', borderRadius: 8, color: '#fff', padding: 12, marginBottom: 20 },
  mainButton: { backgroundColor: '#0095ff', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10, minHeight: 55, justifyContent: 'center' },
  mainButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  // estilos da animacao
  successContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#00C851', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  check: { color: '#fff', fontSize: 50, fontWeight: 'bold' },
  successText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});