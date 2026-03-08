import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, ImageBackground, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/tmdb';
import { supabase } from '../../lib/supabase';

export default function MovieDetailScreen({ route, navigation }: any) {
  const { movie } = route.params;
  const [cast, setCast] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [movieDetails, setMovieDetails] = useState<any | null>(null);
  const [director, setDirector] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [watchedModalVisible, setWatchedModalVisible] = useState(false);
  const [watchedDate, setWatchedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rating, setRating] = useState<number>(0); // 0..5, allow .5
  const [commentText, setCommentText] = useState<string>('');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [watchedRecord, setWatchedRecord] = useState<any | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        if (!movie) {
          Alert.alert('erro', 'Dados do filme indisponíveis.');
          setLoading(false);
          return;
        }

        const idForApi = movie.tmdb_id || movie.tmdbId || movie.id || movie.movie?.id || null;
        if (!idForApi) {
          Alert.alert('erro', 'ID do filme inválido para carregar detalhes.');
          setLoading(false);
          return;
        }

        let type = movie.title ? 'movie' : 'tv';
        try {
          // buscar detalhes principais (overview, backdrop) primeiro
          try {
            const detailsRes = await api.get(`/${type}/${idForApi}`);
            setMovieDetails(detailsRes.data || null);
          } catch (dErr: any) {
            // se 404 no details, tentamos o oposto mais abaixo
            const dStatus = dErr?.response?.status;
            if (dStatus !== 404) console.error('erro ao buscar detalhes principais:', dErr);
          }

          const [creditsRes, watchRes] = await Promise.all([
            api.get(`/${type}/${idForApi}/credits`),
            api.get(`/${type}/${idForApi}/watch/providers`)
          ]);

          setCast(creditsRes.data.cast.slice(0, 10));
          setProviders(watchRes.data.results?.BR?.flatrate || []);
          // extrair diretor dos créditos
          try {
            const crew = creditsRes.data.crew || [];
            const dir = crew.find((p: any) => (p.job || '').toLowerCase() === 'director' || (p.job || '') === 'diretor');
            setDirector(dir ? dir.name : null);
          } catch (e) {
            setDirector(null);
          }
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 404) {
            const altType = type === 'movie' ? 'tv' : 'movie';
            try {
              // tentar buscar detalhes como TV se falhar como movie
              const detailsRes2 = await api.get(`/${altType}/${idForApi}`);
              setMovieDetails(detailsRes2.data || null);

              const [creditsRes, watchRes] = await Promise.all([
                api.get(`/${altType}/${idForApi}/credits`),
                api.get(`/${altType}/${idForApi}/watch/providers`)
              ]);
              type = altType;
              setCast(creditsRes.data.cast.slice(0, 10));
              setProviders(watchRes.data.results?.BR?.flatrate || []);
              try {
                const crew = creditsRes.data.crew || [];
                const dir = crew.find((p: any) => (p.job || '').toLowerCase() === 'director' || (p.job || '') === 'diretor');
                setDirector(dir ? dir.name : null);
              } catch (e) {
                setDirector(null);
              }
            } catch (err2: any) {
              console.error('erro ao carregar detalhes (fallback também falhou):', err2);
              Alert.alert('erro', 'Não foi possível carregar os detalhes do filme.');
            }
          } else {
            console.error('erro ao carregar detalhes:', err);
            Alert.alert('erro', 'Não foi possível carregar os detalhes do filme.');
          }
        }
      } catch (error) {
        console.error("erro ao carregar detalhes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [movie]);

  const releaseYear = (() => {
    const dateStr = movieDetails?.release_date || movieDetails?.first_air_date || movie.release_date || movie.first_air_date || '';
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  })();

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
      Alert.alert("erro", "Não carregou as listas: " + error.message);
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
      Alert.alert("erro", error.message);
    } finally {
      setSaving(false);
    }
  };

  const idForApi = movie?.tmdb_id || movie?.tmdbId || movie?.id || movie?.movie?.id || null;

  useEffect(() => {
    async function checkIfWatched() {
      if (!idForApi) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsWatched(false);
          setWatchedRecord(null);
          return;
        }

        // first check 'watched_movies' table
        let { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .eq('tmdb_id', idForApi)
          .limit(1);

        if (error) {
          console.error('erro ao checar watched_movies:', error);
        }

        if (data && data.length > 0) {
          setIsWatched(true);
          setWatchedRecord(data[0]);
          return;
        }

        // fallback: check 'reviews' table if you use that schema
        ({ data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .eq('tmdb_id', idForApi)
          .limit(1));

        if (error) console.error('erro ao checar reviews:', error);

        if (data && data.length > 0) {
          setIsWatched(true);
          setWatchedRecord(data[0]);
          return;
        }

        setIsWatched(false);
        setWatchedRecord(null);
      } catch (e) {
        console.error('erro ao verificar se já assistido:', e);
      }
    }
    checkIfWatched();
  }, [idForApi]);

  const handleStarTouch = (x: number) => {
    if (!containerWidth) return;
    const ratio = Math.max(0, Math.min(1, x / containerWidth));
    // map to 0..5 with 0.5 increments
    const raw = ratio * 5;
    const halfSteps = Math.round(raw * 2) / 2;
    setRating(halfSteps);
  };

  

  const handleSaveWatched = async () => {
    if (!idForApi) return Alert.alert('erro', 'ID do filme inválido');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const savedRating = Math.round((rating || 0) * 2); // integer as requested

      const payload = {
        user_id: user.id,
        tmdb_id: idForApi,
        media_type: movie?.title ? 'movie' : 'tv',
        rating: savedRating > 0 ? savedRating : null,
        comment: commentText || null,
        created_at: watchedDate.toISOString()
      };

      // Ajuste o nome da tabela se necessário
      const { error } = await supabase.from('reviews').insert([payload]);
      if (error) throw error;
      Alert.alert('Sucesso', 'Registro salvo em Filmes Assistidos');
      setWatchedModalVisible(false);
    } catch (err: any) {
      console.error('erro ao salvar assistido:', err);
      Alert.alert('erro', err.message || 'Falha ao salvar');
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

      <ImageBackground source={{ uri: `https://image.tmdb.org/t/p/original${movieDetails?.backdrop_path || movie.backdrop_path || ''}` }} style={styles.backdrop}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </TouchableOpacity>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)', '#000']} style={styles.gradient} />
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.textDetails}>
            <Text style={styles.title}>{movieDetails?.title || movieDetails?.name || movie.title || movie.name}</Text>
            <View style={styles.directorRow}>
              <Text style={styles.directorText}>{director || 'Diretor desconhecido'}</Text>
              {releaseYear && <Text style={styles.yearText}> • {releaseYear}</Text>}
            </View>

            <View style={styles.ratingContainer}>
              <Image source={{ uri: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.png' }} style={styles.tmdbIcon} resizeMode="contain" />
              <Text style={styles.ratingText}>{(movieDetails?.vote_average ?? movie.vote_average)?.toFixed?.(1) ?? '—'}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.circleBtn} onPress={fetchUserLists}>
                  <Ionicons name="list" size={22} color="black" />
               </TouchableOpacity>
              <TouchableOpacity
                style={[styles.circleBtn, isWatched && styles.circleBtnWatched]}
                onPress={() => { setWatchedModalVisible(true); setShowDatePicker(true); }}
              >
                <Ionicons name="checkmark" size={24} color={isWatched ? '#fff' : 'black'} />
              </TouchableOpacity>
               <Ionicons name="eye-outline" size={24} color="#888" />
            </View>
          </View>
          <Image source={{ uri: `https://image.tmdb.org/t/p/w300${movieDetails?.poster_path || movie.poster_path}` }} style={styles.smallPoster} />
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
        <Text style={styles.overview}>{movieDetails?.overview || movie.overview || "Sem sinopse."}</Text>

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
      
      {/* Modal para marcar como assistido */}
      <Modal animationType="slide" transparent visible={watchedModalVisible} onRequestClose={() => setWatchedModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalContent, { minHeight: 360 }]}>
            <Text style={styles.modalTitle}>Marcar como assistido</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image source={{ uri: `https://image.tmdb.org/t/p/w200${movieDetails?.poster_path || movie.poster_path || ''}` }} style={{ width: 64, height: 96, borderRadius: 6 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 6 }}>{movieDetails?.title || movie.title || movie.name}</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(v => !v)} style={{ paddingVertical: 6 }}>
                  <Text style={{ color: '#ccc' }}>Data: {watchedDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 20 }} />

            <Text style={{ color: '#888', marginBottom: 8 }}>Avalie</Text>
            <View
              style={styles.starWrapper}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => handleStarTouch(e.nativeEvent.locationX)}
              onResponderMove={(e) => handleStarTouch(e.nativeEvent.locationX)}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const idx = i + 1;
                const icon = rating >= idx ? 'star' : rating >= idx - 0.5 ? 'star-half-full' : 'star-outline';
                return (
                  <MaterialCommunityIcons key={i} name={icon as any} size={40} color="#008cff" style={{ marginHorizontal: 6 }} />
                );
              })}
            </View>

            <View style={{ height: 12 }} />
            <View style={{ backgroundColor: '#111', borderRadius: 8, padding: 8 }}>
              <TextInput
                placeholder="Escreva algo sobre..."
                placeholderTextColor="#666"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                style={{ color: '#fff', minHeight: 80 }}
              />
            </View>

            {showDatePicker && (
              <View style={{ marginTop: 8 }}>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={watchedDate}
                    mode="date"
                    display="spinner"
                    onChange={(_e: any, d?: Date) => { if (d) setWatchedDate(d); }}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <DateTimePicker
                    value={watchedDate}
                    mode="date"
                    display="default"
                    onChange={(_e: any, d?: Date) => { setShowDatePicker(false); if (d) setWatchedDate(d); }}
                  />
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => setWatchedModalVisible(false)}>
                <Text style={{ color: '#888' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { flex: 1, marginLeft: 10 }]} onPress={handleSaveWatched} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.confirmBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    directorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    directorText: { color: '#ccc', fontSize: 14 },
    yearText: { color: '#888', fontSize: 13, marginLeft: 6 },
  tmdbIcon: { width: 30, height: 15, marginRight: 8 },
  ratingText: { color: '#90cea1', fontSize: 18, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  circleBtnWatched: { backgroundColor: '#4CAF50' },
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
  ,
  starWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 8 }
});