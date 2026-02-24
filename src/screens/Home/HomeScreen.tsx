import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function MyListsScreen() {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  const fetchLists = async () => {
    const { data, error } = await supabase
      .from('lists')
      .select(`
        *,
        list_items (poster_path)
      `);

    if (!error) setLists(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLists();
  }, []);


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
            if (isSelectionMode && selectedLists.length > 0) {
              handleDeleteLists();
            } else {
              setIsSelectionMode(!isSelectionMode);
              setSelectedLists([]);
            }
          }}
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.header}>CineFilm</Text>

        <TouchableOpacity onPress={handleCreateList} style={styles.iconButton}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={lists}
        contentContainerStyle={{ paddingBottom: 100 }} 
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => isSelectionMode ? toggleSelection(item.id) : null}
            style={[
              styles.listCard,
              selectedLists.includes(item.id) && styles.listCardSelected
            ]}
          >
            {/* CHECKBOX  */}
            {isSelectionMode && (
              <View style={styles.checkContainer}>
                <Ionicons 
                  name={selectedLists.includes(item.id) ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={selectedLists.includes(item.id) ? "#467084" : "#555"} 
                />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <View style={styles.listHeader}>
                <View>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listSubtitle}>{item.list_items?.length || 0} Filmes</Text>
                </View>
              </View>

              <View style={styles.posterRow}>
                {item.list_items?.slice(0, 5).map((film: any, idx: number) => (
                  <Image 
                    key={idx}
                    source={{ uri: `https://image.tmdb.org/t/p/w200${film.poster_path}` }}
                    style={[styles.miniPoster, { zIndex: idx, marginLeft: idx === 0 ? 0 : -25 }]}
                  />
                ))}
                {item.list_items?.length === 0 && (
                  <Text style={styles.emptyText}>Lista vazia</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
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
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  header: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  
  listCard: { backgroundColor: '#000', marginHorizontal: 15, marginBottom: 20, borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center' },
  listCardSelected: { borderColor: '#467084', backgroundColor: '#0a1014' },
  checkContainer: { marginRight: 15 },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  listTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  listSubtitle: { color: '#888', fontSize: 12 },
  privacyContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privacyText: { color: '#888', fontSize: 12 },
  
  posterRow: { flexDirection: 'row', paddingLeft: 0, marginTop: 5 },
  miniPoster: { width: 65, height: 95, borderRadius: 5, borderWidth: 0.3, borderColor: '#8a8a8a' },
  emptyText: { color: '#555', fontSize: 12 },

  // modal de nova lista
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 15, padding: 25, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 8, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#333' },
  saveButton: { backgroundColor: '#467084' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});