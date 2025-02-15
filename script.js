const apiKey = '02da081d77b0f7e17d988d38177641eb';
const accessToken = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwMmRhMDgxZDc3YjBmN2UxN2Q5ODhkMzgxNzc2NDFlYiIsIm5iZiI6MTczOTU0OTgyMC45NDUsInN1YiI6IjY3YWY2YzdjNmQxYTdiNjA1MjNiNzNjNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.bv-TgTPfysBMuKlf3XvupZL-QwAaTix84B6MCPZTKT8';
let currentPage = 1;
let currentSearch = '';
let isSearching = false;
let currentTmdbID = '';

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

document.getElementById('server-select').addEventListener('change', () => {
    if (currentTmdbID) {
        updateVideoFrame(currentTmdbID);
    }
});

function updateVideoFrame(tmdbID) {
    const server = document.getElementById('server-select').value;
    let embedUrl = '';

    switch (server) {
        case 'vidsrc1':
            embedUrl = `https://vidsrc.cc/v2/embed/movie/${tmdbID}`;
            break;
        case 'vidsrc2':
            embedUrl = `https://vidsrc.cc/v3/embed/movie/${tmdbID}?autoPlay=false`;
            break;
        case 'vidlink':
            embedUrl = `https://vidlink.pro/movie/${tmdbID}`;
            break;
        case 'autoembed':
            embedUrl = `https://player.autoembed.cc/embed/movie/${tmdbID}`;
            break;
        case 'multiembed':
            embedUrl = `https://multiembed.mov/?video_id=${tmdbID}&tmdb=1`;
            break;
        case 'embed':
            embedUrl = `https://embed.su/embed/movie/${tmdbID}`;
            break;
    }

    const modal = document.getElementById('modal');
    const videoFrame = document.getElementById('video-frame');
    videoFrame.src = embedUrl;
    modal.style.display = 'block';

    fetchMovieCredits(tmdbID);
}

function fetchMovieCredits(tmdbID) {
    const tmdbCreditsUrl = `https://api.themoviedb.org/3/movie/${tmdbID}/credits?api_key=${apiKey}`;

    fetch(tmdbCreditsUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const director = data.crew.find(member => member.job === 'Director');
            const cast = data.cast.slice(0, 5); // top 5 actors

            document.getElementById('director').innerHTML = `Director: <b>${director ? director.name : 'N/A'}</b>`;
            if (cast.length > 0) {
                let castHTML = `Cast:<br><br>${cast.map(actor => `<b>${actor.name}</b> as ${actor.character}`).join(', ')}`;
                if (data.cast.length > 5) {
                    castHTML += ', and more.'; // indicate more actors
                }
                document.getElementById('cast').innerHTML = castHTML;
            } else {
                document.getElementById('cast').textContent = 'Cast: N/A';
            }
        })
        .catch(error => console.error('Error fetching movie credits:', error));
}

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
                        <p>${movie.release_date.split('-')[0]}</p>
                        <p>${movie.vote_average.toFixed(1)} ⭐</p>
                        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title} Poster" class="movie-poster" data-tmdbid="${movie.id}">
                    `;

                    movieContainer.appendChild(movieElement);
                });

                // movie poster listeners
                document.querySelectorAll('.movie-poster').forEach(poster => {
                    poster.addEventListener('click', (event) => {
                        currentTmdbID = event.target.getAttribute('data-tmdbid');
                        updateVideoFrame(currentTmdbID);
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
                movieContainer.innerHTML = ''; // clear previous results
            }
            if (data.results.length > 0) {
                movieContainer.style.display = 'block';
                data.results.forEach(movie => {
                    const movieElement = document.createElement('div');
                    movieElement.classList.add('movie');
                    movieElement.innerHTML = `
                        <h2>${movie.title}</h2>
                        <p>${movie.release_date.split('-')[0]}</p>
                        <p>${movie.vote_average.toFixed(1)} ⭐</p>
                        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title} Poster" class="movie-poster" data-tmdbid="${movie.id}">
                    `;

                    movieContainer.appendChild(movieElement);
                });

                // movie poster listeners
                document.querySelectorAll('.movie-poster').forEach(poster => {
                    poster.addEventListener('click', (event) => {
                        currentTmdbID = event.target.getAttribute('data-tmdbid');
                        updateVideoFrame(currentTmdbID);
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

// MODAL control
document.querySelector('.close-button').addEventListener('click', () => {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    document.getElementById('video-frame').src = ''; // Stop the video
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        modal.style.display = 'none';
        document.getElementById('video-frame').src = '';
    }
});

// fetch new & popular on page load
fetchPopularMovies(currentPage);