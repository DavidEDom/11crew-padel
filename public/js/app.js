import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyAcwEb6uhdOjneQ_xjxJsvr7sX-z-SQ3wU",
    authDomain: "padel-score-95999.firebaseapp.com",
    projectId: "padel-score-95999",
    storageBucket: "padel-score-95999.firebasestorage.app",
    messagingSenderId: "1051967038944",
    appId: "1:1051967038944:web:5b29f5014e5954b8217785",
    measurementId: "G-B9C6T62P9H"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  window.db = db;
  window.auth = auth;

  const loginScreen = document.getElementById("loginScreen");
  const mainContent = document.getElementById("mainContent");
  const loginBtn = document.getElementById("googleLoginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminSection = document.getElementById("adminSection");

  loginBtn?.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch(err) {
      alert("Error: "+err.message);
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, async user => {
    if(user){
      loginScreen.style.display="none";
      mainContent.style.display="grid";
      const tokenResult = await user.getIdTokenResult();
      if(tokenResult.claims?.admin){
        adminSection.style.display="block";
      } else {
        adminSection.style.display="none";
      }
    } else {
      loginScreen.style.display="flex";
      mainContent.style.display="none";
    }
  });


        // Datos del torneo
        let tournamentData = {
            mode: null,
            title: '',
            players: [],
            teams: [],
            currentRound: 1,
            totalRounds: 0,
            rounds: [],
            currentCycle: 1,
            totalCycles: 2,
            id: null,
            matchCounter: 0 // Contador global para IDs únicos de partidos
        };

        // Al cargar la página, cargar torneos guardados
        document.addEventListener('DOMContentLoaded', function () {
            loadSavedTournaments();

            // Manejo de pestañas
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    document.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.remove('active');
                    });

                    const tabId = tab.getAttribute('data-tab');
                    document.getElementById(`${tabId}-content`).classList.add('active');

                    if (tabId === 'standings') updateStandingsTable();
                    if (tabId === 'players') updatePlayersTab();
                });
            });

            // Manejo de filtros
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateStandingsTable();
                });
            });
        });

        // Funciones para localStorage
        function saveTournamentToStorage() {
            if (!tournamentData.id) {
                tournamentData.id = 'tournament_' + new Date().getTime();
            }
            localStorage.setItem(tournamentData.id, JSON.stringify(tournamentData));
            loadSavedTournaments();
        }

        function loadTournamentFromStorage(id) {
            const data = localStorage.getItem(id);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        }

        function loadSavedTournaments() {
            const container = document.getElementById('saved-tournaments-container');
            container.innerHTML = '';

            let hasSavedTournaments = false;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('tournament_')) {
                    hasSavedTournaments = true;
                    const tournament = JSON.parse(localStorage.getItem(key));

                    const tournamentElement = document.createElement('div');
                    tournamentElement.className = 'saved-tournament';
                    tournamentElement.innerHTML = `
                        <h3>${tournament.title}</h3>
                        <p><strong>Modo:</strong> ${tournament.mode === 'individual' ? 'Individual' : 'Por Equipos'}</p>
                        <p><strong>Jugadores/Equipos:</strong> ${tournament.mode === 'individual' ? tournament.players.length : tournament.teams.length}</p>
                        <p><strong>Progreso:</strong> Ronda ${tournament.currentRound} de ${tournament.totalRounds}</p>
                        <button class="delete-btn" onclick="deleteTournament('${key}', event)"><i class="fas fa-trash"></i> Eliminar</button>
                    `;

                    tournamentElement.addEventListener('click', function (e) {
                        if (!e.target.classList.contains('delete-btn')) {
                            continueSavedTournament(key);
                        }
                    });

                    container.appendChild(tournamentElement);
                }
            }

            if (!hasSavedTournaments) {
                container.innerHTML = `
                    <p style="text-align: center; color: var(--padel-gray); padding: 20px;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i><br>
                        No hay torneos guardados
                    </p>
                `;
            }
        }

        function continueSavedTournament(id) {
            const savedData = loadTournamentFromStorage(id);
            if (savedData) {
                tournamentData = savedData;
                // Asegurar que matchCounter esté inicializado
                if (!tournamentData.matchCounter) {
                    tournamentData.matchCounter = 0;
                    // Actualizar IDs de partidos si es necesario
                    tournamentData.rounds.forEach(round => {
                        round.matches.forEach(match => {
                            tournamentData.matchCounter = Math.max(tournamentData.matchCounter, parseInt(match.id.replace('match-', '')) || 0);
                        });
                    });
                }
                document.getElementById('tournament-title').textContent = tournamentData.title;
                document.getElementById('main-screen').classList.add('hidden');
                document.getElementById('tournament-screen').classList.remove('hidden');
                showRound(tournamentData.currentRound);
                updateStandings();
                updatePlayersTab();
                updateCycleInfo();
            }
        }

        function deleteTournament(id, event) {
            event.stopPropagation();
            if (confirm('¿Estás seguro de que deseas eliminar este torneo?')) {
                localStorage.removeItem(id);
                loadSavedTournaments();
            }
        }

        // Funciones para mostrar/ocultar modales
        function showIndividualModal() {
            document.getElementById('individual-modal').classList.add('active');
        }

        function showTeamModal() {
            document.getElementById('team-modal').classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        async function confirmIndividualTournament() {
            const auth = window.auth;
            const db = window.db;
            const user = auth.currentUser;
            const tokenResult = await user.getIdTokenResult();
            if (!tokenResult.claims?.admin) {
                alert("Solo admins pueden crear partidas");
                return;
            }

            const playerCount = parseInt(document.getElementById('player-count').value);
            const tournamentName = document.getElementById('tournament-name').value;

            const code = generateMatchCode();

            // Guardar torneo en Firestore
            await addDoc(collection(db, "matches"), {
                name: tournamentName || `Torneo Individual - ${playerCount} Jugadores`,
                type: "individual",
                players: [],
                createdBy: user.uid,
                code,
                status: "pending",
                createdAt: serverTimestamp(),
                playerCount
            });

            alert(`Partida creada con código: ${code}`);

            // Generar inputs para nombres de jugadores
            const container = document.getElementById('players-input-container');
            container.innerHTML = '';
            for (let i = 1; i <= playerCount; i++) {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-input';
                playerDiv.innerHTML = `<i class="fas fa-user"></i><input type="text" class="player-name" placeholder="Jugador ${i}" required>`;
                container.appendChild(playerDiv);
            }

            document.getElementById('players-title').textContent = `INGRESE NOMBRES DE ${playerCount} JUGADORES`;
            closeModal('individual-modal');
            document.getElementById('main-screen').classList.add('hidden');
            document.getElementById('players-screen').classList.remove('hidden');
        }

        async function confirmTeamTournament() {
            const auth = window.auth;
            const db = window.db;
            const user = auth.currentUser;
            const tokenResult = await user.getIdTokenResult();
            if (!tokenResult.claims?.admin) {
                alert("Solo admins pueden crear partidas");
                return;
            }

            const teamCount = parseInt(document.getElementById('team-count').value);
            const tournamentName = document.getElementById('team-tournament-name').value;

            const code = generateMatchCode();

            await addDoc(collection(db, "matches"), {
                name: tournamentName || `Torneo por Equipos - ${teamCount} Equipos`,
                type: "team",
                teams: [],
                createdBy: user.uid,
                code,
                status: "pending",
                createdAt: serverTimestamp(),
                teamCount
            });

            alert(`Partida creada con código: ${code}`);

            const container = document.getElementById('players-input-container');
            container.innerHTML = '';
            for (let i = 1; i <= teamCount; i++) {
                const teamDiv = document.createElement('div');
                teamDiv.className = 'player-input';
                teamDiv.innerHTML = `<i class="fas fa-users"></i><input type="text" class="player-name" placeholder="Equipo ${i}" required>`;
                container.appendChild(teamDiv);
            }

            document.getElementById('players-title').textContent = `INGRESE NOMBRES DE ${teamCount} EQUIPOS`;
            closeModal('team-modal');
            document.getElementById('main-screen').classList.add('hidden');
            document.getElementById('players-screen').classList.remove('hidden');
        }

        // Volver al menú principal
        function goBackToMain() {
            document.getElementById('players-screen').classList.add('hidden');
            document.getElementById('main-screen').classList.remove('hidden');
        }

        function goBackToMainFromTournament() {
            if (confirm('¿Volver al menú principal? Los cambios se guardarán automáticamente.')) {
                saveTournamentToStorage();
                document.getElementById('tournament-screen').classList.add('hidden');
                document.getElementById('main-screen').classList.remove('hidden');
                loadSavedTournaments();
            }
        }
        function generateMatchCode(length = 6) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < length; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }
        // Comenzar el torneo
        function startTournament() {
            // Obtener nombres de jugadores/equipos
            const nameInputs = document.querySelectorAll('.player-name');
            const names = Array.from(nameInputs).map(input => input.value.trim());

            // Validar que todos los nombres estén completos
            if (names.some(name => name === '')) {
                alert('Por favor, ingresa todos los nombres');
                return;
            }

            // Guardar en tournamentData
            if (tournamentData.mode === 'individual') {
                tournamentData.players = names.map(name => ({
                    name: name,
                    pg: 0, // Partidos ganados
                    pe: 0, // Partidos empatados
                    pp: 0, // Partidos perdidos
                    pf: 0, // Puntos a favor (goles marcados)
                    pc: 0, // Puntos en contra (goles recibidos)
                    diff: 0, // Diferencia (pf - pc)
                    points: 0 // Puntos totales
                }));
            } else {
                tournamentData.teams = names.map(name => ({
                    name: name,
                    pg: 0,
                    pe: 0,
                    pp: 0,
                    pf: 0,
                    pc: 0,
                    diff: 0,
                    points: 0
                }));
            }

            // Inicializar contador de partidos
            tournamentData.matchCounter = 0;

            // Generar todas las rondas
            generateRounds();

            // Actualizar interfaz
            document.getElementById('tournament-title').textContent = tournamentData.title;
            document.getElementById('players-screen').classList.add('hidden');
            document.getElementById('tournament-screen').classList.remove('hidden');
            showRound(1);
            updateStandings();
            updatePlayersTab();
            updateCycleInfo();

            // Guardar en localStorage
            saveTournamentToStorage();
        }

        // Generar ID único para partidos
        function generateMatchId() {
            tournamentData.matchCounter++;
            return `match-${tournamentData.matchCounter}`;
        }

        // Generar las rondas basadas en la información proporcionada
        function generateRounds() {
            if (tournamentData.mode === 'individual') {
                const playerNames = tournamentData.players.map(p => p.name);
                const playerCount = playerNames.length;

                tournamentData.rounds = [];

                // Generar rondas para diferentes cantidades de jugadores
                if (playerCount === 4) {
                    tournamentData.rounds = generateRoundRobin4Players(playerNames);
                } else if (playerCount === 5) {
                    tournamentData.rounds = generateRoundRobin5Players(playerNames);
                } else if (playerCount === 6) {
                    tournamentData.rounds = generateRoundRobin6Players(playerNames);
                } else if (playerCount === 7) {
                    tournamentData.rounds = generateRoundRobin7Players(playerNames);
                } else if (playerCount === 8) {
                    tournamentData.rounds = generateRoundRobin8Players(playerNames);
                } else if (playerCount === 9) {
                    tournamentData.rounds = generateRoundRobin9Players(playerNames);
                } else if (playerCount === 10) {
                    tournamentData.rounds = generateRoundRobin10Players(playerNames);
                }

                tournamentData.totalRounds = tournamentData.rounds.length;
            } else {
                // Lógica para torneo por equipos (simplificada)
                const teamNames = tournamentData.teams.map(t => t.name);
                tournamentData.rounds = [];
                tournamentData.totalRounds = teamNames.length - 1;

                for (let i = 0; i < tournamentData.totalRounds; i++) {
                    const matches = [];
                    const resting = [];

                    // Calcular equipos en descanso
                    const restCount = teamNames.length % 2;
                    if (restCount > 0) {
                        resting.push(teamNames[teamNames.length - 1]);
                    }

                    // Equipos que participan
                    const playingTeams = restCount > 0 ? teamNames.slice(0, teamNames.length - restCount) : teamNames;

                    // Crear partidos
                    for (let j = 0; j < playingTeams.length; j += 2) {
                        matches.push({
                            id: generateMatchId(),
                            team1: playingTeams[j],
                            team2: playingTeams[j + 1],
                            score1: 0,
                            score2: 0,
                            played: false
                        });
                    }

                    tournamentData.rounds.push({
                        matches: matches,
                        resting: resting
                    });

                    // Rotar equipos para la siguiente ronda
                    teamNames.splice(1, 0, teamNames.pop());
                }
            }
        }

        // Funciones para generar rondas round-robin para diferentes cantidades de jugadores
        function generateRoundRobin4Players(playerNames) {
            return [
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[1]}`,
                            team2: `${playerNames[2]} & ${playerNames[3]}`,
                            players1: [playerNames[0], playerNames[1]],
                            players2: [playerNames[2], playerNames[3]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: []
                },
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[2]}`,
                            team2: `${playerNames[1]} & ${playerNames[3]}`,
                            players1: [playerNames[0], playerNames[2]],
                            players2: [playerNames[1], playerNames[3]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: []
                },
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[3]}`,
                            team2: `${playerNames[1]} & ${playerNames[2]}`,
                            players1: [playerNames[0], playerNames[3]],
                            players2: [playerNames[1], playerNames[2]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: []
                }
            ];
        }

        function generateRoundRobin5Players(playerNames) {
            return [
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[1]}`,
                            team2: `${playerNames[2]} & ${playerNames[3]}`,
                            players1: [playerNames[0], playerNames[1]],
                            players2: [playerNames[2], playerNames[3]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[4]]
                },
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[2]}`,
                            team2: `${playerNames[3]} & ${playerNames[4]}`,
                            players1: [playerNames[0], playerNames[2]],
                            players2: [playerNames[3], playerNames[4]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[1]]
                },
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[4]}`,
                            team2: `${playerNames[1]} & ${playerNames[2]}`,
                            players1: [playerNames[0], playerNames[4]],
                            players2: [playerNames[1], playerNames[2]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[3]]
                },
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[1]} & ${playerNames[4]}`,
                            team2: `${playerNames[2]} & ${playerNames[3]}`,
                            players1: [playerNames[1], playerNames[4]],
                            players2: [playerNames[2], playerNames[3]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[0]]
                },
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[3]}`,
                            team2: `${playerNames[1]} & ${playerNames[4]}`,
                            players1: [playerNames[0], playerNames[3]],
                            players2: [playerNames[1], playerNames[4]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[2]]
                }
            ];
        }

        function generateRoundRobin6Players(playerNames) {
            return [
                // Ronda 1: (5,6) vs (2,1)
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[4]} & ${playerNames[5]}`,
                            team2: `${playerNames[1]} & ${playerNames[0]}`,
                            players1: [playerNames[4], playerNames[5]],
                            players2: [playerNames[1], playerNames[0]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[2], playerNames[3]]
                },
                // Ronda 2: (4,2) vs (1,3)
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[3]} & ${playerNames[1]}`,
                            team2: `${playerNames[0]} & ${playerNames[2]}`,
                            players1: [playerNames[3], playerNames[1]],
                            players2: [playerNames[0], playerNames[2]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[4], playerNames[5]]
                },
                // Ronda 3: (3,4) vs (5,2)
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[2]} & ${playerNames[3]}`,
                            team2: `${playerNames[4]} & ${playerNames[1]}`,
                            players1: [playerNames[2], playerNames[3]],
                            players2: [playerNames[4], playerNames[1]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[0], playerNames[5]]
                },
                // Ronda 4: (2,3) vs (6,4)
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[1]} & ${playerNames[2]}`,
                            team2: `${playerNames[5]} & ${playerNames[3]}`,
                            players1: [playerNames[1], playerNames[2]],
                            players2: [playerNames[5], playerNames[3]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[0], playerNames[4]]
                },
                // Ronda 5: (6,1) vs (4,5)
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[5]} & ${playerNames[0]}`,
                            team2: `${playerNames[3]} & ${playerNames[4]}`,
                            players1: [playerNames[5], playerNames[0]],
                            players2: [playerNames[3], playerNames[4]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[1], playerNames[2]]
                },
                // Ronda 6: (1,5) vs (3,6)
                {
                    matches: [
                        {
                            id: generateMatchId(),
                            team1: `${playerNames[0]} & ${playerNames[4]}`,
                            team2: `${playerNames[2]} & ${playerNames[5]}`,
                            players1: [playerNames[0], playerNames[4]],
                            players2: [playerNames[2], playerNames[5]],
                            score1: 0,
                            score2: 0,
                            played: false
                        }
                    ],
                    resting: [playerNames[1], playerNames[3]]
                }
            ];
        }

        function generateRoundRobin7Players(playerNames) {
            // Implementación para 7 jugadores
            const rounds = [];
            for (let i = 0; i < 7; i++) {
                const matches = [];
                const resting = [];

                // Calcular jugadores en descanso (2 por ronda)
                resting.push(playerNames[i % 7]);
                resting.push(playerNames[(i + 1) % 7]);

                // Jugadores que participan
                const playingPlayers = playerNames.filter(p => !resting.includes(p));

                // Crear partidos
                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[0]} & ${playingPlayers[1]}`,
                    team2: `${playingPlayers[2]} & ${playingPlayers[3]}`,
                    players1: [playingPlayers[0], playingPlayers[1]],
                    players2: [playingPlayers[2], playingPlayers[3]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                rounds.push({
                    matches: matches,
                    resting: resting
                });
            }
            return rounds;
        }

        function generateRoundRobin8Players(playerNames) {
            // Implementación para 8 jugadores
            const rounds = [];
            for (let i = 0; i < 7; i++) {
                const matches = [];
                const resting = [];

                // Calcular jugadores en descanso (ninguno para 8 jugadores)
                // Jugadores que participan
                const playingPlayers = [...playerNames];

                // Crear partidos (2 partidos por ronda)
                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[0]} & ${playingPlayers[1]}`,
                    team2: `${playingPlayers[2]} & ${playingPlayers[3]}`,
                    players1: [playingPlayers[0], playingPlayers[1]],
                    players2: [playingPlayers[2], playingPlayers[3]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[4]} & ${playingPlayers[5]}`,
                    team2: `${playingPlayers[6]} & ${playingPlayers[7]}`,
                    players1: [playingPlayers[4], playingPlayers[5]],
                    players2: [playingPlayers[6], playingPlayers[7]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                rounds.push({
                    matches: matches,
                    resting: resting
                });

                // Rotar jugadores para la siguiente ronda
                playerNames.push(playerNames.shift());
            }
            return rounds;
        }

        function generateRoundRobin9Players(playerNames) {
            // Implementación para 9 jugadores
            const rounds = [];
            for (let i = 0; i < 9; i++) {
                const matches = [];
                const resting = [];

                // Calcular jugadores en descanso (1 por ronda)
                resting.push(playerNames[i % 9]);

                // Jugadores que participan
                const playingPlayers = playerNames.filter(p => !resting.includes(p));

                // Crear partidos (2 partidos por ronda)
                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[0]} & ${playingPlayers[1]}`,
                    team2: `${playingPlayers[2]} & ${playingPlayers[3]}`,
                    players1: [playingPlayers[0], playingPlayers[1]],
                    players2: [playingPlayers[2], playingPlayers[3]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[4]} & ${playingPlayers[5]}`,
                    team2: `${playingPlayers[6]} & ${playingPlayers[7]}`,
                    players1: [playingPlayers[4], playingPlayers[5]],
                    players2: [playingPlayers[6], playingPlayers[7]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                rounds.push({
                    matches: matches,
                    resting: resting
                });
            }
            return rounds;
        }

        function generateRoundRobin10Players(playerNames) {
            // Implementación para 10 jugadores
            const rounds = [];
            for (let i = 0; i < 9; i++) {
                const matches = [];
                const resting = [];

                // Calcular jugadores en descanso (ninguno para 10 jugadores)
                // Jugadores que participan
                const playingPlayers = [...playerNames];

                // Crear partidos (2 partidos por ronda)
                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[0]} & ${playingPlayers[1]}`,
                    team2: `${playingPlayers[2]} & ${playingPlayers[3]}`,
                    players1: [playingPlayers[0], playingPlayers[1]],
                    players2: [playingPlayers[2], playingPlayers[3]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[4]} & ${playingPlayers[5]}`,
                    team2: `${playingPlayers[6]} & ${playingPlayers[7]}`,
                    players1: [playingPlayers[4], playingPlayers[5]],
                    players2: [playingPlayers[6], playingPlayers[7]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                matches.push({
                    id: generateMatchId(),
                    team1: `${playingPlayers[8]} & ${playingPlayers[9]}`,
                    team2: `${playingPlayers[0]} & ${playingPlayers[2]}`,
                    players1: [playingPlayers[8], playingPlayers[9]],
                    players2: [playingPlayers[0], playingPlayers[2]],
                    score1: 0,
                    score2: 0,
                    played: false
                });

                rounds.push({
                    matches: matches,
                    resting: resting
                });

                // Rotar jugadores para la siguiente ronda
                playerNames.push(playerNames.shift());
            }
            return rounds;
        }

        // Generar nuevas rondas para una nueva jornada
        function generateNewCycleRounds() {
            if (tournamentData.mode === 'individual') {
                const playerNames = tournamentData.players.map(p => p.name);
                const playerCount = playerNames.length;
                let newRounds = [];

                // Generar nuevas rondas para la nueva jornada
                if (playerCount === 4) {
                    newRounds = generateRoundRobin4Players(playerNames);
                } else if (playerCount === 5) {
                    newRounds = generateRoundRobin5Players(playerNames);
                } else if (playerCount === 6) {
                    newRounds = generateRoundRobin6Players(playerNames);
                } else if (playerCount === 7) {
                    newRounds = generateRoundRobin7Players(playerNames);
                } else if (playerCount === 8) {
                    newRounds = generateRoundRobin8Players(playerNames);
                } else if (playerCount === 9) {
                    newRounds = generateRoundRobin9Players(playerNames);
                } else if (playerCount === 10) {
                    newRounds = generateRoundRobin10Players(playerNames);
                }

                // Agregar las nuevas rondas a las existentes
                tournamentData.rounds = [...tournamentData.rounds, ...newRounds];
                tournamentData.totalRounds = tournamentData.rounds.length;
            } else {
                // Lógica similar para torneos por equipos
                const teamNames = tournamentData.teams.map(t => t.name);
                const newRounds = [];

                // Crear nuevas rondas usando el método round-robin
                for (let i = 0; i < teamNames.length - 1; i++) {
                    const matches = [];
                    const resting = [];

                    // Calcular equipos en descanso
                    const restCount = teamNames.length % 2;
                    if (restCount > 0) {
                        resting.push(teamNames[teamNames.length - 1]);
                    }

                    // Equipos que participan
                    const playingTeams = restCount > 0 ? teamNames.slice(0, teamNames.length - restCount) : teamNames;

                    // Crear partidos
                    for (let j = 0; j < playingTeams.length; j += 2) {
                        matches.push({
                            id: generateMatchId(),
                            team1: playingTeams[j],
                            team2: playingTeams[j + 1],
                            score1: 0,
                            score2: 0,
                            played: false
                        });
                    }

                    newRounds.push({
                        matches: matches,
                        resting: resting
                    });

                    // Rotar equipos para la siguiente ronda
                    teamNames.splice(1, 0, teamNames.pop());
                }

                // Agregar las nuevas rondas a las existentes
                tournamentData.rounds = [...tournamentData.rounds, ...newRounds];
                tournamentData.totalRounds = tournamentData.rounds.length;
            }
        }

        // Actualizar navegación de rondas
        function updateRoundNav() {
            const roundNav = document.getElementById('round-nav');
            roundNav.innerHTML = '';

            for (let i = 1; i <= tournamentData.totalRounds; i++) {
                const roundBtn = document.createElement('div');
                roundBtn.className = `round-btn ${i === tournamentData.currentRound ? 'active' : ''}`;
                roundBtn.textContent = i;
                roundBtn.onclick = () => showRound(i);
                roundNav.appendChild(roundBtn);
            }
        }

        // Actualizar información del ciclo actual
        function updateCycleInfo() {
            document.getElementById('cycle-info').textContent = `Jornada ${tournamentData.currentCycle} de ${tournamentData.totalCycles}`;
        }

        // Mostrar una ronda específica
        function showRound(roundNumber) {
            tournamentData.currentRound = roundNumber;
            updateRoundNav();
            updateMatchesTab();
        }

        // Actualizar pestaña de partidos
        function updateMatchesTab() {
            const matchesContainer = document.getElementById('matches-container');
            const restingPlayersContainer = document.getElementById('resting-players-container');
            matchesContainer.innerHTML = '';
            restingPlayersContainer.innerHTML = '';

            const currentRound = tournamentData.rounds[tournamentData.currentRound - 1];

            if (!currentRound) return;

            // Mostrar partidos
            currentRound.matches.forEach((match, index) => {
                const matchCard = document.createElement('div');
                matchCard.className = 'match-card';

                // Determinar si hay un ganador para este partido
                if (match.score1 > match.score2) {
                    matchCard.classList.add('winner-1');
                } else if (match.score1 < match.score2) {
                    matchCard.classList.add('winner-2');
                } else if (match.score1 > 0 || match.score2 > 0) {
                    matchCard.classList.add('draw');
                }

                matchCard.innerHTML = `
                    <div class="winner-badge team1">${match.team1} gana</div>
                    <div class="winner-badge team2">${match.team2} gana</div>
                    <div class="match-header">
                        <div class="match-title">Partido ${index + 1}</div>
                        <div class="match-court">Pista ${index + 1}</div>
                    </div>
                    <div class="teams-container">
                        <div class="team">
                            <div class="team-name">${match.team1}</div>
                            ${tournamentData.mode === 'individual' ?
                        `<div class="team-players">${match.players1 ? match.players1.join(' & ') : 'Jugadores'}</div>` : ''}
                            <div class="score-container">
                                <button class="score-btn" onclick="adjustScore('${match.id}', 'score1', -1)">-</button>
                                <input type="number" class="score-input" value="${match.score1}" min="0" max="99" 
                                    onchange="updateScore('${match.id}', 'score1', this.value)">
                                <button class="score-btn" onclick="adjustScore('${match.id}', 'score1', 1)">+</button>
                            </div>
                        </div>
                        <div class="vs">VS</div>
                        <div class="team">
                            <div class="team-name">${match.team2}</div>
                            ${tournamentData.mode === 'individual' ?
                        `<div class="team-players">${match.players2 ? match.players2.join(' & ') : 'Jugadores'}</div>` : ''}
                            <div class="score-container">
                                <button class="score-btn" onclick="adjustScore('${match.id}', 'score2', -1)">-</button>
                                <input type="number" class="score-input" value="${match.score2}" min="0" max="99" 
                                    onchange="updateScore('${match.id}', 'score2', this.value)">
                                <button class="score-btn" onclick="adjustScore('${match.id}', 'score2', 1)">+</button>
                            </div>
                        </div>
                    </div>
                `;
                matchesContainer.appendChild(matchCard);
            });

            // Mostrar jugadores/equipos que descansan
            if (currentRound.resting && currentRound.resting.length > 0) {
                currentRound.resting.forEach(player => {
                    const playerElement = document.createElement('div');
                    playerElement.className = 'rest-player';
                    playerElement.textContent = player;
                    restingPlayersContainer.appendChild(playerElement);
                });
            }
        }

        // Ajustar puntuación con botones
        function adjustScore(matchId, scoreType, value) {
            for (let round of tournamentData.rounds) {
                const matchIndex = round.matches.findIndex(m => m.id === matchId);
                if (matchIndex !== -1) {
                    const currentValue = round.matches[matchIndex][scoreType];
                    const newValue = Math.max(0, currentValue + value);

                    round.matches[matchIndex][scoreType] = newValue;
                    round.matches[matchIndex].played = newValue > 0 || round.matches[matchIndex][scoreType === 'score1' ? 'score2' : 'score1'] > 0;

                    // Actualizar la interfaz
                    updateStandings();
                    updateMatchesTab();
                    saveTournamentToStorage();
                    break;
                }
            }
        }

        // Actualizar puntuación de un partido
        function updateScore(matchId, scoreType, value) {
            for (let round of tournamentData.rounds) {
                const matchIndex = round.matches.findIndex(m => m.id === matchId);
                if (matchIndex !== -1) {
                    round.matches[matchIndex][scoreType] = parseInt(value) || 0;
                    round.matches[matchIndex].played = round.matches[matchIndex].score1 > 0 || round.matches[matchIndex].score2 > 0;
                    updateStandings();
                    updateMatchesTab();
                    saveTournamentToStorage();
                    break;
                }
            }
        }

        // Actualizar tabla de clasificación
        function updateStandings() {
            // Resetear estadísticas
            if (tournamentData.mode === 'individual') {
                tournamentData.players.forEach(player => {
                    player.pg = 0;
                    player.pe = 0;
                    player.pp = 0;
                    player.pf = 0;
                    player.pc = 0;
                    player.diff = 0;
                    player.points = 0;
                });
            } else {
                tournamentData.teams.forEach(team => {
                    team.pg = 0;
                    team.pe = 0;
                    team.pp = 0;
                    team.pf = 0;
                    team.pc = 0;
                    team.diff = 0;
                    team.points = 0;
                });
            }

            // Calcular estadísticas basadas en todos los partidos jugados
            tournamentData.rounds.forEach(round => {
                round.matches.forEach(match => {
                    const score1 = match.score1;
                    const score2 = match.score2;

                    // Solo procesar partidos que se hayan jugado (al menos un punto)
                    if (score1 === 0 && score2 === 0) return;

                    if (tournamentData.mode === 'individual') {
                        // Actualizar estadísticas para cada jugador individualmente
                        const players1 = match.players1;
                        const players2 = match.players2;

                        players1.forEach(playerName => {
                            const player = tournamentData.players.find(p => p.name === playerName);
                            if (player) {
                                player.pf += score1;
                                player.pc += score2;
                                player.diff = player.pf - player.pc;

                                if (score1 > score2) {
                                    player.pg++;
                                    player.points += 3;
                                } else if (score1 < score2) {
                                    player.pp++;
                                } else {
                                    player.pe++;
                                    player.points += 1;
                                }
                            }
                        });

                        players2.forEach(playerName => {
                            const player = tournamentData.players.find(p => p.name === playerName);
                            if (player) {
                                player.pf += score2;
                                player.pc += score1;
                                player.diff = player.pf - player.pc;

                                if (score2 > score1) {
                                    player.pg++;
                                    player.points += 3;
                                } else if (score2 < score1) {
                                    player.pp++;
                                } else {
                                    player.pe++;
                                    player.points += 1;
                                }
                            }
                        });
                    } else {
                        // Modo por equipos
                        const team1 = tournamentData.teams.find(t => t.name === match.team1);
                        const team2 = tournamentData.teams.find(t => t.name === match.team2);

                        if (team1 && team2) {
                            team1.pf += score1;
                            team1.pc += score2;
                            team2.pf += score2;
                            team2.pc += score1;

                            team1.diff = team1.pf - team1.pc;
                            team2.diff = team2.pf - team2.pc;

                            if (score1 > score2) {
                                team1.pg++;
                                team1.points += 3;
                                team2.pp++;
                            } else if (score1 < score2) {
                                team1.pp++;
                                team2.pg++;
                                team2.points += 3;
                            } else {
                                team1.pe++;
                                team2.pe++;
                                team1.points += 1;
                                team2.points += 1;
                            }
                        }
                    }
                });
            });

            // Actualizar tabla
            updateStandingsTable();
        }

        // Actualizar tabla de clasificación
        function updateStandingsTable() {
            const sortBy = document.querySelector('.filter-btn.active')?.dataset.sort || 'points';
            let participants;

            if (tournamentData.mode === 'individual') {
                participants = [...tournamentData.players];
            } else {
                participants = [...tournamentData.teams];
            }

            if (sortBy === 'points') {
                participants.sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.diff !== a.diff) return b.diff - a.diff;
                    return b.pf - a.pf;
                });
            } else if (sortBy === 'diff') {
                participants.sort((a, b) => {
                    if (b.diff !== a.diff) return b.diff - a.diff;
                    if (b.points !== a.points) return b.points - a.points;
                    return b.pf - a.pf;
                });
            } else if (sortBy === 'pg') {
                participants.sort((a, b) => {
                    if (b.pg !== a.pg) return b.pg - a.pg;
                    if (b.points !== a.points) return b.points - a.points;
                    return b.diff - a.diff;
                });
            }

            const tbody = document.getElementById('standings-body');
            tbody.innerHTML = '';

            participants.forEach((participant, index) => {
                const row = document.createElement('tr');

                let rowClass = '';
                if (index === 0) rowClass = 'pos-1';
                else if (index === 1) rowClass = 'pos-2';
                else if (index === 2) rowClass = 'pos-3';

                row.className = rowClass;
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${participant.name}</td>
                    <td>${participant.pg + participant.pe + participant.pp}</td>
                    <td>${participant.pg}</td>
                    <td>${participant.pe}</td>
                    <td>${participant.pp}</td>
                    <td>${participant.pf}</td>
                    <td>${participant.pc}</td>
                    <td>${participant.diff > 0 ? '+' : ''}${participant.diff}</td>
                    <td><strong>${participant.points}</strong></td>
                `;
                tbody.appendChild(row);
            });
        }

        // Actualizar pestaña de jugadores
        function updatePlayersTab() {
            const container = document.getElementById('players-container');
            container.innerHTML = '';

            let participants;

            if (tournamentData.mode === 'individual') {
                participants = [...tournamentData.players];
            } else {
                participants = [...tournamentData.teams];
            }

            // Ordenar por puntos
            const sortedParticipants = [...participants].sort((a, b) => b.points - a.points);

            sortedParticipants.forEach(participant => {
                const playerCard = document.createElement('div');
                playerCard.className = 'player-card';

                if (tournamentData.mode === 'individual') {
                    playerCard.innerHTML = `
                        <h3>${participant.name}</h3>
                        <p>${participant.pg} V - ${participant.pe} E - ${participant.pp} D</p>
                        <p>GF: <span class="stats-highlight">${participant.pf}</span> | GC: ${participant.pc} | Dif: ${participant.diff > 0 ? '+' : ''}${participant.diff}</p>
                        <p>Puntos: <strong>${participant.points}</strong></p>
                    `;
                } else {
                    playerCard.innerHTML = `
                        <h3>${participant.name}</h3>
                        <p>${participant.pg} V - ${participant.pe} E - ${participant.pp} D</p>
                        <p>GF: <span class="stats-highlight">${participant.pf}</span> | GC: ${participant.pc} | Dif: ${participant.diff > 0 ? '+' : ''}${participant.diff}</p>
                        <p>Puntos: <strong>${participant.points}</strong></p>
                    `;
                }
                container.appendChild(playerCard);
            });
        }

        // Avanzar a la siguiente ronda
        function nextRound() {
            if (tournamentData.currentRound < tournamentData.totalRounds) {
                showRound(tournamentData.currentRound + 1);
                saveTournamentToStorage();
            } else {
                alert('¡Has completado todas las rondas de esta jornada!');
            }
        }

        // Finalizar jornada
        function finishTournament() {
            alert('Jornada finalizada. Los puntos se mantendrán para la siguiente jornada.');
            saveTournamentToStorage();
        }

        // Continuar con nueva jornada - FUNCIÓN CORREGIDA
        function continueTournament() {
            // Incrementar el número de ciclo/jornada
            tournamentData.currentCycle++;

            // Guardar el estado actual de los participantes con sus estadísticas
            const currentParticipants = tournamentData.mode === 'individual'
                ? JSON.parse(JSON.stringify(tournamentData.players))
                : JSON.parse(JSON.stringify(tournamentData.teams));

            // Generar nuevas rondas para la nueva jornada
            generateNewCycleRounds();

            // Restaurar las estadísticas de los participantes
            if (tournamentData.mode === 'individual') {
                tournamentData.players.forEach(player => {
                    const existingPlayer = currentParticipants.find(p => p.name === player.name);
                    if (existingPlayer) {
                        player.pg = existingPlayer.pg;
                        player.pe = existingPlayer.pe;
                        player.pp = existingPlayer.pp;
                        player.pf = existingPlayer.pf;
                        player.pc = existingPlayer.pc;
                        player.diff = existingPlayer.diff;
                        player.points = existingPlayer.points;
                    }
                });
            } else {
                tournamentData.teams.forEach(team => {
                    const existingTeam = currentParticipants.find(t => t.name === team.name);
                    if (existingTeam) {
                        team.pg = existingTeam.pg;
                        team.pe = existingTeam.pe;
                        team.pp = existingTeam.pp;
                        team.pf = existingTeam.pf;
                        team.pc = existingTeam.pc;
                        team.diff = existingTeam.diff;
                        team.points = existingTeam.points;
                    }
                });
            }

            // Reiniciar la ronda actual a la primera de la nueva jornada
            tournamentData.currentRound = 1;

            alert(`¡Nueva jornada ${tournamentData.currentCycle} iniciada! Los puntos se mantienen.`);
            updateCycleInfo();
            showRound(1);
            updateStandings();
            saveTournamentToStorage();
        }

        // Guardar torneo
        function saveTournament() {
            saveTournamentToStorage();
            alert('Progreso guardado correctamente');
        }
 
        
});