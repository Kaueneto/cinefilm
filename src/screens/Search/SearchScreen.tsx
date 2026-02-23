import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/tmdb';

type FilterType = 'all' | 'movie' | 'tv';

// 1. ADICIONADO: Recebendo a prop { navigation }
export default function SearchScreen({ navigation }: any) { 
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]); // Limpa se apagar o texto
      return;
    }

    setLoading(true);
    try {
      const endpoint = filter === 'all' ? '/search/multi' : `/search/${filter}`;
      const response = await api.get(endpoint, {
        params: { query: text }
      });
      setResults(response.data.results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Pesquisar</Text>

      <View style={styles.searchBar}>
        <TextInput 
          style={styles.input}
          placeholder="Busque por filmes ou séries"
          underlineColorAndroid="transparent"
          placeholderTextColor="#888"
          value={query}
          onChangeText={handleSearch}
        />
        <Ionicons name="search" size={20} color="#888" />
      </View>

      <View style={styles.filterContainer}>
        {['all', 'movie', 'tv'].map((type) => (
          <TouchableOpacity 
            key={type}
            style={[styles.filterBtn, filter === type && styles.filterBtnActive]}
            onPress={() => setFilter(type as FilterType)}
          >
            <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
              {type === 'all' ? 'Todos' : type === 'movie' ? 'Filmes' : 'Séries'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={results}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={({ item }) => (
            // 2. CORRIGIDO: Adicionado o onPress para navegar
            <TouchableOpacity 
              style={styles.movieCard}
              onPress={() => navigation.navigate('MovieDetail', { movie: item })}
            >
              <Image 
                source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }} 
                style={styles.poster}
              />
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle}>{item.title || item.name}</Text>
                <Text style={styles.movieYear}>
                  {(item.release_date || item.first_air_date || '').split('-')[0]}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', 
    backgroundColor: '#1a1a1a', 
    borderRadius: 10, 
    paddingHorizontal: 15, 
    alignItems: 'center',
    height: 50,
    marginBottom: 20
  },
  input: { flex: 1, color: '#fff' },
  filterContainer: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  filterBtn: { 
    paddingVertical: 8, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#333' 
  },
  filterBtnActive: { backgroundColor: '#467084', borderColor: '#467084' },
  filterText: { color: '#888', fontWeight: 'bold' },
  filterTextActive: { color: '#fff' },
  movieCard: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
  poster: { width: 80, height: 110, borderRadius: 8, backgroundColor: '#333' },
  movieInfo: { marginLeft: 15 },
  movieTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  movieYear: { color: '#888', fontSize: 14, marginTop: 5 }
});