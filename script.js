// api stuff
const config = {
    apiKey: '02da081d77b0f7e17d988d38177641eb',
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwMmRhMDgxZDc3YjBmN2UxN2Q5ODhkMzgxNzc2NDFlYiIsIm5iZiI6MTczOTU0OTgyMC45NDUsInN1YiI6IjY3YWY2YzdjNmQxYTdiNjA1MjNiNzNjNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.bv-TgTPfysBMuKlf3XvupZL-QwAaTix84B6MCPZTKT8',
    tmdbBaseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/w500'
};

// states (keeping track)
const state = {
    currentTmdbID: '',
    pages: {
        popular: 1,
        trending: 1,
        topRated: 1,
        popularTV: 1,
        trendingTV: 1,
        topRatedTV: 1  // add tv pages
    },
    showProgress: {}, // remember episodes n stuff
    isSearching: false,
    currentSearch: '',
    searchResults: {  // fix for states
        movies: [],
        shows: []
    }
};

// video player endpoints
const videoServers = {
    // Movie endpoints
    vidsrc1: (id) => `https://vidsrc.cc/v3/embed/movie/${id}?autoPlay=false`,
    vidsrc2: (id) => `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=false`,
    vidlink: (id) => `https://vidlink.pro/movie/${id}`,
    autoembed: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    multiembed: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1&autoplay=false`,
    embed: (id) => `https://embed.su/embed/movie/${id}?autoplay=false`,
 
    // tv show links
    vidsrc1TV: (id, season = 1, episode = 1) => `https://vidsrc.cc/v3/embed/tv/${id}/${season}/${episode}?autoPlay=false`,
    vidsrc2TV: (id, season = 1, episode = 1) => `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}?autoPlay=false`,
    vidlinkTV: (id, season = 1, episode = 1) => `https://vidlink.pro/tv/${id}/${season}/${episode}`,
    autoembedTV: (id, season = 1, episode = 1) => `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`,
    multiembedTV: (id, season = 1, episode = 1) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}&autoplay=false`,
    embedTV: (id, season = 1, episode = 1) => `https://embed.su/embed/tv/${id}/${season}/${episode}?autoplay=false`
};

