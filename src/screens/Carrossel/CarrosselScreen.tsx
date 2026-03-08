import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMovieDetails, getMovieDirector } from '../../api/tmdb';

const { width, height } = Dimensions.get('window');

export default function RouletteScreen({ route, navigation }: any) {
  const { movies } = route.params;
  const maxSlices = 20;
  const displayMovies = Array.isArray(movies) ? movies.slice(0, maxSlices) : [];

  const carouselRef = useRef<FlatList<any> | null>(null);
  const autoScrollRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [winnerDetails, setWinnerDetails] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, []);

  // reduzir tamanho dos posters para ocupar menos espaço
  const ITEM_WIDTH = Math.min(width, height) * 0.42;
  const ITEM_HEIGHT = ITEM_WIDTH * 1.45;

  // create a repeated dataset so the FlatList can scroll seamlessly
  const COPIES = 3;
  const duplicatedData = React.useMemo(() => {
    if (!displayMovies || displayMovies.length === 0) return [];
    const data: any[] = [];
    displayMovies.forEach((m, i) => {
      for (let c = 0; c < COPIES; c++) {
        data.push({ ...m, _copy: c, _origIndex: i });
      }
    });
    return data;
  }, [displayMovies]);

  const START_INDEX = displayMovies.length; // start in the middle copy

  useEffect(() => {
    // position the list at the middle copy for seamless scrolling
    if (duplicatedData.length && carouselRef.current) {
      setTimeout(() => {
        carouselRef.current?.scrollToIndex({ index: START_INDEX, animated: false });
        setCurrentIndex(START_INDEX);
      }, 50);
    }
  }, [duplicatedData]);

  const startAutoSpin = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        let next = prev + 1;
        if (next >= duplicatedData.length) next = START_INDEX;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });

        // if we are approaching the end copy, reset silently back to middle copy
        if (next >= duplicatedData.length - displayMovies.length) {
          setTimeout(() => {
            carouselRef.current?.scrollToIndex({ index: START_INDEX, animated: false });
            setCurrentIndex(START_INDEX);
          }, 140);
          return START_INDEX;
        }
        return next;
      });
    }, 100); // velocidade maior (menor ms = mais rápido)
    setIsSpinning(true);
  };

  const handleStartSpin = () => {
    if (isSpinning) return;
    setShowResult(false);
    setWinner(null);
    startAutoSpin();
    setTimeout(() => {
      // permitir parar após curto delay
    }, 2000);
  };

  const stopSpinning = async () => {
    if (!isSpinning) return;
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    setIsSpinning(false);

    const selectedIndex = currentIndex % displayMovies.length;

    const selected = displayMovies[selectedIndex];
    setWinner(selected);
    try {
      const [details, director] = await Promise.all([
        getMovieDetails(selected.id),
        getMovieDirector(selected.id)
      ]);
      setWinnerDetails({ ...details, director: director || null });
    } catch (e) {
      setWinnerDetails(null);
    }
    setShowResult(true);
  };

  const displayYear = (() => {
    const date = winnerDetails?.release_date || winner?.release_date;
    if (!date) return '';
    try {
      return String(date).split('-')[0] || '';
    } catch (e) {
      return '';
    }
  })();

  const displayDirector = winnerDetails?.director ? String(winnerDetails.director) : '';

  if (showResult && winner) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filme Sorteado!</Text>
        </View>

        <View style={styles.resultContainer}>
          <Image source={{ uri: `https://image.tmdb.org/t/p/w500${winner.poster_path}` }} style={styles.winnerPoster} />
          <Text style={styles.winnerTitle}>{winner.title}</Text>
          <Text style={styles.winnerYear}>{displayYear}</Text>
          <Text style={styles.winnerDirector}>{displayDirector ? `Dirigido por ${displayDirector}` : ''}</Text>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
          <Text style={styles.actionButtonText}>Sortear Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Roleta dos Filmes</Text>
      </View>

      <View style={styles.rouletteContainer}>
        <FlatList
          ref={carouselRef}
          data={duplicatedData}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, idx) => `${item.id}_${item._copy}_${idx}`}
          contentContainerStyle={{ alignItems: 'center' }}
          renderItem={({ item }) => (
            <View style={{ width: ITEM_WIDTH, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: ITEM_WIDTH * 0.92, height: ITEM_HEIGHT, borderRadius: 10, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                <Text numberOfLines={3} style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{item.title}</Text>
              </View>
            </View>
          )}
          getItemLayout={(_, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index })}
          onMomentumScrollEnd={ev => {
            const offsetX = ev.nativeEvent.contentOffset.x;
            const idx = Math.round(offsetX / ITEM_WIDTH);
            setCurrentIndex(idx);
          }}
        />

        <View style={[styles.pointer, { top: -30 }]}>
          <Ionicons name="caret-down" size={40} color="#FFD700" />
        </View>

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          {!isSpinning ? (
            <TouchableOpacity style={[styles.stopButton, { backgroundColor: '#467084' }]} onPress={handleStartSpin}>
              <Text style={styles.stopButtonText}>Girar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopSpinning}>
              <Text style={styles.stopButtonText}>Parar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161616', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 30 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  rouletteContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pointer: { position: 'absolute', top: -20, zIndex: 10 },
  stopButton: { backgroundColor: '#FF6B6B', marginHorizontal: 40, marginBottom: 20, padding: 14, borderRadius: 12, alignItems: 'center' },
  stopButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  winnerPoster: { width: 200, height: 300, borderRadius: 15, marginBottom: 20 },
  winnerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  winnerYear: { color: '#aaa', fontSize: 16, marginBottom: 5 },
  winnerDirector: { color: '#aaa', fontSize: 16, marginBottom: 20 },
  actionButton: { backgroundColor: '#161616', marginHorizontal: 40, marginBottom: 100, padding: 15, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'normal' },
});