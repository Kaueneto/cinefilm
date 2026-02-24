import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, ImageBackground, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/tmdb';
import { supabase } from '../../lib/supabase';

export default function MovieDetailScreen({ route, navigation }: any) {
  const { movie } = route.params;
  const [cast, setCast] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const type = movie.title ? 'movie' : 'tv';
        const [creditsRes, watchRes] = await Promise.all([
          api.get(`/${type}/${movie.id}/credits`),
          api.get(`/${type}/${movie.id}/watch/providers`)
        ]);
        
        setCast(creditsRes.data.cast.slice(0, 10));
        setProviders(watchRes.data.results?.BR?.flatrate || []);
      } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [movie.id]);

  const fetchUserLists = async () => {
    setLoadingLists(true);
    setModalVisible(true);
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setUserLists(data || []);
    } catch (error: any) {
      Alert.alert("Erro", "Não carregou as listas: " + error.message);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!selectedList) return Alert.alert("Aviso", "Selecione uma lista");

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('list_items')
        .insert([{ 
          list_id: selectedList, 
          tmdb_id: movie.id,
          added_by: user.id, 
          title: movie.title || movie.name,
          poster_path: movie.poster_path,
        }]);

      if (error) throw error;
      Alert.alert("Sucesso!", "Adicionado à lista com sucesso!");
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolha uma Lista</Text>
            {loadingLists ? <ActivityIndicator color="#fff" /> : (
              <FlatList
                data={userLists}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.listItem, selectedList === item.id && styles.listItemSelected]}
                    onPress={() => setSelectedList(item.id)}
                  >
                    <Text style={styles.listItemText}>{item.name}</Text>
                    {selectedList === item.id && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                  </TouchableOpacity>
                )}
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{color: '#888'}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.confirmBtnText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ImageBackground source={{ uri: `https://image.tmdb.org/t/p/original${movie.backdrop_path}` }} style={styles.backdrop}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </TouchableOpacity>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)', '#000']} style={styles.gradient} />
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.textDetails}>
            <Text style={styles.title}>{movie.title || movie.name}</Text>
            <View style={styles.ratingContainer}>
              <Image source={{ uri: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.png' }} style={styles.tmdbIcon} resizeMode="contain" />
              <Text style={styles.ratingText}>{movie.vote_average?.toFixed(1)}</Text>
            </View>
            <View style={styles.actionButtons}>
               <TouchableOpacity style={styles.circleBtn} onPress={fetchUserLists}>
                  <Ionicons name="list" size={22} color="black" />
               </TouchableOpacity>
               <TouchableOpacity style={styles.circleBtn}>
                  <Ionicons name="checkmark" size={24} color="black" />
               </TouchableOpacity>
               <Ionicons name="eye-outline" size={24} color="#888" />
            </View>
          </View>
          <Image source={{ uri: `https://image.tmdb.org/t/p/w300${movie.poster_path}` }} style={styles.smallPoster} />
        </View>

        <View style={styles.divider} />
        
        {/* ONDE ASSISTIR */}
        <Text style={styles.sectionTitle}>Onde Assistir</Text>
        <View style={{ flexDirection: 'row', gap: 15, marginTop: 10 }}>
          {providers.map((p: any) => (
            <View key={p.provider_id} style={{ alignItems: 'center', width: 50 }}>
              <Image source={{ uri: `https://image.tmdb.org/t/p/original${p.logo_path}` }} style={{ width: 40, height: 40, borderRadius: 8 }} />
              <Text style={styles.providerName} numberOfLines={1}>{p.provider_name}</Text>
            </View>
          ))}
          {providers.length === 0 && <Text style={{ color: '#555' }}>Não disponível em streamings.</Text>}
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Sinopse</Text>
        <Text style={styles.overview}>{movie.overview || "Sem sinopse."}</Text>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Elenco</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={cast}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.castCard}>
              <ImageBackground 
                source={{ uri: item.profile_path ? `https://image.tmdb.org/t/p/w200${item.profile_path}` : 'https://via.placeholder.com/200' }} 
                style={styles.castImage} 
                imageStyle={{ borderRadius: 10 }}
              >
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.castGradient}>
                  <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.characterName} numberOfLines={1}>{item.character || 'N/A'}</Text>
                </LinearGradient>
              </ImageBackground>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backdrop: { width: '100%', height: 450 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
  gradient: { flex: 1 },
  content: { paddingHorizontal: 20, marginTop: -60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  textDetails: { flex: 1 },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  tmdbIcon: { width: 30, height: 15, marginRight: 8 },
  ratingText: { color: '#90cea1', fontSize: 18, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  smallPoster: { width: 100, height: 150, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 20 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  overview: { color: '#bbb', lineHeight: 22, fontSize: 15 },
  providerName: { color: '#888', fontSize: 10, marginTop: 4, textAlign: 'center' },
  castCard: { marginRight: 12, width: 100, height: 140 },
  castImage: { flex: 1, borderRadius: 10, backgroundColor: '#1a1a1a' },
  castGradient: { flex: 1, justifyContent: 'flex-end', padding: 8 },
  castName: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  characterName: { color: '#888', fontSize: 9, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: 400 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#222', borderRadius: 10, marginBottom: 10 },
  listItemSelected: { backgroundColor: '#467084' },
  listItemText: { color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  confirmBtn: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#000', fontWeight: 'bold' }
});