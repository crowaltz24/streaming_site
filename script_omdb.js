// OLD SCRIPT UTILIZING OMDB INSTEAD OF TMDB
// MIGHT REWORK BECAUSE OMDB HAS ROTTEN TOMATOES SCORES TOO
// BUT TMDB DOESNT HAVE AN API LIMIT ON FREE USE

const apiKey = '217b97ab';
let currentPage = 1;
let currentSearch = '';

document.getElementById('search-button').addEventListener('click', () => {
    currentSearch = document.getElementById('search-input').value;
    currentPage = 1;
    searchMovies(currentSearch, currentPage);
});

document.getElementById('see-more-button').addEventListener('click', () => {
    currentPage++;
    searchMovies(currentSearch, currentPage);
});

document.getElementById('theme-toggle-button').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
});

document.getElementById('home-button').addEventListener('click', () => {
    document.getElementById('movie-container').style.display = 'none';
    document.getElementById('movie-container').innerHTML = '';
    document.getElementById('see-more-button').style.display = 'none';
    document.getElementById('search-input').value = '';
});

function searchMovies(title, page) {
    const omdbApiUrl = `http://www.omdbapi.com/?s=${title}&apikey=${apiKey}&page=${page}`;

    fetch(omdbApiUrl)
        .then(response => response.json())
        .then(data => {
            const movieContainer = document.getElementById('movie-container');
            if (page === 1) {
                movieContainer.innerHTML = ''; // CLEAR RESUlts
            }
            if (data.Response === "True") {
                movieContainer.style.display = 'block';
                data.Search.forEach(movie => {
                    const movieElement = document.createElement('div');
                    movieElement.classList.add('movie');
                    movieElement.innerHTML = `
                        <h2>${movie.Title}</h2>
                        <p>Year: ${movie.Year}</p>
                        <img src="${movie.Poster}" alt="${movie.Title} Poster" class="movie-poster" data-imdbid="${movie.imdbID}">
                    `;

                    movieContainer.appendChild(movieElement);
                });

                // movie poster listener
                document.querySelectorAll('.movie-poster').forEach(poster => {
                    poster.addEventListener('click', (event) => {
                        const imdbID = event.target.getAttribute('data-imdbid');
                        const embedUrl = `https://vidsrc.xyz/embed/movie?imdb=${imdbID}`;
                        const modal = document.getElementById('modal');
                        const videoFrame = document.getElementById('video-frame');
                        videoFrame.src = embedUrl;
                        modal.style.display = 'block';
                    });
                });

                // 'SEE MORE' BUTTON CONTROL
                if (data.totalResults > currentPage * 10) {
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

// MODAL close button
document.querySelector('.close-button').addEventListener('click', () => {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    document.getElementById('video-frame').src = ''; // stop video
});

// MODAL outside window
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        modal.style.display = 'none';
        document.getElementById('video-frame').src = ''; // stop vidoe
    }
});