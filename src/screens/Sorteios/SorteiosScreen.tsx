
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function SorteiosScreen({ navigation }: any) {
  // 'list' para exibir seleção de lista, false para tela normal
  const [screenState, setScreenState] = useState<false | 'list'>(false);
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);

  // Busca listas do usuário autenticado
  const fetchLists = async (userId: string) => {
    console.log('Buscando listas para usuário:', userId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*, list_items (id, poster_path, title)')
        .eq('owner_id', userId);
      
      if (error) {
        console.error('Erro ao buscar listas:', error);
        setLists([]);
      } else {
        console.log('Listas encontradas:', data);
        setLists(data || []);
      }
    } catch (err) {
      console.error('Erro na busca:', err);
      setLists([]);
    }
    setLoading(false);
  };

  // Sorteio de lista
  const handleListDraw = (list: any) => {
    if (list.list_items && list.list_items.length > 0) {
      navigation.navigate('Roulette', { movies: list.list_items });
    }
  };

  // Busca usuário autenticado e listas ao montar
  React.useEffect(() => {
    const getUserAndLists = async () => {
      setUserLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        await fetchLists(user.id);
      } else {
        setLists([]);
      }
      setUserLoading(false);
    };
    getUserAndLists();
  }, []);

  // Chama fetchLists ao abrir seleção de lista
  const openListSelection = async () => {
    console.log('Abrindo seleção de lista...');
    setScreenState('list');
    setLoading(true);
    
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Erro de autenticação:', authError);
        setLists([]);
        setLoading(false);
        return;
      }
      
      const user = userData?.user;
      if (user) {
        console.log('Usuário autenticado:', user.id);
        await fetchLists(user.id);
      } else {
        console.log('Usuário não autenticado');
        setLists([]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao obter usuário:', err);
      setLists([]);
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (screenState === 'list') {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity
            onPress={() => setScreenState(false)}
            style={{ padding: 10, borderRadius: 20, backgroundColor: 'rgba(30,30,30,0.7)', marginLeft: 8, marginRight: 8 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.header, { flex: 1, marginBottom: 0 }]}>CineFilm</Text>
        </View>
        <Text style={styles.rouletteTitle}>Escolha uma lista</Text>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : lists.length > 0 ? (
          <FlatList
            data={lists}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 10 }}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.listCardNew, (item.list_items?.length || 0) === 0 && styles.listCardDisabled, { flex: 1 }]}
                  onPress={() => {
                    if ((item.list_items?.length || 0) > 0) {
                      handleListDraw(item);
                    }
                  }}
                  disabled={(item.list_items?.length || 0) === 0}
                  activeOpacity={0.8}
                >
                  <View style={styles.listInfoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitleNew}>{item.name}</Text>
                      <Text style={styles.listCountNew}>{item.list_items?.length || 0} filmes</Text>
                    </View>
                    <View style={styles.posterRow}>
                      {(item.list_items || []).slice(0, 5).map((movie: any, idx: number) => (
                        <View key={idx} style={styles.posterThumbWrapper}>
                          {movie.poster_path ? (
                            <Image
                              source={{ uri: `https://image.tmdb.org/t/p/w92${movie.poster_path}` }}
                              style={styles.posterThumb}
                            />
                          ) : (
                            <View style={styles.posterThumbPlaceholder} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginLeft: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(40,40,40,0.7)' }}
                  onPress={() => navigation.navigate('DetailList', { list: item })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={22} color="#FFD700" />
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Ionicons name="list-outline" size={48} color="#666" style={{ marginBottom: 15 }} />
            <Text style={styles.emptyText}>Você ainda não tem listas</Text>
            <Text style={styles.emptySubtext}>Crie uma lista na aba "Minhas listas"</Text>
          </View>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={() => setScreenState(false)}>
          <Text style={styles.closeBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CineFilm</Text>
      <View style={styles.buttonArea}>
        <TouchableOpacity 
          style={styles.bigButton} 
          onPress={() => {
            // Filmes de exemplo para sorteio personalizado
            const sampleMovies = [
              { id: 1, title: "Filme Aleatório 1", poster_path: "/example1.jpg" },
              { id: 2, title: "Filme Aleatório 2", poster_path: "/example2.jpg" },
              { id: 3, title: "Filme Aleatório 3", poster_path: "/example3.jpg" },
            ];
            navigation.navigate('Roulette', { movies: sampleMovies });
          }}
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.bigButtonText}>Sorteio personalizado</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bigButton} onPress={openListSelection}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.bigButtonText}>Sortear da minha lista</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 60 },
  header: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  subHeader: { color: '#aaa', fontSize: 16, fontWeight: 'bold', marginLeft: 20, marginBottom: 10 },
  buttonArea: { marginTop: 30, marginBottom: 30, alignItems: 'center', gap: 20 },
  bigButton: {
    width: '90%',
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(70,112,132,0.5)',
    marginBottom: 15,
    position: 'relative',
  },
  bigButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 17, zIndex: 1, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  listModal: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, width: 320, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  rouletteTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  listCardNew: {
    width: '100%',
    minHeight: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(60,60,60,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.25)',
    marginBottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  listInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  listTitleNew: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 2,
  },
  listCountNew: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 0,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 3,
  },
  posterThumbWrapper: {
    width: 28,
    height: 40,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#222',
    marginLeft: -6,
    borderWidth: 1,
    borderColor: '#222',
  },
  posterThumb: {
    width: 28,
    height: 40,
    resizeMode: 'cover',
    borderRadius: 5,
  },
  posterThumbPlaceholder: {
    width: 28,
    height: 40,
    backgroundColor: '#444',
    borderRadius: 5,
  },
  listCardDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(100,100,100,0.3)',
  },
  listTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15, zIndex: 1 },
  listCount: { color: '#aaa', fontSize: 12, zIndex: 1 },
  emptyListText: { color: '#f66', fontSize: 10, zIndex: 1, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { marginTop: 20, backgroundColor: '#467084', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtext: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 5 },
});
