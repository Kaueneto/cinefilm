import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function MyListsScreen({ navigation }: any) {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');


  // Função de busca das listas
  const fetchLists = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lists')
        .select(`
          *,
          list_items (*)
        `);

      if (error) throw error;
      setLists(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar listas (consulta detalhada):', err);
      // fallback para a consulta simples, caso o select com campos específicos falhe
      try {
        const { data, error } = await supabase
          .from('lists')
          .select(`
            *,
            list_items (poster_path)
          `);
        if (error) throw error;
        setLists(data || []);
      } catch (err2: any) {
        console.error('Fallback também falhou ao buscar listas:', err2);
        setLists([]);
      }
    } finally {
      setLoading(false);
    }
  };


  // Estado para controle do refresh
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  // Função chamada ao puxar para baixo
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLists();
    setRefreshing(false);
  };


  const handleCreateList = () => {
    setNewListName('');
    setShowCreateModal(true);
  };
  

  const handleSaveNewList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome para a lista.');
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    const { data, error } = await supabase
      .from('lists')
      .insert({
        name: newListName.trim(),
        owner_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      Alert.alert('Erro', 'Não foi possível criar a lista.');
      console.error(error);
    } else if (data) {
      setLists([...lists, { ...data, list_items: [] }]);
      setShowCreateModal(false);
      setNewListName('');
    }
  };

  const toggleSelection = (id: string) => {
    if (selectedLists.includes(id)) {
      setSelectedLists(selectedLists.filter(item => item !== id));
    } else {
      setSelectedLists([...selectedLists, id]);
    }
  };


  const handleDeleteLists = async () => {
    Alert.alert(
      "Excluir",
      `Deseja excluir as ${selectedLists.length} listas selecionadas?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.from('lists').delete().in('id', selectedLists);
            if (!error) {
              setLists(lists.filter(l => !selectedLists.includes(l.id)));
              setIsSelectionMode(false);
              setSelectedLists([]);
            }
          } 
        }
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{flex:1, backgroundColor:'#000'}} color="#fff" />;

  return (
    <View style={styles.container}>
      {/* HEADER COM BOTÃO DE EXCLUIR E ADICIONAR */}
      <View style={styles.headerRow}>

        <TouchableOpacity
          onPress={() => {
   
            setIsSelectionMode((s) => {
              if (s) setSelectedLists([]);
              return !s;
            });
          }}
          activeOpacity={0.90}
          style={[styles.selectButton, isSelectionMode && styles.selectButtonActive]}
        >
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={[styles.selectButtonText, isSelectionMode && styles.selectButtonTextActive]}>
            {isSelectionMode ? 'Cancelar' : 'Selecionar'}
          </Text>
        </TouchableOpacity>

        {isSelectionMode ? (
          <TouchableOpacity
            onPress={() => {
              if (selectedLists.length > 0) handleDeleteLists();
            }}
            activeOpacity={0.9}
            style={[styles.deleteButton, selectedLists.length === 0 && styles.deleteButtonDisabled]}
            disabled={selectedLists.length === 0}
          >
            <Ionicons name="trash" size={20} color={selectedLists.length > 0 ? '#fff' : '#666'} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleCreateList}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={lists}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={1.5}
            onPress={() => {
              if (isSelectionMode) {
                toggleSelection(item.id);
              } else {
                navigation.navigate('DetailList', { list: item });
              }
            }}
            style={[
              styles.listCard,
              selectedLists.includes(item.id) && styles.listCardSelected,
              { opacity: isSelectionMode ? (selectedLists.includes(item.id) ? 1 : 0.3) : 1 }
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.listHeader}>
                <View>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listSubtitle}>{item.list_items?.length || 0} Filmes</Text>
                </View>
              </View>

              <View style={styles.posterRow}>
                {(() => {
                  const all = item.list_items || [];
                  const visible = all.slice(0, 8);
                  return (
                    <>
                      {visible.map((film: any, idx: number) => (
                        <Image
                          key={idx}
                          source={{ uri: `https://image.tmdb.org/t/p/w200${film.poster_path}` }}
                          style={[styles.miniPoster, { zIndex: idx, marginLeft: idx === 0 ? 0 : -25 }]}
                        />
                      ))}
                      {all.length === 0 && (
                        <Text style={styles.emptyText}>Lista vazia</Text>
                      )}
                    </>
                  );
                })()}
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Lista</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome da lista"
              placeholderTextColor="#666"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveNewList}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1f1f1f', paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  header: { color: '#a30000', fontSize: 20, fontWeight: 'bold',  },

  selectButton: {
    minWidth: 90,
    height: 30,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(70,112,132,0.5)',
    backgroundColor: 'rgba(30,30,30,0.3)',
    marginRight: 0,
    position: 'relative',
  },
  selectButtonActive: {
    borderColor: '#c0392b',
    backgroundColor: 'rgba(192,57,43,0.15)',
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
    zIndex: 1,
    letterSpacing: 0.5,
  },
  selectButtonTextActive: {
    color: '#ff6b6b',
  },

  deleteButton: {
    minWidth: 44,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#c0392b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333'
  },
  
  listCard: { backgroundColor: '#1a1a1a', marginHorizontal: 15, marginBottom: 20, borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center' },
  listCardSelected: { borderColor: '#467084', backgroundColor: '#1a1a1a' },
  // checkContainer removed: selection now indicated by opacity

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  listTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  listSubtitle: { color: '#888', fontSize: 12 },
  privacyContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privacyText: { color: '#888', fontSize: 12 },
  
  posterRow: { flexDirection: 'row', paddingLeft: 0, marginTop: 5 },
  miniPoster: { width: 63, height: 95, borderRadius: 5, borderWidth: 0.3, borderColor: '#8a8a8a' },
  emptyText: { color: '#555', fontSize: 12 },
  moreBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -14,
    borderWidth: 1,
    borderColor: '#333',
  },
  moreBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // modal de nova lista
  modalOverlay: { flex: 1, backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 15, padding: 25, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1f1f1f', color: '#fff', borderRadius: 8, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#333' },
  saveButton: { backgroundColor: '#467084' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});