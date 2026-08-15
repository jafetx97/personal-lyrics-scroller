/**
 * Personal Lyrics Scroller
 * Auto-scrolling lyrics PWA for live performances
 */

(function () {
    'use strict';

    // === State ===
    const state = {
        songs: [],              // All available songs (from index.json)
        loadedSongs: {},        // Cache of loaded song data { id: songData }
        setlists: [],           // Available setlists
        currentSetlist: null,   // Active setlist object
        currentSongIndex: -1,   // Index within current playlist (setlist or all songs)
        playlist: [],           // Current ordered list of song IDs to play through

        scrolling: false,       // Is auto-scroll active?
        speed: 1.0,            // Scroll speed multiplier
        baseSpeed: 0.8,        // Base pixels per frame at 1.0x (lower for singing pace)
        animationId: null,     // requestAnimationFrame ID
        lastTimestamp: null,   // For consistent scroll timing
        scrollAccumulator: 0,  // Sub-pixel scroll accumulator for very slow speeds
        userScrollTimeout: null // Timeout after manual scroll
    };

    // === DOM References ===
    const dom = {
        controlsBar: document.getElementById('controlsBar'),
        btnMenu: document.getElementById('btnMenu'),
        btnHome: document.getElementById('btnHome'),
        btnPlay: document.getElementById('btnPlay'),
        btnSpeedToggle: document.getElementById('btnSpeedToggle'),
        speedDisplay: document.getElementById('speedDisplay'),
        speedSliderContainer: document.getElementById('speedSliderContainer'),
        speedSlider: document.getElementById('speedSlider'),
        speedSliderValue: document.getElementById('speedSliderValue'),
        btnSetlist: document.getElementById('btnSetlist'),

        sidebar: document.getElementById('sidebar'),
        btnCloseSidebar: document.getElementById('btnCloseSidebar'),
        songList: document.getElementById('songList'),
        songSearchInput: document.getElementById('songSearchInput'),

        setlistSidebar: document.getElementById('setlistSidebar'),
        btnCloseSetlist: document.getElementById('btnCloseSetlist'),
        setlistContent: document.getElementById('setlistContent'),

        overlay: document.getElementById('overlay'),

        lyricsContainer: document.getElementById('lyricsContainer'),
        lyricsContent: document.getElementById('lyricsContent'),

        songInfo: document.getElementById('songInfo'),
        currentSongTitle: document.getElementById('currentSongTitle'),
        btnPrevSong: document.getElementById('btnPrevSong'),
        btnNextSong: document.getElementById('btnNextSong')
    };

    // === Initialization ===
    async function init() {
        await loadSongIndex();
        await loadSetlists();
        renderSongList();
        renderSetlistPanel();
        bindEvents();
        unregisterServiceWorker();
    }

    // === Data Loading ===
    async function loadSongIndex() {
        try {
            const response = await fetch('songs/index.json');
            if (!response.ok) throw new Error('Failed to load song index');
            state.songs = await response.json();
            // Sort alphabetically by title
            state.songs.sort((a, b) => a.title.localeCompare(b.title, 'es'));
        } catch (err) {
            console.warn('Could not load song index:', err);
            state.songs = [];
        }
    }

    async function loadSong(id) {
        if (state.loadedSongs[id]) {
            return state.loadedSongs[id];
        }
        try {
            const response = await fetch(`songs/${id}.json`);
            if (!response.ok) throw new Error(`Failed to load song: ${id}`);
            const song = await response.json();
            state.loadedSongs[id] = song;
            return song;
        } catch (err) {
            console.warn(`Could not load song ${id}:`, err);
            return null;
        }
    }

    async function loadSetlists() {
        try {
            const response = await fetch('setlists/index.json');
            if (!response.ok) throw new Error('Failed to load setlists index');
            const index = await response.json();

            // Load each setlist's full data from its individual file
            const loaded = [];
            for (const entry of index) {
                const data = await loadSetlistData(entry.id);
                if (data) loaded.push(data);
            }
            state.setlists = loaded;
        } catch (err) {
            console.warn('Could not load setlists:', err);
            state.setlists = [];
        }
    }

    async function loadSetlistData(id) {
        try {
            const response = await fetch(`setlists/${id}.json`);
            if (!response.ok) throw new Error(`Failed to load setlist: ${id}`);
            return await response.json();
        } catch (err) {
            console.warn(`Could not load setlist ${id}:`, err);
            return null;
        }
    }

    // === Rendering ===
    function renderSongList(filter = '') {
        dom.songList.innerHTML = '';
        const normalizedFilter = filter.toLowerCase().trim();
        const filteredSongs = normalizedFilter
            ? state.songs.filter(song => song.title.toLowerCase().includes(normalizedFilter))
            : state.songs;

        let currentLetter = '';
        filteredSongs.forEach((song) => {
            const firstLetter = song.title.charAt(0).toUpperCase();
            if (firstLetter !== currentLetter) {
                currentLetter = firstLetter;
                const divider = document.createElement('li');
                divider.className = 'song-list-divider';
                divider.textContent = currentLetter;
                dom.songList.appendChild(divider);
            }
            const li = document.createElement('li');
            li.dataset.id = song.id;
            li.innerHTML = `
                <div class="song-item-title">${escapeHtml(song.title)}</div>
                <div class="song-item-artist">${escapeHtml(song.artist)}</div>
            `;
            li.addEventListener('click', () => handleSongSelect(song.id));
            dom.songList.appendChild(li);
        });

        if (filteredSongs.length === 0 && normalizedFilter) {
            dom.songList.innerHTML = '<li style="padding:16px;color:var(--text-secondary);font-size:16px;">No se encontraron canciones</li>';
        }
    }

    function renderSetlistPanel() {
        dom.setlistContent.innerHTML = '';

        if (state.setlists.length === 0) {
            dom.setlistContent.innerHTML = '<p style="padding:16px;color:var(--text-secondary);font-size:14px;">No hay setlists disponibles</p>';
            return;
        }

        // If no setlist is active, show the list of setlists
        if (!state.currentSetlist) {
            state.setlists.forEach((setlist) => {
                const div = document.createElement('div');
                div.className = 'setlist-item';
                div.innerHTML = `
                    <div class="setlist-item-name">${escapeHtml(setlist.name)}</div>
                    <div class="setlist-item-count">${setlist.songs.length} canciones</div>
                `;
                div.addEventListener('click', () => handleSetlistSelect(setlist.id));
                dom.setlistContent.appendChild(div);
            });
        } else {
            // Show active setlist with its songs
            const backBtn = document.createElement('div');
            backBtn.className = 'setlist-item';
            backBtn.innerHTML = '<div class="setlist-item-name">← Todos los setlists</div>';
            backBtn.addEventListener('click', () => {
                state.currentSetlist = null;
                state.playlist = [];
                state.currentSongIndex = -1;
                renderSetlistPanel();
                updateNavButtons();
            });
            dom.setlistContent.appendChild(backBtn);

            const title = document.createElement('div');
            title.style.cssText = 'padding:12px 16px;font-weight:600;color:var(--accent);font-size:14px;text-transform:uppercase;letter-spacing:0.5px;';
            title.textContent = state.currentSetlist.name;
            dom.setlistContent.appendChild(title);

            const ul = document.createElement('ul');
            ul.className = 'setlist-songs';

            state.currentSetlist.songs.forEach((songId, index) => {
                const songMeta = state.songs.find(s => s.id === songId);
                const li = document.createElement('li');
                li.dataset.id = songId;
                if (state.currentSongIndex === index) li.classList.add('active');
                li.innerHTML = `<span class="song-number">${index + 1}.</span>${songMeta ? escapeHtml(songMeta.title) : songId}`;
                li.addEventListener('click', () => handleSetlistSongSelect(index));
                ul.appendChild(li);
            });

            dom.setlistContent.appendChild(ul);
        }
    }

    function renderLyrics(songs) {
        dom.lyricsContent.innerHTML = '';

        songs.forEach((song) => {
            const section = document.createElement('div');
            section.className = 'song-separator';
            section.id = `song-${song.id}`;

            const titleEl = document.createElement('div');
            titleEl.className = 'song-separator-title';
            titleEl.textContent = song.title;

            const artistEl = document.createElement('div');
            artistEl.className = 'song-separator-artist';
            artistEl.textContent = song.artist;

            const lyricsEl = document.createElement('div');
            lyricsEl.className = 'lyrics-text';
            const lyricsText = Array.isArray(song.lyrics)
                ? song.lyrics.join('\n')
                : song.lyrics;
            lyricsEl.textContent = lyricsText;

            section.appendChild(titleEl);
            section.appendChild(artistEl);
            section.appendChild(lyricsEl);
            dom.lyricsContent.appendChild(section);
        });

        // Scroll to top
        dom.lyricsContainer.scrollTop = 0;
    }

    // === Song Selection ===
    async function handleSongSelect(songId) {
        closeSidebars();

        const song = await loadSong(songId);
        if (!song) return;

        // Set as single-song playlist
        state.currentSetlist = null;
        state.playlist = [songId];
        state.currentSongIndex = 0;

        renderLyrics([song]);
        updateCurrentSongDisplay(song);
        updateNavButtons();
        highlightActiveSong(songId);
        stopScroll();
    }

    async function handleSetlistSelect(setlistId) {
        const setlist = await loadSetlistData(setlistId);
        if (!setlist) return;

        state.currentSetlist = setlist;
        state.playlist = setlist.songs;
        state.currentSongIndex = 0;

        // Load all songs in the setlist
        const songs = [];
        for (const songId of setlist.songs) {
            const song = await loadSong(songId);
            if (song) songs.push(song);
        }

        renderLyrics(songs);
        renderSetlistPanel();
        updateCurrentSongDisplay(songs[0] || null);
        updateNavButtons();
        closeSidebars();
        stopScroll();
    }

    async function handleSetlistSongSelect(index) {
        state.currentSongIndex = index;
        const songId = state.playlist[index];

        // Jump directly to that song's position (instant, no conflict with auto-scroll)
        const songEl = document.getElementById(`song-${songId}`);
        if (songEl) {
            const container = dom.lyricsContainer;
            const containerRect = container.getBoundingClientRect();
            const songRect = songEl.getBoundingClientRect();
            const offset = songRect.top - containerRect.top + container.scrollTop;
            container.scrollTop = offset;
            state.scrollAccumulator = 0;
            state.lastTimestamp = null;
        }

        const song = state.loadedSongs[songId];
        updateCurrentSongDisplay(song);
        updateNavButtons();
        renderSetlistPanel();
        closeSidebars();
    }

    function updateCurrentSongDisplay(song) {
        if (song) {
            dom.currentSongTitle.textContent = `${song.title} — ${song.artist}`;
        } else {
            dom.currentSongTitle.textContent = 'Sin canción seleccionada';
        }
    }

    function updateNavButtons() {
        dom.btnPrevSong.disabled = state.currentSongIndex <= 0;
        dom.btnNextSong.disabled = state.currentSongIndex >= state.playlist.length - 1;
    }

    function highlightActiveSong(songId) {
        dom.songList.querySelectorAll('li').forEach(li => {
            li.classList.toggle('active', li.dataset.id === songId);
        });
    }

    // === Navigation ===
    async function navigateSong(direction) {
        const newIndex = state.currentSongIndex + direction;
        if (newIndex < 0 || newIndex >= state.playlist.length) return;

        state.currentSongIndex = newIndex;
        const songId = state.playlist[newIndex];

        if (state.currentSetlist) {
            // In setlist mode, jump directly to the song section
            // Use instant scroll so it doesn't conflict with auto-scroll
            const songEl = document.getElementById(`song-${songId}`);
            if (songEl) {
                const container = dom.lyricsContainer;
                const containerRect = container.getBoundingClientRect();
                const songRect = songEl.getBoundingClientRect();
                const offset = songRect.top - containerRect.top + container.scrollTop;
                container.scrollTop = offset;
                // Reset accumulator so auto-scroll continues cleanly from here
                state.scrollAccumulator = 0;
                state.lastTimestamp = null;
            }
        } else {
            // Single song mode, load it
            const song = await loadSong(songId);
            if (song) {
                renderLyrics([song]);
                state.scrollAccumulator = 0;
                state.lastTimestamp = null;
            }
        }

        const song = state.loadedSongs[songId];
        updateCurrentSongDisplay(song);
        updateNavButtons();
        highlightActiveSong(songId);

        if (state.currentSetlist) {
            renderSetlistPanel();
        }
    }

    // === Auto-Scroll ===
    function startScroll() {
        if (state.scrolling) return;
        state.scrolling = true;
        state.lastTimestamp = null;
        dom.btnPlay.textContent = '⏸';
        dom.btnPlay.classList.add('playing');
        state.animationId = requestAnimationFrame(scrollStep);
    }

    function stopScroll() {
        state.scrolling = false;
        state.lastTimestamp = null;
        dom.btnPlay.textContent = '▶';
        dom.btnPlay.classList.remove('playing');
        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }
    }

    function toggleScroll() {
        if (state.scrolling) {
            stopScroll();
        } else {
            startScroll();
        }
    }

    function scrollStep(timestamp) {
        if (!state.scrolling) return;

        if (!state.lastTimestamp) {
            state.lastTimestamp = timestamp;
        }

        const elapsed = timestamp - state.lastTimestamp;
        state.lastTimestamp = timestamp;

        // Calculate fractional pixels to scroll this frame
        const pixels = (state.baseSpeed * state.speed * elapsed) / 16.67; // normalize to ~60fps

        // Accumulate sub-pixel values so very slow speeds still work
        state.scrollAccumulator += pixels;
        const wholePixels = Math.floor(state.scrollAccumulator);

        const container = dom.lyricsContainer;
        const maxScroll = container.scrollHeight - container.clientHeight;

        if (container.scrollTop >= maxScroll) {
            // Reached the end
            stopScroll();
            return;
        }

        if (wholePixels >= 1) {
            container.scrollTop += wholePixels;
            state.scrollAccumulator -= wholePixels;
        }

        state.animationId = requestAnimationFrame(scrollStep);
    }

    function adjustSpeed(delta) {
        state.speed = Math.max(0.1, Math.min(5.0, state.speed + delta));
        state.speed = Math.round(state.speed * 10) / 10;
        updateSpeedDisplay();
    }

    function setSpeed(value) {
        state.speed = Math.round(value * 10) / 10;
        updateSpeedDisplay();
    }

    function updateSpeedDisplay() {
        const text = state.speed.toFixed(1) + 'x';
        dom.speedDisplay.textContent = text;
        dom.speedSliderValue.textContent = text;
        dom.speedSlider.value = state.speed;
    }

    function toggleSpeedSlider() {
        const isVisible = dom.speedSliderContainer.classList.contains('visible');
        dom.speedSliderContainer.classList.toggle('visible', !isVisible);
        dom.btnSpeedToggle.classList.toggle('active', !isVisible);
    }

    function closeSpeedSlider() {
        dom.speedSliderContainer.classList.remove('visible');
        dom.btnSpeedToggle.classList.remove('active');
    }

    // === Manual Scroll Handling ===
    function handleManualScroll() {
        // When user scrolls manually, temporarily pause auto-scroll timing
        // but don't stop it - just reset the timestamp so it continues smoothly
        if (state.scrolling) {
            state.lastTimestamp = null;
        }
    }

    // === Sidebar Management ===
    function openSidebar() {
        dom.sidebar.classList.add('open');
        dom.overlay.classList.add('visible');
    }

    function openSetlistSidebar() {
        dom.setlistSidebar.classList.add('open');
        dom.overlay.classList.add('visible');
    }

    function closeSidebars() {
        dom.sidebar.classList.remove('open');
        dom.setlistSidebar.classList.remove('open');
        dom.overlay.classList.remove('visible');
        // Clear search when closing
        dom.songSearchInput.value = '';
        renderSongList();
    }

    function goHome() {
        stopScroll();
        state.currentSetlist = null;
        state.playlist = [];
        state.currentSongIndex = -1;
        dom.lyricsContent.innerHTML = '<div class="welcome-message"><img src="portada.jpeg" alt="Portada" class="welcome-image"></div>';
        dom.lyricsContainer.scrollTop = 0;
        dom.currentSongTitle.textContent = 'Sin canción seleccionada';
        updateNavButtons();
        highlightActiveSong(null);
    }

    // === Event Binding ===
    function bindEvents() {
        // Controls
        dom.btnPlay.addEventListener('click', toggleScroll);
        dom.btnSpeedToggle.addEventListener('click', toggleSpeedSlider);
        dom.speedSlider.addEventListener('input', (e) => {
            setSpeed(parseFloat(e.target.value));
        });

        // Close speed slider when tapping elsewhere
        document.addEventListener('click', (e) => {
            if (!dom.speedSliderContainer.contains(e.target) && !dom.btnSpeedToggle.contains(e.target)) {
                closeSpeedSlider();
            }
        });

        // Sidebar toggles
        dom.btnMenu.addEventListener('click', openSidebar);
        dom.btnHome.addEventListener('click', goHome);
        dom.btnCloseSidebar.addEventListener('click', closeSidebars);
        dom.btnSetlist.addEventListener('click', openSetlistSidebar);
        dom.btnCloseSetlist.addEventListener('click', closeSidebars);
        dom.overlay.addEventListener('click', closeSidebars);

        // Song search
        dom.songSearchInput.addEventListener('input', () => {
            renderSongList(dom.songSearchInput.value);
        });

        // Navigation
        dom.btnPrevSong.addEventListener('click', () => navigateSong(-1));
        dom.btnNextSong.addEventListener('click', () => navigateSong(1));

        // Manual scroll detection - use wheel event for external mouse
        dom.lyricsContainer.addEventListener('wheel', handleManualScroll, { passive: true });
        dom.lyricsContainer.addEventListener('touchmove', handleManualScroll, { passive: true });

        // Keyboard shortcuts (nice to have for testing, not primary input)
        document.addEventListener('keydown', (e) => {
            // Don't intercept keys when typing in search
            if (e.target === dom.songSearchInput) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    toggleScroll();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    adjustSpeed(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    adjustSpeed(-0.1);
                    break;
            }
        });
    }

    // === Service Worker Cleanup ===
    function unregisterServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((reg) => reg.unregister());
            });
            // Clear all caches left by the old SW
            if ('caches' in window) {
                caches.keys().then((names) => {
                    names.forEach((name) => caches.delete(name));
                });
            }
        }
    }

    // === Utilities ===
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // === Start ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
