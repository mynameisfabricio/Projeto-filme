import API_KEY from "./dadosApi.js";

const movieTitleInput = document.getElementById('movie-title');
const searchButton = document.getElementById('search-button');
const resultContainer = document.getElementById('result-container');
const playerModal = document.getElementById('player-modal');
const closeBtn = document.querySelector('.close-btn');
const playerIframeContainer = document.getElementById('player-iframe-container');
const logoImg = document.querySelector('.logo');

const BASE_URL = "https://api.themoviedb.org/3/";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
let lastSearchResults = []; 

function showFeedbackMessage(message, isError = false) {
    resultContainer.innerHTML = `<p class="placeholder-text" style="color: ${isError ? 'red' : 'inherit'};">${message}</p>`;
}

async function searchContent(queryFromButton = null) {
    const query = movieTitleInput.value.trim(); 
    if (!query) {
        showFeedbackMessage('Por favor, digite o nome de um filme ou série para pesquisar.');
        return;
    }

    showFeedbackMessage('Buscando...');
    try {
        const url = `${BASE_URL}search/multi?query=${encodeURIComponent(query)}&api_key=${API_KEY}&language=pt-BR`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro de rede.');
        const data = await response.json();

        const contentResults = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');

        if (contentResults.length === 0) {
            throw new Error('Nenhum filme ou série encontrado.');
        }

        lastSearchResults = contentResults; 
        displayContent(contentResults);
    } catch (error) {
        showFeedbackMessage(`Erro: ${error.message}`, true);
    }
}

function displayContent(results) {
    let contentHTML = '<ul class="search-results-list">';
    results.forEach(item => {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const poster = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : 'https://via.placeholder.com/60x90.png?text=Sem+P%C3%B4ster';
        const typeText = item.media_type === 'movie' ? 'Filme' : item.media_type === 'tv' ? 'Série' : '';

        contentHTML += `
            <li data-id="${item.id}" data-type="${item.media_type}">
                <img src="${poster}" alt="Pôster de ${title}">
                <div class="result-info">
                    <span class="result-title">${title} (${year})</span>
                    <span class="result-type">${typeText}</span>
                </div>
            </li>
        `;
    });
    contentHTML += '</ul>';
    resultContainer.innerHTML = contentHTML;

    document.querySelectorAll('.search-results-list li').forEach(item => {
        item.addEventListener('click', (event) => {
            const id = event.currentTarget.dataset.id;
            const type = event.currentTarget.dataset.type;
            showContentDetails(id, type); 
        });
    });
}

async function showContentDetails(tmdbId, type) {
    showFeedbackMessage('Carregando detalhes...');
    try {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const url = `${BASE_URL}${endpoint}/${tmdbId}?api_key=${API_KEY}&language=pt-BR`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao buscar detalhes do conteúdo.');
        const data = await response.json();

        const title = data.title || data.name;
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);
        const poster = data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : 'https://via.placeholder.com/200x300.png?text=Sem+P%C3%B4ster';
        const plot = data.overview || 'Sinopse indisponível.';
        const genres = data.genres.map(g => g.name).join(', ');
        const runtime = data.runtime ? `${data.runtime} min` : (data.episode_run_time && data.episode_run_time.length > 0 ? `${data.episode_run_time[0]} min` : 'N/A');
        const vote_average = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const typeText = type === 'movie' ? 'Filme' : 'Série';

        const primaryButtonText = type === 'movie' ? 'Assistir Agora' : 'Ver Temporadas/Episódios';

        resultContainer.innerHTML = `
            <div class="movie-card" data-tmdb-id="${tmdbId}" data-type="${type}">
                <img src="${poster}" alt="Pôster de ${title}" class="movie-poster">
                <div class="movie-info">
                    <h2 class="movie-title">${title} (${year})</h2>
                    <p><strong>Tipo:</strong> ${typeText}</p>
                    <p><strong>Gêneros:</strong> ${genres}</p>
                    <p><strong>Duração/Episódio:</strong> ${runtime}</p>
                    <p><strong>Avaliação (TMDB):</strong> ${vote_average} / 10</p>
                    <p class="movie-plot">${plot}</p>
                    
                    <button id="primary-action-button" class="show-seasons-btn">${primaryButtonText}</button>
                </div>
            </div>
            <button id="back-to-search" class="show-seasons-btn" style="margin-top: 20px;">&larr; Voltar à Busca</button>
        `;
        
        document.getElementById('primary-action-button').addEventListener('click', () => {
             if (type === 'tv') {
                 showSeasons(tmdbId, data.name, data.seasons); 
             } else {
                 showMoviePlayer(tmdbId);
             }
        });

        document.getElementById('back-to-search').addEventListener('click', () => {
             if (lastSearchResults.length > 0) {
                 displayContent(lastSearchResults);
             } else {
                 showFeedbackMessage('Digite o nome de um filme ou série e clique em (Buscar)');
             }
        });
        
    } catch (error) {
        showFeedbackMessage(`Erro ao carregar os detalhes: ${error.message}`, true);
    }
}

