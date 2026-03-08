import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, Animated, Easing } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { getMovieDetails, getMovieDirector } from '../../api/tmdb';

const { width, height } = Dimensions.get('window');

export default function RouletteScreen({ route, navigation }: any) {
  const { movies } = route.params;
  const maxSlices = 20;
  const displayMovies = Array.isArray(movies) ? movies.slice(0, maxSlices) : [];

  const rotation = useRef(new Animated.Value(0)).current;
  const rotationValueRef = useRef(0);
  const animationRef = useRef<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [winnerDetails, setWinnerDetails] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        try { animationRef.current.stop(); } catch (e) {}
        animationRef.current = null;
      }
    };
  }, []);

  // reduzir tamanho dos posters para ocupar menos espaço
  // wheel geometry
  const SEGMENTS = displayMovies.length || 1;
  const SEG_ANGLE = 360 / SEGMENTS;
  const RADIUS = Math.min(width, height) * 0.50;
  const CENTER = RADIUS;
  const WHEEL_SIZE = RADIUS * 2;

  useEffect(() => {
    const id = rotation.addListener(({ value }) => {
      rotationValueRef.current = value;
    });
    return () => rotation.removeListener(id);
  }, [rotation]);

  const startAutoSpin = () => {
    if (isSpinning) return;
    setShowResult(false);
    setWinner(null);
    setIsSpinning(true);
    // spin a very large amount linearly so it appears continuous until stopped
    animationRef.current = Animated.timing(rotation, {
      toValue: rotationValueRef.current + 360 * 1000,
      duration: 360 * 1000, // long duration
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animationRef.current.start();
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
    // stop any continuous animation
    if (animationRef.current) {
      try { animationRef.current.stop(); } catch (e) {}
      animationRef.current = null;
    }

    // keep spinning but decelerate to a stop over 3 seconds
    // compute current normalized rotation
    const rot = rotationValueRef.current % 360;
    const norm = ((rot % 360) + 360) % 360; // 0..359

    // choose a random target segment to land on
    const targetIndex = Math.floor(Math.random() * SEGMENTS);
    const centerAngle = targetIndex * SEG_ANGLE + SEG_ANGLE / 2; // angle of segment center
    // rotation normalized that would place centerAngle at pointer (0 deg)
    const targetNorm = ((360 - centerAngle) % 360 + 360) % 360;

    const delta = (targetNorm - norm + 360) % 360; // positive delta to reach targetNorm
    const extraRotations = 360 * (3 + Math.random() * 3); // 3..6 extra full rotations
    const finalRotation = rotationValueRef.current + extraRotations + delta;

    setIsSpinning(true);
    animationRef.current = Animated.timing(rotation, {
      toValue: finalRotation,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animationRef.current.start(async () => {
      // finalize
      rotationValueRef.current = finalRotation;
      animationRef.current = null;
      const finalNorm = ((finalRotation % 360) + 360) % 360;
      const indexAtPointer = Math.floor(((360 - finalNorm + SEG_ANGLE / 2) % 360) / SEG_ANGLE) % SEGMENTS;
      const selected = displayMovies[indexAtPointer];
      setWinner(selected);
      try {
        const [details, director] = await Promise.all([
          getMovieDetails(selected.id),
          getMovieDirector(selected.id),
        ]);
        setWinnerDetails({ ...details, director: director || null });
      } catch (e) {
        setWinnerDetails(null);
      }
      setIsSpinning(false);
      setShowResult(true);
    });
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { padding: 10, borderRadius: 20, backgroundColor: 'rgba(30,30,30,0.7)', marginRight: 18 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Roleta dos Filmes</Text>
      </View>

      <View style={styles.rouletteContainer}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* pointer */}
          <View style={[styles.pointer, { top: -RADIUS - 30, position: 'absolute' }]}> 
            <Ionicons name="caret-down" size={36} color="#FFD700" />
          </View>

          <Animated.View style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }],
          }}>
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}> 
              <G>
                {displayMovies.map((item, i) => {
                  const startAngle = i * SEG_ANGLE - 90;
                  const endAngle = (i + 1) * SEG_ANGLE - 90;
                  const largeArc = SEG_ANGLE > 180 ? 1 : 0;
                  const x1 = CENTER + RADIUS * Math.cos((Math.PI * startAngle) / 180);
                  const y1 = CENTER + RADIUS * Math.sin((Math.PI * startAngle) / 180);
                  const x2 = CENTER + RADIUS * Math.cos((Math.PI * endAngle) / 180);
                  const y2 = CENTER + RADIUS * Math.sin((Math.PI * endAngle) / 180);
                  const pathData = [
                    `M ${CENTER} ${CENTER}`,
                    `L ${x1} ${y1}`,
                    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`,
                    'Z',
                  ].join(' ');
                  // Text position: angle in the middle of the slice
                  const midAngle = (startAngle + endAngle) / 2;
                  const textRadius = RADIUS * 0.6;
                  const textX = CENTER + textRadius * Math.cos((Math.PI * midAngle) / 180);
                  const textY = CENTER + textRadius * Math.sin((Math.PI * midAngle) / 180);

                  const maxChars = SEGMENTS > 15 ? 10 : SEGMENTS > 10 ? 14 : 18;
                  const fontSize = SEGMENTS > 15 ? 9 : SEGMENTS > 10 ? 11 : 13;
                  const safeTitle =
                    item.title.length > maxChars
                      ? item.title.slice(0, maxChars) + '…'
                      : item.title;
                  return (
                    <G key={item.id + '_' + i}>
                      <Path d={pathData} fill="#111" stroke="#222" strokeWidth={2} />
                     <SvgText
                      x={textX}
                      y={textY}
                      fill="#fff"
                      fontSize={fontSize}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                    >
                      {safeTitle}
                    </SvgText>
                    </G>
                  );
                })}
              </G>

            </Svg>
          </Animated.View>

          <View style={{ marginTop: 20, alignItems: 'center' }}>
            {!isSpinning ? (
              <TouchableOpacity style={[styles.stopButton, { backgroundColor: '#467084' }]} onPress={startAutoSpin}>
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
  wheel: { alignItems: 'center', justifyContent: 'center' },
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