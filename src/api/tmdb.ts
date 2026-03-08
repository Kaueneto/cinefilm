import axios from 'axios';

const EXPO_PUBLIC_TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkOWU0MGY0ZjJmZjE1MDYyNDZlNjQzYjI1OGQ1MTlkZiIsIm5iZiI6MTc3MTg2OTc0OC4zMTcsInN1YiI6IjY5OWM5NjM0Zjg4ODIzNjA4YjU5MTdiYiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.rNo4-uuj4vSTJVdANf595bawd8Ry6Xz1cUMrFqWFni8'

const api = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    Authorization: `Bearer ${EXPO_PUBLIC_TMDB_TOKEN}`,
    accept: 'application/json',
  },
  params: {
    language: 'pt-BR', // para trazer os resultados em portugues
  }
});

// Busca detalhes do filme
export async function getMovieDetails(movieId: number) {
  const res = await api.get(`/movie/${movieId}`);
  return res.data;
}

// Busca créditos do filme (para pegar diretor)
export async function getMovieDirector(movieId: number) {
  const res = await api.get(`/movie/${movieId}/credits`);
  const crew = res.data.crew || [];
  const director = crew.find((person: any) => person.job === 'Director');
  return director ? director.name : null;
}

export default api;