import axios from 'axios';

const TMDB_TOKEN = process.env.TMDB_TOKEN 

const api = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    Authorization: `Bearer ${TMDB_TOKEN}`,
    accept: 'application/json',
  },
  params: {
    language: 'pt-BR', // para trrazer os resultados em portugues
  }
});

export default api;