// api calls
const api = {
    async fetchWithRetry(url, options, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    },

    async fetchData(endpoint, page = 1) {
        const url = `${config.tmdbBaseUrl}${endpoint}?page=${page}&api_key=${config.apiKey}`;
        return this.fetchWithRetry(url, {
            headers: { 
                'Authorization': `Bearer ${config.accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    async searchMovies(query, page = 1) {
        const url = `${config.tmdbBaseUrl}/search/movie?api_key=${config.apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false&language=en-US`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        return response.json();
    },

    async searchTV(query, page = 1) {
        const url = `${config.tmdbBaseUrl}/search/tv?api_key=${config.apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false&language=en-US`;
        return this.fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    async getMovieCredits(movieId) {
        return this.fetchData(`/movie/${movieId}/credits`);
    },

    async getMovieDetails(movieId) {
        const url = `${config.tmdbBaseUrl}/movie/${movieId}?api_key=${config.apiKey}&language=en-US`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch movie details');
        }
        
        return response.json();
    },

    async getTVDetails(tvId) {
        const url = `${config.tmdbBaseUrl}/tv/${tvId}?api_key=${config.apiKey}&append_to_response=credits`;
        return this.fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    async getTVSeasonDetails(tvId, season) {
        return this.fetchData(`/tv/${tvId}/season/${season}`);
    },

    getMoviesByType: {
        popular: (page) => api.fetchData('/movie/popular', page),
        trending: (page) => api.fetchData('/trending/movie/week', page),
        topRated: (page) => api.fetchData('/movie/top_rated', page)
    },

    getShowsByType: {
        popularTV: (page) => api.fetchData('/tv/popular', page),
        trendingTV: (page) => api.fetchData('/trending/tv/week', page),
        topRatedTV: (page) => api.fetchData('/tv/top_rated', page)
    }
};

// ui stuff
const ui = {
    // make movie cards
    createMovieCard(movie) {
        if (!movie.poster_path) return null;
        const movieElement = document.createElement('div');
        movieElement.classList.add('movie');
        movieElement.innerHTML = `
            <img src="${config.imageBaseUrl}${movie.poster_path}" 
                 alt="${movie.title}" 
                 title="${movie.title}"
                 class="movie-poster" 
                 data-tmdbid="${movie.id}">
            <h2 title="${movie.title}">${movie.title}</h2>
            <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            <p>${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'} ⭐</p>
            <div class="movie-context-menu">
                <button class="context-menu-item">Open in New Tab</button>
            </div>
        `;

        const poster = movieElement.querySelector('.movie-poster');
        
        // normal click opens in modal
        poster.addEventListener('click', (e) => {
            if (e.button === 0) { // left click
                state.currentTmdbID = movie.id;
                this.updateVideoFrame(movie.id);
            }
        });

        // middle click opens straight to new tab
        poster.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // middle clikc
                e.preventDefault(); //  disables the scroll mode
                window.open(`player.html?id=${movie.id}`, '_blank');
            }
        });

        // right click opens context menu
        poster.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // close all other context menus first
            document.querySelectorAll('.movie-context-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            const contextMenu = movieElement.querySelector('.movie-context-menu');
            contextMenu.style.display = 'block';
            
            // context menu positioning ??
            const posterRect = poster.getBoundingClientRect();
            const menuRect = contextMenu.getBoundingClientRect();
            let x = e.clientX - posterRect.left;
            let y = e.clientY - posterRect.top;
            
            // Keep menu inside poster bounds
            if (x + menuRect.width > posterRect.width) {
                x = posterRect.width - menuRect.width;
            }
            if (y + menuRect.height > posterRect.height) {
                y = posterRect.height - menuRect.height;
            }
            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
        });

        // NEW TAB HANDLING
        movieElement.querySelector('.context-menu-item').addEventListener('click', () => {
            window.open(`player.html?id=${movie.id}`, '_blank');
        });

        return movieElement;
    },

    createTVCard(show) {
        if (!show.poster_path) return null;
        const showElement = document.createElement('div');
        showElement.classList.add('movie'); // reuse the movie styles
        showElement.innerHTML = `
            <img src="${config.imageBaseUrl}${show.poster_path}" 
                 alt="${show.name}" 
                 title="${show.name}"
                 class="tv-poster" 
                 data-tmdbid="${show.id}"
                 data-type="tv">
            <h2 title="${show.name}">${show.name}</h2>
            <p>${show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}</p>
            <p>${show.vote_average ? show.vote_average.toFixed(1) : 'N/A'} ⭐</p>
            <div class="movie-context-menu">
                <button class="context-menu-item">Open in Immersive Mode</button>
            </div>
        `;

        const poster = showElement.querySelector('.tv-poster');
        
        // Normal click opens in modal
        poster.addEventListener('click', () => {
            this.showTVModal(show.id);
        });

        // Middle click for new tab
        poster.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                window.open(`player.html?id=${show.id}&type=tv`, '_blank');
            }
        });

        // Context menu
        poster.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            document.querySelectorAll('.movie-context-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            const contextMenu = showElement.querySelector('.movie-context-menu');
            contextMenu.style.display = 'block';
            
            const posterRect = poster.getBoundingClientRect();
            const menuRect = contextMenu.getBoundingClientRect();
            let x = e.clientX - posterRect.left;
            let y = e.clientY - posterRect.top;
            
            if (x + menuRect.width > posterRect.width) {
                x = posterRect.width - menuRect.width;
            }
            if (y + menuRect.height > posterRect.height) {
                y = posterRect.height - menuRect.height;
            }
            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
        });

        // New tab handler
        showElement.querySelector('.context-menu-item').addEventListener('click', () => {
            window.open(`player.html?id=${show.id}&type=tv`, '_blank');
        });

        return showElement;
    },

    // add movies to container
    async updateMovieContainer(data, containerId, page = 1) {
        const container = document.getElementById(containerId);
        if (page === 1) container.innerHTML = '';

        data.results
            .filter(item => item.poster_path)
            .forEach(item => {
                // Check if it's a TV show (has name instead of title)
                const isTV = 'name' in item;
                const card = isTV ? this.createTVCard(item) : this.createMovieCard(item);
                if (card) container.appendChild(card);
            });

        const seeMoreButton = container.parentElement.querySelector('.see-more-button');
        if (seeMoreButton) {
            seeMoreButton.style.display = data.page < data.total_pages ? 'block' : 'none';
        }
    },

    // modal setup
    initializeModal() {
        const modal = document.getElementById('modal');
        const closeButton = document.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeModal();
            }
        });
    },

    // open/close modal
    openModal() {
        const modal = document.getElementById('modal');
        modal.classList.add('open');
    },

    closeModal() {
        // kill video when closing
        const modal = document.getElementById('modal');
        const videoFrame = document.getElementById('video-frame');
        const iframe = videoFrame.querySelector('iframe');
        if (iframe) {
            iframe.src = '';
        }
        modal.classList.remove('open');
    },

    // update video player
    async updateVideoFrame(tmdbID) {
        const server = document.getElementById('server-select').value;
        const embedUrl = videoServers[server](tmdbID);
        
        // Reset modal content to default movie structure
        const content = document.querySelector('.modal-content');
        content.innerHTML = `
            <button class="close-button"><span>&times;</span></button>
            <div id="video-frame">
                <iframe frameborder="0" allowfullscreen></iframe>
            </div>
            <div id="movie-details">
                <div id="movie-description"></div>
                <p id="director"></p>
                <p id="cast"></p>
            </div>
        `;

        const videoFrame = content.querySelector('#video-frame iframe');
        if (videoFrame) {
            videoFrame.src = embedUrl;
            this.openModal();
        }
        
        try {
            const [details, credits] = await Promise.all([
                api.getMovieDetails(tmdbID),
                api.getMovieCredits(tmdbID)
            ]);
            
            content.insertAdjacentHTML('afterbegin', `
                <h2 class="modal-movie-title">${details.title} ${details.release_date ? `(${details.release_date.split('-')[0]})` : ''}</h2>
            `);
            
            const descriptionElement = document.getElementById('movie-description');
            if (descriptionElement) {
                const overview = details.overview || 'No description available.';
                descriptionElement.innerHTML = `
                    <div class="movie-overview">
                        <p>${overview}</p>
                    </div>
                    <button class="read-more-btn">Read More</button>
                `;
                
                // READ MORE button check
                const overviewDiv = descriptionElement.querySelector('.movie-overview');
                const needsReadMore = overviewDiv.scrollHeight > overviewDiv.clientHeight;
                if (needsReadMore) {
                    overviewDiv.parentElement.classList.add('needs-read-more');
                    
                    const readMoreBtn = descriptionElement.querySelector('.read-more-btn');
                    readMoreBtn.addEventListener('click', () => {
                        overviewDiv.classList.toggle('expanded');
                        readMoreBtn.textContent = overviewDiv.classList.contains('expanded') ? 
                            'Read Less' : 'Read More';
                    });
                }
            }
            
            this.updateMovieCredits(tmdbID, credits);
        } catch (error) {
            console.error('Error loading movie information:', error);
        }
    },

    async showTVModal(tvId) {
        try {
            const details = await api.getTVDetails(tvId);
            const seasons = details.seasons.filter(s => s.season_number > 0);
            
            // Load saved progress before building modal
            const progress = state.showProgress[tvId] || { season: 1, episode: 1 };
            
            const modal = document.getElementById('modal');
            const content = modal.querySelector('.modal-content');
            
            content.innerHTML = `
                <button class="close-button"><span>&times;</span></button>
                <h2 class="modal-movie-title">${details.name}</h2>
                <div class="season-select">
                    <select id="season-select">
                        ${seasons.map(s => `
                            <option value="${s.season_number}">Season ${s.season_number}</option>
                        `).join('')}
                    </select>
                    <select id="episode-select"></select>
                </div>
                <div id="video-frame">
                    <iframe frameborder="0" allowfullscreen></iframe>
                </div>
                <div id="movie-details">
                    <div id="movie-description">
                        <div class="movie-overview">
                            <p>${details.overview || 'No description available.'}</p>
                        </div>
                        <button class="read-more-btn">Read More</button>
                    </div>
                    <p id="director">Created by: <b>${(details.created_by || []).map(c => c.name).join(', ') || 'N/A'}</b></p>
                    <p id="cast">${this.formatCast(details.credits?.cast)}</p>
                </div>
                <button id="next-episode-button" style="display: none;">Next Episode</button>
            `;
            // open first so stuff renders right
            this.openModal();

            // read more stuff
            setTimeout(() => {
                const overviewDiv = content.querySelector('.movie-overview');
                const readMoreBtn = content.querySelector('.read-more-btn');
                if (overviewDiv.scrollHeight > overviewDiv.clientHeight) {
                    overviewDiv.parentElement.classList.add('needs-read-more');
                    readMoreBtn.style.display = 'block';
                    readMoreBtn.addEventListener('click', () => {
                        overviewDiv.classList.toggle('expanded');
                        readMoreBtn.textContent = overviewDiv.classList.contains('expanded') ? 
                            'Read Less' : 'Read More';
                    });
                } else {
                    readMoreBtn.style.display = 'none';
                }
            }, 100); // tiny wait for modal

            content.querySelector('.close-button').addEventListener('click', () => {
                this.closeModal();
            });

            // season/episode
            document.getElementById('season-select').addEventListener('change', (e) => {
                this.updateEpisodeSelect(tvId, e.target.value);
            });

            document.getElementById('episode-select').addEventListener('change', (e) => {
                const season = document.getElementById('season-select').value;
                const episode = e.target.value;
                this.updateTVFrame(tvId, season, episode);
            });

            // set initial season to saved progress
            const seasonSelect = document.getElementById('season-select');
            if (progress.season) {
                seasonSelect.value = progress.season;
            }

            // load episodes and set to saved episode
            await this.updateEpisodeSelect(tvId, seasonSelect.value);

            // initialize w saved progress
            const episodeSelect = document.getElementById('episode-select');
            if (episodeSelect && episodeSelect.value) {
                this.updateTVFrame(tvId, seasonSelect.value, episodeSelect.value);
            }

        } catch (error) {
            console.error('Error showing TV modal:', error);
        }
    },

    // format cast
    formatCast(cast) {
        if (!cast || cast.length === 0) return 'Cast: N/A';
        
        const mainCast = cast.slice(0, 5);
        let castHTML = `Cast:<br>${mainCast.map(actor => 
            `<b>${actor.name}</b> as ${actor.character}`).join(', ')}`;
        if (cast.length > 5) castHTML += ', and more.';
        return castHTML;
    },

    async updateEpisodeSelect(tvId, season) {
        try {
            const seasonDetails = await api.getTVSeasonDetails(tvId, season);
            const episodeSelect = document.getElementById('episode-select');
            
            episodeSelect.innerHTML = seasonDetails.episodes.map(ep => `
                <option value="${ep.episode_number}">Episode ${ep.episode_number}: ${ep.name}</option>
            `).join('');

            // check if we got a saved episode
            const progress = state.showProgress[tvId];
            if (progress && progress.season === parseInt(season)) {
                episodeSelect.value = progress.episode;
            }
            
            // dont play anything til user clicks!!
            const videoFrame = document.querySelector('#video-frame iframe');
            if (videoFrame) {
                videoFrame.src = '';
            }
        } catch (error) {
            console.error('Error updating episodes:', error);
        }
    },

    updateTVFrame(tvId, season, episode) {
        const server = document.getElementById('server-select').value;
        // gotta add TV to server name
        const tvServer = server + 'TV';
        const embedUrl = videoServers[tvServer](tvId, season, episode);
        const videoFrame = document.querySelector('#video-frame iframe');
        const nextEpisodeButton = document.getElementById('next-episode-button');
        
        if (videoFrame) {
            videoFrame.src = embedUrl;
            state.showProgress[tvId] = {
                season: parseInt(season),
                episode: parseInt(episode)
            };
            localStorage.setItem('showProgress', JSON.stringify(state.showProgress));
            
            // Show/hide next episode button based on available episodes
            const episodeSelect = document.getElementById('episode-select');
            const seasonSelect = document.getElementById('season-select');
            if (episodeSelect && seasonSelect) {
                const hasNextEpisode = episode < episodeSelect.options.length || 
                                     season < seasonSelect.options.length;
                nextEpisodeButton.style.display = hasNextEpisode ? 'block' : 'none';
                
                // Update next episode click handler
                nextEpisodeButton.onclick = () => {
                    if (episode < episodeSelect.options.length) {
                        // Next episode in current season
                        episodeSelect.value = parseInt(episode) + 1;
                        ui.updateTVFrame(tvId, season, parseInt(episode) + 1);
                    } else if (season < seasonSelect.options.length) {
                        // First episode of next season
                        seasonSelect.value = parseInt(season) + 1;
                        ui.updateEpisodeSelect(tvId, parseInt(season) + 1).then(() => {
                            episodeSelect.value = 1;
                            ui.updateTVFrame(tvId, parseInt(season) + 1, 1);
                        });
                    }
                };
            }
        }
    },

    // get movie info
    async updateMovieCredits(tmdbID, creditsData = null) {
        try {
            const data = creditsData || await api.getMovieCredits(tmdbID);
            const director = data.crew.find(member => member.job === 'Director');
            const cast = data.cast.slice(0, 5);
            
            document.getElementById('director').innerHTML = 
                `Director: <b>${director ? director.name : 'N/A'}</b>`;

            if (cast.length > 0) {
                let castHTML = `Cast:<br>${cast.map(actor => 
                    `<b>${actor.name}</b> as ${actor.character}`).join(', ')}`;
                if (data.cast.length > 5) castHTML += ', and more.';
                document.getElementById('cast').innerHTML = castHTML;
            } else {
                document.getElementById('cast').textContent = 'Cast: N/A';
            }
        } catch (error) {
            console.error('Error updating movie credits:', error);
            document.getElementById('director').innerHTML = 'Director: <b>N/A</b>';
            document.getElementById('cast').textContent = 'Cast: N/A';
        }
    },

    // dark/light mode
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },

    // theme on startup
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    },

    // reset scrolling
    resetScrollPositions() {
        document.querySelectorAll('.movie-scroll-container').forEach(container => {
            container.scrollLeft = 0;
        });
    },

    // search results section
    createSearchSection() {
        const searchSection = document.createElement('section');
        searchSection.id = 'search-results';
        searchSection.className = 'movie-section';
        const headerDiv = document.createElement('div');
        headerDiv.className = 'section-header';
        const container = document.createElement('div');
        container.id = 'search-movies-container';
        //change to grid
        searchSection.appendChild(headerDiv);
        searchSection.appendChild(container);
        document.body.insertBefore(searchSection, document.getElementById('featured-movies').nextSibling);
        
        return searchSection;
    },

    // handle search
    async handleSearch(query) {
        state.currentSearch = query;
        state.isSearching = true;
        
        // hide everything except search results
        document.getElementById('featured-movies').style.display = 'none';
        document.getElementById('featured-tv').style.display = 'none';
        document.querySelector('.tabs').style.display = 'none';
        document.getElementById('section-title').style.display = 'none';
        
        let searchResults = document.getElementById('search-results');
        if (!searchResults) {
            searchResults = this.createSearchSection();
        }
        searchResults.style.display = 'block';
        
        // CLEAR previous content
        const container = document.getElementById('search-movies-container');
        container.innerHTML = '';
        
        // search info section
        const searchInfo = document.getElementById('search-info');
        searchInfo.style.display = 'block';
        searchInfo.innerHTML = `
            <h2>Search Results</h2>
            <p>Note: If one server doesn't work, try another server in settings.</p>
            <h1>🦋</h1>
            <h3>Results for "${query}"</h3>
        `;
        
        try {
            // search both movies and TV shows
            const [movieData, tvData] = await Promise.all([
                api.searchMovies(query, 1),
                api.searchTV(query, 1)
            ]);

            state.searchResults.movies = movieData.results;
            state.searchResults.shows = tvData.results;

            if (movieData.results.length === 0 && tvData.results.length === 0) {
                container.innerHTML = '<p style="color: var(--dark-text); text-align: center;">No results found</p>';
                return;
            }
            
            // filter controls if not already present
            if (!document.querySelector('.filter-controls')) {
                const filterHTML = this.createFilterControls();
                searchResults.insertAdjacentHTML('afterbegin', filterHTML);
                
                ['type-filter', 'year-filter', 'sort-by'].forEach(id => {
                    document.getElementById(id).addEventListener('change', () => {
                        this.updateSearchResults(state.searchResults.movies, state.searchResults.shows);
                    });
                });
            }
            
            this.updateSearchResults(state.searchResults.movies, state.searchResults.shows);
        } catch (error) {
            console.error('Search error:', error);
            container.innerHTML = '<p style="color: var(--dark-text); text-align: center;">Error searching for content</p>';
        }
    },

    updateSearchResults(movies, shows) {
        const container = document.getElementById('search-movies-container');
        container.innerHTML = '';
        
        const typeFilter = document.getElementById('type-filter').value;
        const yearFilter = document.getElementById('year-filter').value;
        const sortBy = document.getElementById('sort-by').value;
        
        let results = [];
        
        // Apply type filter
        if (typeFilter === 'all' || typeFilter === 'movie') {
            results.push(...movies);
        }
        if (typeFilter === 'all' || typeFilter === 'tv') {
            results.push(...shows);
        }
        
        // Apply year filter (now using exact year match if provided)
        if (yearFilter) {
            const filterYear = parseInt(yearFilter);
            results = results.filter(item => {
                const year = parseInt(item.release_date?.split('-')[0] || 
                                   item.first_air_date?.split('-')[0] || '0');
                return year === filterYear;
            });
        }
        
        // Apply sorting
        results.sort((a, b) => {
            switch(sortBy) {
                case 'popularity':
                    return b.popularity - a.popularity;
                case 'year-new':
                    const dateA = a.release_date || a.first_air_date || '';
                    const dateB = b.release_date || b.first_air_date || '';
                    return dateB.localeCompare(dateA);
                case 'year-old':
                    const dateC = a.release_date || a.first_air_date || '';
                    const dateD = b.release_date || b.first_air_date || '';
                    return dateC.localeCompare(dateD);
                case 'rating':
                    return b.vote_average - a.vote_average;
                case 'name':
                    const nameA = a.title || a.name || '';
                    const nameB = b.title || b.name || '';
                    return nameA.localeCompare(nameB);
                default:
                    return 0;
            }
        });
        
        // Show filtered/sorted results
        if (results.length > 0) {
            results.forEach(item => {
                const card = 'name' in item ? this.createTVCard(item) : this.createMovieCard(item);
                if (card) container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="color: var(--dark-text); text-align: center;">No results match your filters</p>';
        }
    },

    // add to ui object
    createFilterControls() {
        return `
            <div class="filter-controls">
                <select id="type-filter">
                    <option value="all">All Content</option>
                    <option value="movie">Movies Only</option>
                    <option value="tv">TV Shows Only</option>
                </select>
                <input type="number" 
                       id="year-filter" 
                       placeholder="Filter by Year" 
                       min="1900" 
                       max="${new Date().getFullYear() + 1}"
                       maxlength="4">
                <select id="sort-by">
                    <option value="popularity">Sort by Popularity</option>
                    <option value="year-new">Newest First</option>
                    <option value="year-old">Oldest First</option>
                    <option value="rating">Highest Rated</option>
                    <option value="name">Name (A-Z)</option>
                </select>
            </div>
        `;
    },

    // scroll button show/hide
    updateScrollButtonVisibility() {
        const scrollButton = document.getElementById('scroll-to-top-button');
        if (window.scrollY > 300) {
            scrollButton.style.display = 'block';
        } else {
            scrollButton.style.display = 'none';
        }
    },

    // FOR PLAYER PAGE
    async updateMovieInfo(tmdbID) {
        try {
            const data = await api.getMovieDetails(tmdbID);
            document.getElementById('movie-title').textContent = data.title;
            document.getElementById('movie-meta').textContent = 
                `${data.release_date.split('-')[0]} • ${data.vote_average.toFixed(1)}⭐`;
        } catch (error) {
            console.error('Error loading movie info:', error);
        }
    }
};

// click handlers and stuff
function setupEventListeners() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(c => c.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    document.querySelectorAll('.see-more-button').forEach(button => {
        button.addEventListener('click', async () => {
            const section = button.getAttribute('data-section');
            if (!section) return;

            // fix container id mapping
            const containerMap = {
                'popularTV': 'popular-tv-container',
                'trendingTV': 'trending-tv-container',
                'topRatedTV': 'top-rated-tv-container'
            };

            const containerId = section.includes('TV') ?
                containerMap[section] :
                `${section.replace(/([A-Z])/g, '-$1').toLowerCase()}-movies-container`;

            if (!state.pages[section]) {
                state.pages[section] = 1;
            }
            
            button.disabled = true;
            try {
                state.pages[section]++;
                const data = await (section.includes('TV') ? 
                    api.getShowsByType[section](state.pages[section]) : 
                    api.getMoviesByType[section](state.pages[section]));
                ui.updateMovieContainer(data, containerId, state.pages[section]);
            } catch (error) {
                console.error(`Error loading more ${section} content:`, error);
                state.pages[section]--;
                const container = document.getElementById(containerId);
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Failed to load more content. Please try again later.';
                container.appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 3000);
            } finally {
                button.disabled = false;
            }
        });
    });

    // search
    document.getElementById('search-button').addEventListener('click', () => {
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            ui.handleSearch(query);
        }
    });

    document.getElementById('search-input').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            if (query) {
                ui.handleSearch(query);
            }
        }
    });

    // home button
    document.getElementById('home-button').addEventListener('click', () => {
        state.isSearching = false;
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('featured-movies').style.display = 'block';
        document.getElementById('featured-tv').style.display = 'block';
        document.querySelector('.tabs').style.display = 'flex';
        document.getElementById('section-title').style.display = 'block';
    });

    // server switch
    document.getElementById('server-select').addEventListener('change', () => {
        if (state.currentTmdbID) {
            ui.updateVideoFrame(state.currentTmdbID);
        }
    });

    // theme toggle
    document.getElementById('theme-toggle-button').addEventListener('click', () => {
        ui.toggleTheme();
    });

    // scroll to top
    document.getElementById('scroll-to-top-button').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // scroll button visibility
    window.addEventListener('scroll', () => {
        ui.updateScrollButtonVisibility();
    });

    document.querySelector('.close-button').addEventListener('click', () => {
        ui.closeModal();
    });

    document.getElementById('modal').addEventListener('click', (event) => {
        if (event.target.id === 'modal') {
            ui.closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            ui.closeModal();
        }
    });

    // settings menu
    document.getElementById('settings-toggle').addEventListener('click', () => {
        const container = document.getElementById('server-container');
        const settingsButton = document.getElementById('settings-toggle');
        container.classList.toggle('open');
        settingsButton.style.transform = container.classList.contains('open') 
            ? 'rotate(90deg)' 
            : 'rotate(0deg)';
    });

    document.addEventListener('click', (event) => {
        const container = document.getElementById('server-container');
        const settingsButton = document.getElementById('settings-toggle');
        if (!container.contains(event.target) && !settingsButton.contains(event.target) && container.classList.contains('open')) {
            container.classList.remove('open');
            settingsButton.style.transform = 'rotate(0deg)';
        }
    });

    document.getElementById('bottom-scroll-button').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.movie-context-menu')) {
        document.querySelectorAll('.movie-context-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// startup
async function init() {
    ui.initializeTheme();
    ui.initializeModal();
    ui.resetScrollPositions();
    setupEventListeners();
    
    document.getElementById('search-input').value = '';
    
    // initial movie data
    const activeTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
    if (activeTab === 'movies') {
        const [popularData, trendingData, topRatedData] = await Promise.all([
            api.getMoviesByType.popular(1),
            api.getMoviesByType.trending(1),
            api.getMoviesByType.topRated(1)
        ]);

        await Promise.all([
            ui.updateMovieContainer(popularData, 'popular-movies-container', 1),
            ui.updateMovieContainer(trendingData, 'trending-movies-container', 1),
            ui.updateMovieContainer(topRatedData, 'top-rated-movies-container', 1)
        ]);
    }
    
    // load TV data when TV tab is clicked for the first time
    document.querySelector('[data-tab="tv"]').addEventListener('click', async function loadTVData() {
        const [popularTV, trendingTV, topRatedTV] = await Promise.all([
            api.getShowsByType.popularTV(1),
            api.getShowsByType.trendingTV(1),
            api.getShowsByType.topRatedTV(1)
        ]);

        await Promise.all([
            ui.updateMovieContainer(popularTV, 'popular-tv-container', 1),
            ui.updateMovieContainer(trendingTV, 'trending-tv-container', 1),
            ui.updateMovieContainer(topRatedTV, 'top-rated-tv-container', 1)
        ]);
        
        this.removeEventListener('click', loadTVData);
    });

    // load saved show progress
    const savedProgress = localStorage.getItem('showProgress');
    if (savedProgress) {
        state.showProgress = JSON.parse(savedProgress);
    }
}

init().catch(console.error);