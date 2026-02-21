import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Image } from 'react-native';

export default function HomeScreen() {
  const [listas, setListas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionando, setSelecionando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [nomeNovaLista, setNomeNovaLista] = useState('');

  // busca as listas onde o usuario é o dono
  async function fetchListas() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) Alert.alert("Erro", error.message);
      else setListas(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchListas();
  }, []);

 

  //cira a lista com o nome digitado 
  async function salvarNovaLista() {
    if (!nomeNovaLista.trim()) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('lists').insert([
      { name: nomeNovaLista, owner_id: session?.user.id }
    ]);
    
    if (error) Alert.alert("Erro", error.message);
    else {
      setNomeNovaLista('');
      setModalVisivel(false);
      fetchListas();
    }
  }

  function toggleSelecao(id: string) {
    setSelecionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function apagarSelecionadas() {
    const { error } = await supabase.from('lists').delete().in('id', selecionadas);
    if (error) Alert.alert("Erro ao apagar", error.message);
    else {
      setSelecionadas([]);
      setSelecionando(false);
      fetchListas();
    }
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CineFilm</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => { setSelecionando(!selecionando); setSelecionadas([]); }}>
            <Text style={styles.topButtonText}>{selecionando ? 'Cancelar' : 'Selecionar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisivel(true)} style={{marginLeft: 20}}>
            <Text style={styles.plusButton}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LISTAGEM */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color="#0095ff" />
        ) : listas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma lista encontrada.</Text>
          </View>
        ) : (
          listas.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => selecionando && toggleSelecao(item.id)}
              style={[styles.card, selecionadas.includes(item.id) && styles.cardSelected]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>Toque para ver detalhes</Text>
                </View>
                <Text style={styles.statusText}>Privada 🔒</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* MODAL PARA NOVA LISTA */}
      <Modal visible={modalVisivel} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Lista</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Nome da lista" 
              placeholderTextColor="#555"
              value={nomeNovaLista}
              onChangeText={setNomeNovaLista}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisivel(false)} style={styles.btnCancelar}>
                <Text style={{color: '#fff'}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={salvarNovaLista} style={styles.btnSalvar}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BT EXCLUIR */}
      {selecionando && selecionadas.length > 0 && (
        <TouchableOpacity style={styles.deleteButton} onPress={apagarSelecionadas}>
          <Text style={styles.deleteButtonText}>Excluir ({selecionadas.length})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  topButtonText: { color: '#0095ff', fontSize: 16 },
  plusButton: { color: '#fff', fontSize: 30 },
  scrollContent: { padding: 15 },
  card: { backgroundColor: '#000', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 15, marginBottom: 15 },
  cardSelected: { borderColor: '#0095ff', backgroundColor: '#001a33' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardSubtitle: { color: '#888', fontSize: 12, marginTop: 4 },
  statusText: { color: '#666', fontSize: 12 },
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: '#555' },
  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#1a1a1a', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  btnCancelar: { marginRight: 20, padding: 10 },
  btnSalvar: { backgroundColor: '#0095ff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  deleteButton: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: '#ff4444', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' }
});