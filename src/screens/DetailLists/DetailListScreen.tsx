import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import api from '../../api/tmdb';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = Math.floor((width - 32 - 4 * 6) / 5); // 5 posters, 6px gap
const POSTER_HEIGHT = Math.floor(POSTER_WIDTH * 1.48);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', paddingTop: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 10 },
  backBtn: { marginRight: 10, padding: 6, borderRadius: 20, backgroundColor: 'rgba(30,30,30,0.7)' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 10 },
  actionBtn: { backgroundColor: '#222', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  actionBtnText: { color: '#FFD700', fontWeight: 'bold', fontSize: 15 },
  viewSwitchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginBottom: 10 },
  iconSwitchBtn: { padding: 6, borderRadius: 8 },
  gridContent: { paddingHorizontal: 8, paddingBottom: 20 },
  posterWrapper: { margin: 3, borderRadius: 7, overflow: 'hidden', position: 'relative' },
  poster: { width: POSTER_WIDTH, height: POSTER_HEIGHT, borderRadius: 7, backgroundColor: '#222' },
  posterSelected: { borderWidth: 2, borderColor: '#FFD700' },
  checkOverlay: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  listContent: { paddingHorizontal: 8, paddingBottom: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: '#222' },
  listPoster: { width: 44, height: 62, borderRadius: 6, backgroundColor: '#222' },
  listTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  listYear: { color: '#aaa', fontSize: 13, marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 12, textAlign: 'center' },
});

