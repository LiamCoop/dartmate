class DartMate {
    constructor() {
        this.socket = io();
        this.currentRoomId = null;
        this.currentPlayerId = null;
        this.playerName = null;
        this.gameState = null;
        this.players = [];
        
        this.initializeEventListeners();
        this.initializeSocketListeners();
    }
    
    initializeEventListeners() {
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('submit-visit-btn').addEventListener('click', () => this.submitVisit());
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        
        document.querySelectorAll('.dart-inputs input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitVisit();
                }
            });
        });
    }
    
    initializeSocketListeners() {
        this.socket.on('joined-room', (data) => {
            console.log('Joined room:', data);
            this.showRoomScreen();
        });
        
        this.socket.on('player-joined', (data) => {
            console.log('Player joined:', data);
            this.loadRoomData();
        });
        
        this.socket.on('room-state', (data) => {
            console.log('Room state:', data);
            this.updateGameState(data);
        });
        
        this.socket.on('visit-recorded', (data) => {
            console.log('Visit recorded:', data);
            this.addLogEntry(`${data.playerName}: ${data.dart1}, ${data.dart2}, ${data.dart3} = ${data.total} (${data.newScore} remaining)`);
            this.clearDartInputs();
        });
        
        this.socket.on('turn-changed', (data) => {
            console.log('Turn changed:', data);
            this.updateCurrentPlayer(data.currentPlayerId, data.currentPlayerName);
        });
        
        this.socket.on('game-finished', (data) => {
            console.log('Game finished:', data);
            this.showGameFinishedScreen(data.winnerName);
        });
        
        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
            this.showError(data.message);
        });
    }
    
    async createRoom() {
        try {
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('room-id-input').value = data.roomId;
                this.showError('Room created! Share the Room ID with other players.');
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to create room');
        }
    }
    
    async joinRoom() {
        const roomId = document.getElementById('room-id-input').value.trim();
        const playerName = document.getElementById('player-name-input').value.trim();
        
        if (!roomId || !playerName) {
            this.showError('Please enter both Room ID and Player Name');
            return;
        }
        
        try {
            const response = await fetch(`/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ playerName })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentRoomId = data.roomId;
                this.currentPlayerId = data.playerId;
                this.playerName = data.playerName;
                
                this.socket.emit('join-room', {
                    roomId: this.currentRoomId,
                    playerId: this.currentPlayerId
                });
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to join room');
        }
    }
    
    async startGame() {
        try {
            const response = await fetch(`/api/rooms/${this.currentRoomId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showGameScreen();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to start game');
        }
    }
    
    submitVisit() {
        const dart1 = parseInt(document.getElementById('dart1').value) || 0;
        const dart2 = parseInt(document.getElementById('dart2').value) || 0;
        const dart3 = parseInt(document.getElementById('dart3').value) || 0;
        
        if (dart1 < 0 || dart1 > 180 || dart2 < 0 || dart2 > 180 || dart3 < 0 || dart3 > 180) {
            this.showError('Each dart score must be between 0 and 180');
            return;
        }
        
        this.socket.emit('submit-visit', { dart1, dart2, dart3 });
    }
    
    async loadRoomData() {
        try {
            const response = await fetch(`/api/rooms/${this.currentRoomId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.updateGameState(data);
            }
        } catch (error) {
            console.error('Failed to load room data:', error);
        }
    }
    
    updateGameState(data) {
        this.gameState = data.room.gameState;
        this.players = data.players;
        
        if (this.gameState === 'in-progress') {
            this.showGameScreen();
            this.updateScores();
            this.updateCurrentPlayer(data.room.currentPlayerId);
        } else if (this.gameState === 'finished') {
            const winner = this.players.find(p => p.id === data.room.winnerId);
            this.showGameFinishedScreen(winner ? winner.name : 'Unknown');
        } else {
            this.updatePlayersList();
        }
    }
    
    updatePlayersList() {
        const container = document.getElementById('players-container');
        container.innerHTML = '';
        
        this.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.textContent = player.name;
            container.appendChild(playerDiv);
        });
    }
    
    updateScores() {
        const container = document.getElementById('scores-container');
        container.innerHTML = '';
        
        this.players.forEach(player => {
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score-card';
            scoreDiv.innerHTML = `
                <h4>${player.name}</h4>
                <div class="score">${player.current_score}</div>
            `;
            container.appendChild(scoreDiv);
        });
    }
    
    updateCurrentPlayer(currentPlayerId, currentPlayerName) {
        const playerNameElement = document.getElementById('current-player-name');
        
        if (currentPlayerName) {
            playerNameElement.textContent = currentPlayerName;
        } else {
            const currentPlayer = this.players.find(p => p.id === currentPlayerId);
            playerNameElement.textContent = currentPlayer ? currentPlayer.name : '-';
        }
        
        document.querySelectorAll('.score-card').forEach(card => {
            card.classList.remove('current-turn');
        });
        
        const currentPlayerIndex = this.players.findIndex(p => p.id === currentPlayerId);
        if (currentPlayerIndex >= 0) {
            const scoreCards = document.querySelectorAll('.score-card');
            if (scoreCards[currentPlayerIndex]) {
                scoreCards[currentPlayerIndex].classList.add('current-turn');
            }
        }
        
        const isMyTurn = currentPlayerId === this.currentPlayerId;
        document.getElementById('submit-visit-btn').disabled = !isMyTurn;
        document.querySelectorAll('.dart-inputs input').forEach(input => {
            input.disabled = !isMyTurn;
        });
    }
    
    addLogEntry(message) {
        const container = document.getElementById('log-container');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }
    
    clearDartInputs() {
        document.getElementById('dart1').value = '';
        document.getElementById('dart2').value = '';
        document.getElementById('dart3').value = '';
    }
    
    showMainMenu() {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        document.getElementById('main-menu').classList.remove('hidden');
    }
    
    showRoomScreen() {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        document.getElementById('room-screen').classList.remove('hidden');
        document.getElementById('current-room-id').textContent = this.currentRoomId;
        this.loadRoomData();
    }
    
    showGameScreen() {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        document.getElementById('game-screen').classList.remove('hidden');
        this.updateScores();
    }
    
    showGameFinishedScreen(winnerName) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        document.getElementById('game-finished-screen').classList.remove('hidden');
        document.getElementById('winner-name').textContent = winnerName;
    }
    
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }
    
    newGame() {
        this.currentRoomId = null;
        this.currentPlayerId = null;
        this.playerName = null;
        this.gameState = null;
        this.players = [];
        
        document.getElementById('room-id-input').value = '';
        document.getElementById('player-name-input').value = '';
        document.getElementById('log-container').innerHTML = '';
        
        this.showMainMenu();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DartMate();
});