function showSeasons(tmdbId, seriesName, seasons) {
    let seasonsHTML = `
        <h2 class="seasons-title">Temporadas de ${seriesName}</h2>
        <div class="seasons-list">
    `;

    const validSeasons = seasons.filter(s => s.season_number > 0);
    
    validSeasons.forEach(season => {
        const poster = season.poster_path ? `${IMAGE_BASE_URL}${season.poster_path}` : 'https://via.placeholder.com/60x90.png?text=Sem+P%C3%B4ster';
        
        seasonsHTML += `
            <div class="season-item" data-tmdb-id="${tmdbId}" data-season-number="${season.season_number}">
                <img src="${poster}" alt="Pôster da ${season.name}" class="season-poster">
                <span class="season-name">${season.name} (${season.episode_count || '0'} eps)</span>
            </div>
        `;
    });

    seasonsHTML += '</div>';
    
    seasonsHTML += `<button id="back-to-details" class="show-seasons-btn" style="margin-top: 20px;">&larr; Voltar aos Detalhes</button>`;

    resultContainer.innerHTML = seasonsHTML;

    document.querySelectorAll('.season-item').forEach(item => {
        item.addEventListener('click', (event) => {
            const id = event.currentTarget.dataset.tmdbId;
            const seasonNumber = event.currentTarget.dataset.seasonNumber;
            showEpisodes(id, seasonNumber, seriesName, seasons); 
        });
    });
    
    document.getElementById('back-to-details').addEventListener('click', () => {
         showContentDetails(tmdbId, 'tv');
    });
}

async function showEpisodes(tmdbId, seasonNumber, seriesName, allSeasons) {
    showFeedbackMessage(`Carregando Episódios da Temporada ${seasonNumber}...`);
    try {
        const url = `${BASE_URL}tv/${tmdbId}/season/${seasonNumber}?api_key=${API_KEY}&language=pt-BR`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao buscar episódios.');
        const data = await response.json();
        
        let episodesHTML = `<h2 class="episodes-title">Episódios de ${seriesName} - ${data.name}</h2>`;
        episodesHTML += '<ul class="episodes-list">';

        if (data.episodes && data.episodes.length > 0) {
            data.episodes.forEach(episode => {
                const epNumber = episode.episode_number;
                const epTitle = episode.name || `Episódio ${epNumber}`;
                const overview = episode.overview || 'Sem sinopse.';

                episodesHTML += `
                    <li class="episode-item" 
                        data-tmdb-id="${tmdbId}" 
                        data-season-number="${seasonNumber}" 
                        data-episode-number="${epNumber}">
                        <strong>E${epNumber}: ${epTitle}</strong> 
                        <span class="episode-overview">${overview}</span>
                        <button class="watch-episode-btn">Assistir</button>
                    </li>
                `;
            });
        } else {
             episodesHTML += '<li>Nenhum episódio encontrado para esta temporada.</li>';
        }

        episodesHTML += '</ul>';
        
        episodesHTML += `<button id="back-to-seasons" class="show-seasons-btn" style="margin-top: 20px;">&larr; Voltar às Temporadas</button>`;

        resultContainer.innerHTML = episodesHTML;
        
        document.querySelectorAll('.episode-item').forEach(item => {
            const watchButton = item.querySelector('.watch-episode-btn');
            if(watchButton) {
                watchButton.addEventListener('click', () => {
                    const id = item.dataset.tmdbId;
                    const s = item.dataset.seasonNumber;
                    const e = item.dataset.episodeNumber;
                    showEpisodePlayer(id, s, e);
                });
            }
        });
        
        document.getElementById('back-to-seasons').addEventListener('click', () => {
             showSeasons(tmdbId, seriesName, allSeasons);
        });

    } catch (error) {
        showFeedbackMessage(`Erro ao carregar episódios: ${error.message}`, true);
    }
}

function showEpisodePlayer(tmdbId, seasonNumber, episodeNumber) {
    const playerUrl = `https://playerflixapi.com/serie/${tmdbId}/${seasonNumber}/${episodeNumber}`;
    displayPlayer(playerUrl);
}

async function showMoviePlayer(tmdbId) {
    try {
        const detailsUrl = `${BASE_URL}movie/${tmdbId}?api_key=${API_KEY}`;
        const response = await fetch(detailsUrl);
        const data = await response.json();
        const imdbId = data.imdb_id;
        if (imdbId) {
            const playerUrl = `https://playerflixapi.com/filme/${imdbId}`;
            displayPlayer(playerUrl);
        } else {
            showFeedbackMessage('ID do IMDB não encontrado para este filme.', true);
        }
    } catch (error) {
        showFeedbackMessage('Erro ao carregar o player do filme.', true);
    }
}

function displayPlayer(playerUrl) {
    playerIframeContainer.innerHTML = `
        <iframe src="${playerUrl}" 
                width="100%" 
                height="100%" 
                frameborder="0" 
                allowfullscreen>
        </iframe>
    `;
    if (playerModal) { 
        playerModal.style.display = 'flex';
    }
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        playerModal.style.display = 'none';
        playerIframeContainer.innerHTML = '';
    });
}

if (playerModal) {
    window.addEventListener('click', (event) => {
        if (event.target === playerModal) {
            playerModal.style.display = 'none';
            playerIframeContainer.innerHTML = '';
        }
    });
}

searchButton.addEventListener('click', () => searchContent());

movieTitleInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        searchContent();
    }
});


const themeSwitch = document.getElementById('checkbox');
const body = document.body;
const defaultLogo = './assets/img/28292.png'; 
const darkLogo = './assets/img/38393.png'; 


function setDarkMode(isDark) {
    if (isDark) {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if(logoImg) logoImg.src = darkLogo; 
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if(logoImg) logoImg.src = defaultLogo;
    }
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    themeSwitch.checked = true;
    setDarkMode(true);
} else if (savedTheme === 'light') {
    themeSwitch.checked = false;
    setDarkMode(false);
} else {
    if (logoImg) logoImg.src = defaultLogo;
}


themeSwitch.addEventListener('change', () => {
    setDarkMode(themeSwitch.checked);
});