export default function DetailListScreen({ route, navigation }: any) {
  const { list } = route.params;
  const [items, setItems] = useState<any[]>(list?.list_items || []);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [enriching, setEnriching] = useState<boolean>(false);

  // Enriquecer itens sem título buscando do TMDB quando possível
  React.useEffect(() => {
    let mounted = true;
    async function enrich() {
      const source = list?.list_items || [];
      if (!source || source.length === 0) {
        if (mounted) setItems([]);
        return;
      }

      setEnriching(true);
      const enriched = await Promise.all(
        source.map(async (it: any) => {
          // decide se precisa enriquecer: faltar título, poster, release_date, overview ou backdrop
          const hasTitle = Boolean(it.title || it.movie?.title || it.movie_title || it.name);
          const hasPoster = Boolean(it.poster_path || it.movie?.poster_path || it.poster);
          const hasRelease = Boolean(it.release_date || it.first_air_date || it.movie?.release_date || it.movie?.first_air_date);
          const hasOverview = Boolean(it.overview || it.movie?.overview);
          const hasBackdrop = Boolean(it.backdrop_path || it.movie?.backdrop_path);

          const needEnrich = !(hasTitle && (hasPoster || hasRelease || hasOverview || hasBackdrop));
          if (!needEnrich) return it;

          const id = Number(it.tmdb_id || it.movie_id || it.id || it.movie?.id);
          if (!id || isNaN(id)) return it;

          try {
            // tenta movie primeiro
            const res = await api.get(`/movie/${id}`);
            const d = res.data || {};
            return {
              ...it,
              tmdb_id: id,
              title: it.title || it.movie?.title || d.title || d.name,
              poster_path: it.poster_path || it.movie?.poster_path || d.poster_path,
              backdrop_path: it.backdrop_path || d.backdrop_path,
              release_date: it.release_date || d.release_date || d.first_air_date,
              overview: it.overview || d.overview || '',
              vote_average: it.vote_average || d.vote_average || 0,
            };
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 404) {
              try {
                const res2 = await api.get(`/tv/${id}`);
                const d2 = res2.data || {};
                return {
                  ...it,
                  tmdb_id: id,
                  title: it.title || it.movie?.title || d2.name || d2.title,
                  poster_path: it.poster_path || it.movie?.poster_path || d2.poster_path,
                  backdrop_path: it.backdrop_path || d2.backdrop_path,
                  release_date: it.release_date || d2.first_air_date || d2.release_date,
                  overview: it.overview || d2.overview || '',
                  vote_average: it.vote_average || d2.vote_average || 0,
                };
              } catch (err2) {
                return it;
              }
            }
            return it;
          }
        })
      );

      if (mounted) setItems(enriched);
      if (mounted) setEnriching(false);
    }

    enrich();
    return () => { mounted = false; };
  }, [list]);

  const handleSelect = (id: any) => {
    const itemId = id || 0;
    setSelected(sel => sel.includes(itemId) ? sel.filter(i => i !== itemId) : [...sel, itemId]);
  };

  const handleRemove = () => {
    // TODO: implementar remoção real
    alert('Remover: ' + selected.join(', '));
    setSelected([]);
    setSelectMode(false);
  };

  const renderPoster = ({ item }: { item: any }) => {
    // Normaliza campos caso a lista armazene apenas movie_id ou um objeto movie
    const tmdbId = Number(item.tmdb_id || item.movie_id || item.movie?.id);
    const base = item || {};
    const movieData = {
      // ensure id used for API calls is the TMDB id, not the local list_item id
      id: tmdbId || null,
      tmdb_id: tmdbId || null,
      title: base.title || base.movie?.title || base.movie_title || base.name || 'Título não disponível',
      poster_path: base.poster_path || base.movie?.poster_path || base.poster || null,
      backdrop_path: base.backdrop_path || base.movie?.backdrop_path || null,
      release_date: base.release_date || base.first_air_date || base.movie?.release_date || base.movie?.first_air_date || null,
      overview: base.overview || base.movie?.overview || '',
      vote_average: base.vote_average || base.movie?.vote_average || 0,
      raw: base,
    };

    return (
      <TouchableOpacity
        style={styles.posterWrapper}
        onPress={() => !selectMode ? navigation.navigate('MovieDetail', { movie: movieData }) : handleSelect(item.id || item.movie_id || item.tmdb_id)}
        onLongPress={() => setSelectMode(true)}
        activeOpacity={0.8}
      >
        {movieData.poster_path ? (
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w185${movieData.poster_path}` }}
            style={[styles.poster, selectMode && selected.includes(movieData.id) && styles.posterSelected]}
          />
        ) : (
          <View style={[styles.poster, { backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }]}> 
            <Ionicons name="image-outline" size={28} color="#888" />
          </View>
        )}
        {selectMode && (
          <View style={styles.checkOverlay}>
            <Ionicons name={selected.includes(item.id || item.movie_id || item.tmdb_id) ? 'checkmark-circle' : 'ellipse-outline'} size={24} color="#FFD700" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderList = ({ item }: { item: any }) => {
    // Normaliza campos caso a lista armazene apenas movie_id ou um objeto movie
    const tmdbIdList = Number(item.tmdb_id || item.movie_id || item.movie?.id);
    const baseL = item || {};
    const movieData = {
      id: tmdbIdList || null,
      tmdb_id: tmdbIdList || null,
      title: baseL.title || baseL.movie?.title || baseL.movie_title || baseL.name || 'Título não disponível',
      poster_path: baseL.poster_path || baseL.movie?.poster_path || baseL.poster || null,
      release_date: baseL.release_date || baseL.movie?.release_date || baseL.first_air_date || null,
      overview: baseL.overview || baseL.movie?.overview || '',
      vote_average: baseL.vote_average || baseL.movie?.vote_average || 0,
      raw: baseL,
    };

    return (
      <TouchableOpacity
        style={styles.listRow}
        onPress={() => !selectMode ? navigation.navigate('MovieDetail', { movie: movieData }) : handleSelect(item.id || item.movie_id || item.tmdb_id)}
        onLongPress={() => setSelectMode(true)}
        activeOpacity={0.8}
      >
        {movieData.poster_path ? (
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w92${movieData.poster_path}` }}
            style={styles.listPoster}
          />
        ) : (
          <View style={[styles.listPoster, { backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }]}> 
            <Ionicons name="image-outline" size={20} color="#888" />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.listTitle}>{movieData.title}</Text>
         
        </View>
        {selectMode && (
          <Ionicons name={selected.includes(item.id || item.movie_id || item.tmdb_id) ? 'checkmark-circle' : 'ellipse-outline'} size={24} color="#FFD700" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{list.name}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectMode(m => !m)}>
          <Text style={styles.actionBtnText}>{selectMode ? 'Cancelar' : 'Selecionar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => alert('Compartilhar ainda não implementado')}>
          <Text style={styles.actionBtnText}>Compartilhar</Text>
        </TouchableOpacity>
        {selectMode && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF6B6B' }]} onPress={handleRemove}>
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Remover</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.viewSwitchRow}>
        <TouchableOpacity onPress={() => setViewMode('grid')} style={styles.iconSwitchBtn}>
          <MaterialCommunityIcons name="view-grid" size={24} color={viewMode === 'grid' ? '#FFD700' : '#aaa'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('list')} style={styles.iconSwitchBtn}>
          <MaterialCommunityIcons name="view-list" size={24} color={viewMode === 'list' ? '#FFD700' : '#aaa'} />
        </TouchableOpacity>
      </View>
      {viewMode === 'grid' ? (
          <FlatList
            data={items}
          key={'grid'}
          numColumns={5}
            keyExtractor={(item: any, idx: number) => (item.tmdb_id ? String(item.tmdb_id) : item.id ? String(item.id) : item.movie_id ? String(item.movie_id) : `idx_${idx}`)}
          renderItem={renderPoster}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Nenhum filme na lista</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={items}
          key={'list'}
          keyExtractor={(item: any, idx: number) => (item.tmdb_id ? String(item.tmdb_id) : item.id ? String(item.id) : item.movie_id ? String(item.movie_id) : `idx_${idx}`)}
          renderItem={renderList}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Nenhum filme na lista</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
