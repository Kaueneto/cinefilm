import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, ImageBackground, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/tmdb';

export default function MovieDetailScreen({ route, navigation }: any) {
  const { movie } = route.params;
  const [cast, setCast] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      try {
        // busca Elenco (Credits)
        const type = movie.title ? 'movie' : 'tv';
        const creditsRes = await api.get(`/${type}/${movie.id}/credits`);
        setCast(creditsRes.data.cast.slice(0, 10));

        // busca onde assitir (Watch Providers)
        const watchRes = await api.get(`/${type}/${movie.id}/watch/providers`);
        const brProviders = watchRes.data.results?.BR?.flatrate || [];
        setProviders(brProviders);
      } catch (error) {
        console.error("Erro ao carregar detalhes extras:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [movie.id]);

  return (
    <ScrollView style={styles.container} bounces={false}>
      {/* Botão Voltar */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={30} color="#fff" />
      </TouchableOpacity>

      <ImageBackground 
        source={{ uri: `https://image.tmdb.org/t/p/original${movie.backdrop_path}` }} 
        style={styles.backdrop}
      >
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)', '#000']} style={styles.gradient} />
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.textDetails}>
            <Text style={styles.title}>{movie.title || movie.name}</Text>
            
            {/* Ano e Avaliação com ícone TMDB ver depois pq o icone nao carrega */}
            <Text style={styles.infoText}>
              { (movie.release_date || movie.first_air_date)?.split('-')[0] }
            </Text>
            
            <View style={styles.ratingContainer}>
            <Image 
              source={{ uri: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.png' }} 
              style={styles.tmdbIcon}
              resizeMode="contain"
            />
            <Text style={styles.ratingText}>
              {movie.vote_average.toFixed(1)}
            </Text>
          </View>
            
            <View style={styles.actionButtons}>
               <TouchableOpacity style={styles.circleBtn}>
                  <Ionicons name="checkmark" size={24} color="black" />
               </TouchableOpacity>
               <Text style={styles.statusText}>Não Assistido</Text>
               <Ionicons name="eye-outline" size={24} color="#888" />
            </View>
          </View>

          <Image 
            source={{ uri: `https://image.tmdb.org/t/p/w300${movie.poster_path}` }} 
            style={styles.smallPoster} 
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Sinopse</Text>
        <Text style={styles.overview}>{movie.overview || "Sinopse não disponível."}</Text>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Elenco</Text>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={cast}
            keyExtractor={(item: any) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.castCard}>
                <ImageBackground 
                  source={{ uri: item.profile_path ? `https://image.tmdb.org/t/p/w200${item.profile_path}` : 'https://via.placeholder.com/100x140' }} 
                  style={styles.castImage}
                  imageStyle={{ borderRadius: 10 }}
                >
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.castGradient}>
                    <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.charName} numberOfLines={1}>{item.character}</Text>
                  </LinearGradient>
                </ImageBackground>
              </View>
            )}
          />
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Onde assistir</Text>
        <View style={styles.streamingRow}>
           {providers.length > 0 ? providers.map((p: any) => (
             <Image 
               key={p.provider_id}
               source={{ uri: `https://image.tmdb.org/t/p/original${p.logo_path}` }} 
               style={styles.streamLogo} 
             />
           )) : <Text style={{color: '#555'}}>Não disponível em streamings no BR</Text>}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
  backdrop: { width: '100%', height: 450 },
  gradient: { flex: 1 },
  content: { paddingHorizontal: 20, marginTop: -60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  textDetails: { flex: 1, marginRight: 10 },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  infoText: { color: '#ccc', fontSize: 16, marginTop: 5 },
    
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 5, // espaço em cima e embaixo
      minHeight: 20,     // garante q a View tenha altura
    },
    tmdbIcon: {
      width: 30,  
      height: 15,
      marginRight: 8,
      backgroundColor: 'transparent', // garante q nao tenha fundo bloqueando
    },
    ratingText: {
      color: '#90cea1', 
      fontSize: 18,
      fontWeight: 'bold',
    },
  actionButtons: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  circleBtn: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  statusText: { color: '#fff', marginRight: 10, fontSize: 14 },
  smallPoster: { width: 100, height: 150, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 20 },
  sectionTitle: { color: '#888', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
  overview: { color: '#bbb', lineHeight: 22, fontSize: 15 },
  castCard: { marginRight: 12, width: 100, height: 140 },
  castImage: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 10 },
  castGradient: { flex: 1, justifyContent: 'flex-end', padding: 8, borderRadius: 10 },
  castName: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  charName: { color: '#aaa', fontSize: 10 },
  streamingRow: { flexDirection: 'row', gap: 12, marginBottom: 50, flexWrap: 'wrap' },
  streamLogo: { width: 45, height: 45, borderRadius: 10 }
});