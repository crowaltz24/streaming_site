const apiKey = '02da081d77b0f7e17d988d38177641eb';
const accessToken = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwMmRhMDgxZDc3YjBmN2UxN2Q5ODhkMzgxNzc2NDFlYiIsIm5iZiI6MTczOTU0OTgyMC45NDUsInN1YiI6IjY3YWY2YzdjNmQxYTdiNjA1MjNiNzNjNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.bv-TgTPfysBMuKlf3XvupZL-QwAaTix84B6MCPZTKT8';
let currentPage = 1;
let currentSearch = '';
let isSearching = false;

document.getElementById('search-button').addEventListener('click', () => {
    currentSearch = document.getElementById('search-input').value;
    currentPage = 1;
    isSearching = true;
    document.getElementById('section-title').textContent = 'Search Results';
    searchMovies(currentSearch, currentPage);
});

document.getElementById('search-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        currentSearch = document.getElementById('search-input').value;
        currentPage = 1;
        isSearching = true;
        document.getElementById('section-title').textContent = 'Search Results';
        searchMovies(currentSearch, currentPage);
    }
});

document.getElementById('see-more-button').addEventListener('click', () => {
    currentPage++;
    if (isSearching) {
        searchMovies(currentSearch, currentPage);
    } else {
        fetchPopularMovies(currentPage);
    }
});

document.getElementById('theme-toggle-button').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
});

document.getElementById('home-button').addEventListener('click', () => {
    currentPage = 1;
    isSearching = false;
    document.getElementById('section-title').textContent = 'New and Popular Movies';
    document.getElementById('search-input').value = '';
    fetchPopularMovies(currentPage);
});

document.getElementById('scroll-to-top-button').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
    const scrollToTopButton = document.getElementById('scroll-to-top-button');
    if (window.scrollY > 300) {
        scrollToTopButton.style.display = 'block';
    } else {
        scrollToTopButton.style.display = 'none';
    }
});

function searchMovies(title, page) {
    const tmdbApiUrl = `https://api.themoviedb.org/3/search/movie?query=${title}&page=${page}&api_key=${apiKey}`;

    fetch(tmdbApiUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const movieContainer = document.getElementById('movie-container');
            if (page === 1) {
                movieContainer.innerHTML = ''; // clear previous results
            }
            if (data.results.length > 0) {
                movieContainer.style.display = 'block';
                data.results.forEach(movie => {
                    const movieElement = document.createElement('div');
                    movieElement.classList.add('movie');
                    movieElement.innerHTML = `
                        <h2>${movie.title}</h2>
                        <p>Year: ${movie.release_date.split('-')[0]}</p>
                        <p>${movie.vote_average} ⭐</p>
                        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title} Poster" class="movie-poster" data-tmdbid="${movie.id}">
                    `;

                    movieContainer.appendChild(movieElement);
                });

                // movie poster event listeners
                document.querySelectorAll('.movie-poster').forEach(poster => {
                    poster.addEventListener('click', (event) => {
                        const tmdbID = event.target.getAttribute('data-tmdbid');
                        const server = document.getElementById('server-select').value;
                        let embedUrl = '';

                        switch (server) {
                            case 'vidsrc':
                                embedUrl = `https://vidsrc.xyz/embed/movie?tmdb=${tmdbID}`;
                                break;
                            case 'autoembed':
                                embedUrl = `https://player.autoembed.cc/embed/movie/${tmdbID}`;
                                break;
                            case 'vidlink':
                                embedUrl = `https://vidlink.pro/movie/${tmdbID}`;
                                break;
                            case 'multiembed':
                                embedUrl = `https://multiembed.mov/?video_id=${tmdbID}&tmdb=1`;
                                break;
                        }

                        const modal = document.getElementById('modal');
                        const videoFrame = document.getElementById('video-frame');
                        videoFrame.src = embedUrl;
                        modal.style.display = 'block';
                    });
                });

                // SEE MORE button control
                if (data.total_results > currentPage * 20) {
                    document.getElementById('see-more-button').style.display = 'block';
                } else {
                    document.getElementById('see-more-button').style.display = 'none';
                }
            } else {
                movieContainer.style.display = 'block';
                movieContainer.innerHTML = `<p>No movies found!</p>`;
                document.getElementById('see-more-button').style.display = 'none';
            }
        })
        .catch(error => console.error('Error fetching movie data:', error));
}

function fetchPopularMovies(page) {
    const tmdbApiUrl = `https://api.themoviedb.org/3/movie/popular?page=${page}&api_key=${apiKey}`;

    fetch(tmdbApiUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const movieContainer = document.getElementById('movie-container');
            if (page === 1) {
                movieContainer.innerHTML = ''; // //clear previous results
            }
            if (data.results.length > 0) {
                movieContainer.style.display = 'block';
                data.results.forEach(movie => {
                    const movieElement = document.createElement('div');
                    movieElement.classList.add('movie');
                    movieElement.innerHTML = `
                        <h2>${movie.title}</h2>
                        <p>Year: ${movie.release_date.split('-')[0]}</p>
                        <p>${movie.vote_average} ⭐</p>
                        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title} Poster" class="movie-poster" data-tmdbid="${movie.id}">
                    `;

                    movieContainer.appendChild(movieElement);
                });

                // popular movie poster event listeners
                document.querySelectorAll('.movie-poster').forEach(poster => {
                    poster.addEventListener('click', (event) => {
                        const tmdbID = event.target.getAttribute('data-tmdbid');
                        const server = document.getElementById('server-select').value;
                        let embedUrl = '';

                        switch (server) {
                            case 'vidsrc':
                                embedUrl = `https://vidsrc.xyz/embed/movie?tmdb=${tmdbID}`;
                                break;
                            case 'autoembed':
                                embedUrl = `https://player.autoembed.cc/embed/movie/${tmdbID}`;
                                break;
                            case 'vidlink':
                                embedUrl = `https://vidlink.pro/movie/${tmdbID}`;
                                break;
                            case 'multiembed':
                                embedUrl = `https://multiembed.mov/?video_id=${tmdbID}&tmdb=1`;
                                break;
                        }

                        const modal = document.getElementById('modal');
                        const videoFrame = document.getElementById('video-frame');
                        videoFrame.src = embedUrl;
                        modal.style.display = 'block';
                    });
                });

                // SEE MORE button control
                if (data.total_results > currentPage * 20) {
                    document.getElementById('see-more-button').style.display = 'block';
                } else {
                    document.getElementById('see-more-button').style.display = 'none';
                }
            } else {
                movieContainer.style.display = 'block';
                movieContainer.innerHTML = `<p>No movies found!</p>`;
                document.getElementById('see-more-button').style.display = 'none';
            }
        })
        .catch(error => console.error('Error fetching movie data:', error));
}

// MODAL CLOSING CONTROLS
document.querySelector('.close-button').addEventListener('click', () => {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    document.getElementById('video-frame').src = ''; // Stops vidoe
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        modal.style.display = 'none';
        document.getElementById('video-frame').src = ''; 
    }
});

// page load fetches new & popular movies
fetchPopularMovies(currentPage);