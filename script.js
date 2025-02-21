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
        topRated: 1
    },
    isSearching: false,
    currentSearch: ''
};

// video player endpoints
const videoServers = {
    vidsrc1: (id) => `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=false`,
    vidsrc2: (id) => `https://vidsrc.cc/v3/embed/movie/${id}?autoPlay=false`,
    vidlink: (id) => `https://vidlink.pro/movie/${id}`,
    autoembed: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    multiembed: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1&autoplay=false`,
    embed: (id) => `https://embed.su/embed/movie/${id}?autoplay=false`
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

    getMoviesByType: {
        popular: (page) => api.fetchData('/movie/popular', page),
        trending: (page) => api.fetchData('/trending/movie/week', page),
        topRated: (page) => api.fetchData('/movie/top_rated', page)
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
                <button class="context-menu-item">Open in Immersive Mode</button>
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

    // add movies to container
    async updateMovieContainer(data, containerId, page = 1) {
        const container = document.getElementById(containerId);
        if (page === 1) container.innerHTML = '';

        data.results
            .filter(movie => movie.poster_path)
            .forEach(movie => {
                const movieCard = this.createMovieCard(movie);
                if (movieCard) container.appendChild(movieCard);
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
        const videoFrame = document.querySelector('#video-frame iframe');
        if (videoFrame) {
            videoFrame.src = embedUrl;
            this.openModal();
        }
        
        // fetch both movie details and credits simultaneously
        try {
            const [details, credits] = await Promise.all([
                api.getMovieDetails(tmdbID),
                api.getMovieCredits(tmdbID)
            ]);
            
            const descriptionElement = document.getElementById('movie-description');
            if (descriptionElement) {
                const overview = details.overview || 'No description available.';
                const year = details.release_date ? `(${details.release_date.split('-')[0]})` : '';
                
                descriptionElement.innerHTML = `
                    <h2 class="modal-movie-title">${details.title} ${year}</h2>
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
        document.getElementById('featured-movies').style.display = 'none';
        const searchResults = document.getElementById('search-results');
        searchResults.style.display = 'block';
        document.getElementById('section-title').textContent = 'Search Results';
        
        // REMOVES OLD QUERY
        const existingQueryDisplays = document.querySelectorAll('#search-results h3');
        existingQueryDisplays.forEach(display => display.remove());
        
        // NEW QUERY DISPLAY
        const searchQueryDisplay = document.createElement('h3');
        searchQueryDisplay.textContent = `Results for "${query}"`;
        searchQueryDisplay.style.textAlign = 'center';
        searchQueryDisplay.style.marginBottom = '20px';
        searchQueryDisplay.style.color = 'var(--dark-secondary)';
        
        const container = document.getElementById('search-movies-container');
        container.innerHTML = ''; // CLEAR  previous results
        container.parentNode.insertBefore(searchQueryDisplay, container);
        
        try {
            const data = await api.searchMovies(query, 1);
            const container = document.getElementById('search-movies-container');
            container.innerHTML = '';
            
            if (data.results && data.results.length > 0) {
                // filters out movies without posters and sort by popularity
                const validMovies = data.results
                    .filter(movie => movie.poster_path)
                    .sort((a, b) => b.popularity - a.popularity);

                validMovies.forEach(movie => {
                    const movieCard = this.createMovieCard(movie);
                    if (movieCard) container.appendChild(movieCard);
                });

                if (validMovies.length === 0) {
                    container.innerHTML = '<p style="color: white; text-align: center;">No movies found with posters</p>';
                }
            } else {
                container.innerHTML = '<p style="color: white; text-align: center;">No movies found</p>';
            }
        } catch (error) {
            console.error('Search error:', error);
            const container = document.getElementById('search-movies-container');
            container.innerHTML = '<p style="color: white; text-align: center;">Error searching for movies</p>';
        }
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
    },
};

// click handlers and stuff
function setupEventListeners() {
    document.querySelectorAll('.see-more-button').forEach(button => {
        button.addEventListener('click', async () => {
            const section = button.getAttribute('data-section');
            if (!section || !api.getMoviesByType[section]) return;

            const containerId = `${section.replace(/([A-Z])/g, '-$1').toLowerCase()}-movies-container`;
            if (!state.pages[section]) {
                state.pages[section] = 1;
            }
            
            button.disabled = true;
            try {
                state.pages[section]++;
                const data = await api.getMoviesByType[section](state.pages[section]);
                ui.updateMovieContainer(data, containerId, state.pages[section]);
            } catch (error) {
                console.error(`Error loading more ${section} movies:`, error);
                // Revert the page count since the request failed
                state.pages[section]--;
                // Show error to user
                const container = document.getElementById(containerId);
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Failed to load more movies. Please try again later.';
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
        document.getElementById('section-title').textContent = 'Featured Movies ⬇️';

        const searchQueryDisplay = document.querySelector('#search-results h3');
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

    // home button event listener
    document.getElementById('home-button').addEventListener('click', async () => {
        state.isSearching = false;
        state.currentSearch = '';
        document.getElementById('search-input').value = '';
        document.getElementById('section-title').textContent = 'Featured Movies';
        
        const searchSection = document.getElementById('search-results');
        if (searchSection) searchSection.style.display = 'none';
        document.getElementById('featured-movies').style.display = 'block';
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

init().catch(console.error);