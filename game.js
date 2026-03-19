// Pipe types with their connections (North, East, South, West)
const PIPE_TYPES = {
    END: { connections: [true, false, false, false], name: 'end' },      // ╹
    STRAIGHT: { connections: [true, false, true, false], name: 'straight' }, // ║
    CORNER: { connections: [true, true, false, false], name: 'corner' },    // ╚
    T_JUNCTION: { connections: [true, true, true, false], name: 't' },      // ╠
    PLUS: { connections: [true, true, true, true], name: 'plus' }           // ╬
};

class PipePuzzle {
    constructor() {
        this.gridSize = 8;
        this.grid = [];
        this.sourcePos = null;
        this.moveCount = 0;
        this.hideUnpowered = false;
        this.wrapEdges = false;
        this.extraLoops = false;
        this.gameWon = false;
        this.lastClickedTile = null;
        this.bestScores = {}; // Stores best scores per grid size
        
        this.initializeElements();
        this.loadBestScores();
        this.attachEventListeners();
        
        // Try to load saved game if it wasn't won, otherwise start new game
        const savedData = localStorage.getItem('pipePuzzleSave');
        if (savedData) {
            try {
                const gameState = JSON.parse(savedData);
                if (!gameState.gameWon) {
                    this.loadGame();
                } else {
                    this.newGame();
                }
            } catch (error) {
                this.newGame();
            }
        } else {
            this.newGame();
        }
    }
    
    initializeElements() {
        this.gameBoard = document.getElementById('gameBoard');
        this.gridSizeInput = document.getElementById('gridSize');
        this.gridSizeValue = document.getElementById('gridSizeValue');
        this.moveCountEl = document.getElementById('moveCount');
        this.bestScoreEl = document.getElementById('bestScore');
        this.poweredCountEl = document.getElementById('poweredCount');
        this.totalCountEl = document.getElementById('totalCount');
        this.hideUnpoweredCheckbox = document.getElementById('hideUnpowered');
        this.wrapEdgesCheckbox = document.getElementById('wrapEdges');
        this.extraLoopsCheckbox = document.getElementById('extraLoops');
        this.winMessage = document.getElementById('winMessage');
        this.finalMovesEl = document.getElementById('finalMoves');
    }
    
    attachEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        
        this.gridSizeInput.addEventListener('input', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.gridSizeValue.textContent = `${this.gridSize}x${this.gridSize}`;
        });
        
        this.hideUnpoweredCheckbox.addEventListener('change', (e) => {
            this.hideUnpowered = e.target.checked;
            this.updateDisplay();
        });
        
        this.wrapEdgesCheckbox.addEventListener('change', (e) => {
            this.wrapEdges = e.target.checked;
        });
        
        this.extraLoopsCheckbox.addEventListener('change', (e) => {
            this.extraLoops = e.target.checked;
        });
    }
    
    newGame() {
        this.moveCount = 0;
        this.gameWon = false;
        this.lastClickedTile = null;
        this.winMessage.classList.add('hidden');
        this.generateSolvableGrid();
        this.updateDisplay();
        this.updateBestScoreDisplay();
        this.saveGame();
    }
    
    saveGame() {
        const gameState = {
            gridSize: this.gridSize,
            grid: this.grid,
            sourcePos: this.sourcePos,
            moveCount: this.moveCount,
            hideUnpowered: this.hideUnpowered,
            wrapEdges: this.wrapEdges,
            extraLoops: this.extraLoops,
            gameWon: this.gameWon,
            lastClickedTile: this.lastClickedTile
        };
        
        localStorage.setItem('pipePuzzleSave', JSON.stringify(gameState));
    }
    
    loadGame() {
        const savedData = localStorage.getItem('pipePuzzleSave');
        
        if (!savedData) {
            alert('No saved game found!');
            return;
        }
        
        try {
            const gameState = JSON.parse(savedData);
            
            this.gridSize = gameState.gridSize;
            this.grid = gameState.grid;
            this.sourcePos = gameState.sourcePos;
            this.moveCount = gameState.moveCount;
            this.hideUnpowered = gameState.hideUnpowered;
            this.wrapEdges = gameState.wrapEdges;
            this.extraLoops = gameState.extraLoops;
            this.gameWon = gameState.gameWon || false;
            this.lastClickedTile = gameState.lastClickedTile || null;
            
            // Update UI controls
            this.gridSizeInput.value = this.gridSize;
            this.gridSizeValue.textContent = `${this.gridSize}x${this.gridSize}`;
            this.hideUnpoweredCheckbox.checked = this.hideUnpowered;
            this.wrapEdgesCheckbox.checked = this.wrapEdges;
            this.extraLoopsCheckbox.checked = this.extraLoops;
            
            this.winMessage.classList.add('hidden');
            this.calculatePower();
            this.updateDisplay();
            this.updateBestScoreDisplay();
        } catch (error) {
            alert('Error loading saved game!');
            console.error(error);
        }
    }
    
    loadBestScores() {
        const savedScores = localStorage.getItem('pipePuzzleBestScores');
        if (savedScores) {
            try {
                this.bestScores = JSON.parse(savedScores);
            } catch (error) {
                this.bestScores = {};
            }
        }
    }
    
    saveBestScores() {
        localStorage.setItem('pipePuzzleBestScores', JSON.stringify(this.bestScores));
    }
    
    updateBestScoreDisplay() {
        const bestScore = this.bestScores[this.gridSize];
        this.bestScoreEl.textContent = bestScore !== undefined ? bestScore : '-';
    }
    
    generateSolvableGrid() {
        // Generate a fully connected grid using a spanning tree approach
        this.grid = [];
        
        // Initialize empty grid
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col] = {
                    type: null,
                    rotation: 0,
                    powered: false,
                    isSource: false,
                    connections: [false, false, false, false] // N, E, S, W
                };
            }
        }
        
        // Pick random source position
        this.sourcePos = {
            row: Math.floor(Math.random() * this.gridSize),
            col: Math.floor(Math.random() * this.gridSize)
        };
        this.grid[this.sourcePos.row][this.sourcePos.col].isSource = true;
        
        // Generate spanning tree using randomized DFS
        const visited = new Set();
        const stack = [this.sourcePos];
        visited.add(`${this.sourcePos.row},${this.sourcePos.col}`);
        
        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current.row, current.col, visited);
            
            if (neighbors.length === 0) {
                stack.pop();
                continue;
            }
            
            // Pick random number of neighbors (1 to all available)
            let numToConnect = Math.floor(Math.random() * neighbors.length) + 1;

            if (neighbors.length !== 4)
            {
                while (numToConnect < neighbors.length && Math.random() > 0.5) 
                {
                    numToConnect = numToConnect + 1; // Occasionally connect more neighbors to create more complex paths
                }
            }
            
            // Shuffle neighbors and take the first numToConnect
            const shuffled = [...neighbors].sort(() => Math.random() - 0.5);
            const toConnect = shuffled.slice(0, numToConnect);
            
            // Connect to all selected neighbors
            for (const next of toConnect) {
                visited.add(`${next.row},${next.col}`);
                this.connectTiles(current, next);
                stack.push(next);
            }
        }
        
        // Add extra connections to create more complex pipes (T-junctions and pluses)
        // This reduces the number of end pieces
        if (this.extraLoops) {
            const extraConnections = Math.floor(this.gridSize * this.gridSize * 0.15); // 15% extra connections
            for (let i = 0; i < extraConnections; i++) {
                const row = Math.floor(Math.random() * this.gridSize);
                const col = Math.floor(Math.random() * this.gridSize);
                
                // Get all possible neighbors (including already connected ones)
                const allNeighbors = this.getAllNeighbors(row, col);
                if (allNeighbors.length > 0) {
                    const neighbor = allNeighbors[Math.floor(Math.random() * allNeighbors.length)];
                    // Only connect if not already connected
                    if (!this.areConnected({row, col}, neighbor)) {
                        this.connectTiles({row, col}, neighbor);
                    }
                }
            }
        }
        
        // Convert connections to pipe types
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col].type = this.getPipeTypeFromConnections(
                    this.grid[row][col].connections
                );
            }
        }
        
        // Randomly rotate all pipes to create the puzzle
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const rotations = Math.floor(Math.random() * 4);
                this.grid[row][col].rotation = rotations * 90;
            }
        }
        
        this.calculatePower();
    }
    
    getAllNeighbors(row, col) {
        const neighbors = [];
        const directions = [
            { dr: -1, dc: 0 }, // North
            { dr: 0, dc: 1 },  // East
            { dr: 1, dc: 0 },  // South
            { dr: 0, dc: -1 }  // West
        ];
        
        for (const { dr, dc } of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            
            // Handle edge wrapping if enabled
            if (this.wrapEdges) {
                newRow = (newRow + this.gridSize) % this.gridSize;
                newCol = (newCol + this.gridSize) % this.gridSize;
            } else {
                // Check bounds
                if (newRow < 0 || newRow >= this.gridSize || 
                    newCol < 0 || newCol >= this.gridSize) {
                    continue;
                }
            }
            
            neighbors.push({ row: newRow, col: newCol });
        }
        
        return neighbors;
    }
    
    areConnected(tile1, tile2) {
        // Check if two tiles are already connected
        const dr = tile2.row - tile1.row;
        const dc = tile2.col - tile1.col;
        
        // Handle wrapping
        let wrappedDr = dr;
        let wrappedDc = dc;
        
        if (this.wrapEdges) {
            // Normalize the difference for wrapped edges
            if (Math.abs(dr) > 1) wrappedDr = dr > 0 ? -1 : 1;
            if (Math.abs(dc) > 1) wrappedDc = dc > 0 ? -1 : 1;
        }
        
        if (wrappedDr === -1) { // tile2 is North
            return this.grid[tile1.row][tile1.col].connections[0];
        } else if (wrappedDc === 1) { // tile2 is East
            return this.grid[tile1.row][tile1.col].connections[1];
        } else if (wrappedDr === 1) { // tile2 is South
            return this.grid[tile1.row][tile1.col].connections[2];
        } else if (wrappedDc === -1) { // tile2 is West
            return this.grid[tile1.row][tile1.col].connections[3];
        }
        
        return false;
    }
    
    getUnvisitedNeighbors(row, col, visited) {
        const neighbors = [];
        const directions = [
            { dr: -1, dc: 0 }, // North
            { dr: 0, dc: 1 },  // East
            { dr: 1, dc: 0 },  // South
            { dr: 0, dc: -1 }  // West
        ];
        
        for (const { dr, dc } of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            
            // Handle edge wrapping if enabled
            if (this.wrapEdges) {
                newRow = (newRow + this.gridSize) % this.gridSize;
                newCol = (newCol + this.gridSize) % this.gridSize;
            } else {
                // Check bounds (no wrapping)
                if (newRow < 0 || newRow >= this.gridSize || 
                    newCol < 0 || newCol >= this.gridSize) {
                    continue;
                }
            }
            
            const key = `${newRow},${newCol}`;
            if (!visited.has(key)) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }
        
        return neighbors;
    }
    
    connectTiles(tile1, tile2) {
        // Determine direction from tile1 to tile2
        let dr = tile2.row - tile1.row;
        let dc = tile2.col - tile1.col;
        
        // Handle wrapping - normalize large differences
        if (this.wrapEdges) {
            if (Math.abs(dr) > 1) dr = dr > 0 ? -1 : 1;
            if (Math.abs(dc) > 1) dc = dc > 0 ? -1 : 1;
        }
        
        // Set connections: [North, East, South, West]
        if (dr === -1) { // tile2 is North of tile1
            this.grid[tile1.row][tile1.col].connections[0] = true;
            this.grid[tile2.row][tile2.col].connections[2] = true;
        } else if (dc === 1) { // tile2 is East of tile1
            this.grid[tile1.row][tile1.col].connections[1] = true;
            this.grid[tile2.row][tile2.col].connections[3] = true;
        } else if (dr === 1) { // tile2 is South of tile1
            this.grid[tile1.row][tile1.col].connections[2] = true;
            this.grid[tile2.row][tile2.col].connections[0] = true;
        } else if (dc === -1) { // tile2 is West of tile1
            this.grid[tile1.row][tile1.col].connections[3] = true;
            this.grid[tile2.row][tile2.col].connections[1] = true;
        }
    }
    
    getPipeTypeFromConnections(connections) {
        const [north, east, south, west] = connections;
        const count = connections.filter(c => c).length;
        
        if (count === 1) {
            return PIPE_TYPES.END;
        } else if (count === 2) {
            // Check if opposite (straight) or adjacent (corner)
            if ((north && south) || (east && west)) {
                return PIPE_TYPES.STRAIGHT;
            } else {
                return PIPE_TYPES.CORNER;
            }
        } else if (count === 3) {
            return PIPE_TYPES.T_JUNCTION;
        } else if (count === 4) {
            return PIPE_TYPES.PLUS;
        }
        
        // Default to end if no connections
        return PIPE_TYPES.END;
    }
    
    shuffleGrid() {
        // Randomly rotate all pipes
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const rotations = Math.floor(Math.random() * 4);
                this.grid[row][col].rotation = rotations * 90;
            }
        }
        
        this.calculatePower();
        this.updateDisplay();
        this.saveGame();
    }
    
    rotatePipe(row, col) {
        const tile = this.grid[row][col];
        tile.rotation = (tile.rotation + 90) % 360;
        
        // Only increment move count if clicking a different tile than the last one
        const currentTileKey = `${row},${col}`;
        if (this.lastClickedTile !== currentTileKey) {
            this.moveCount++;
            this.lastClickedTile = currentTileKey;
        }
        
        this.calculatePower();
        this.updateDisplay();
        this.checkWin();
        this.saveGame();
    }
    
    getConnections(tile) {
        const rotations = tile.rotation / 90;
        const connections = [...tile.type.connections];
        
        // Rotate connections array
        for (let i = 0; i < rotations; i++) {
            connections.unshift(connections.pop());
        }
        
        return connections; // [North, East, South, West]
    }
    
    hasIncorrectConnections(row, col) {
        const tile = this.grid[row][col];
        
        // Only check powered tiles
        if (!tile.powered) return false;
        
        const connections = this.getConnections(tile);
        const directions = [
            { dr: -1, dc: 0, dir: 0, opposite: 2 }, // North
            { dr: 0, dc: 1, dir: 1, opposite: 3 },  // East
            { dr: 1, dc: 0, dir: 2, opposite: 0 },  // South
            { dr: 0, dc: -1, dir: 3, opposite: 1 }  // West
        ];
        
        for (const { dr, dc, dir, opposite } of directions) {
            if (!connections[dir]) continue; // No connection in this direction
            
            let newRow = row + dr;
            let newCol = col + dc;
            
            // Handle edge wrapping
            if (this.wrapEdges) {
                newRow = (newRow + this.gridSize) % this.gridSize;
                newCol = (newCol + this.gridSize) % this.gridSize;
            } else {
                // If connection points off grid, it's incorrect
                if (newRow < 0 || newRow >= this.gridSize || 
                    newCol < 0 || newCol >= this.gridSize) {
                    return true;
                }
            }
            
            const neighborTile = this.grid[newRow][newCol];
            
            // If neighbor is not powered, this is an incorrect connection
            if (!neighborTile.powered) {
                return true;
            }
            
            // If neighbor is powered but doesn't have matching connection back, it's incorrect
            const neighborConnections = this.getConnections(neighborTile);
            if (!neighborConnections[opposite]) {
                return true;
            }
        }
        
        return false;
    }
    
    calculatePower() {
        // Reset all power states
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col].powered = false;
            }
        }
        
        // BFS from source
        const queue = [this.sourcePos];
        const visited = new Set();
        visited.add(`${this.sourcePos.row},${this.sourcePos.col}`);
        this.grid[this.sourcePos.row][this.sourcePos.col].powered = true;
        
        while (queue.length > 0) {
            const pos = queue.shift();
            const currentTile = this.grid[pos.row][pos.col];
            const connections = this.getConnections(currentTile);
            
            // Check all four directions
            const directions = [
                { dr: -1, dc: 0, dir: 0, opposite: 2 }, // North
                { dr: 0, dc: 1, dir: 1, opposite: 3 },  // East
                { dr: 1, dc: 0, dir: 2, opposite: 0 },  // South
                { dr: 0, dc: -1, dir: 3, opposite: 1 }  // West
            ];
            
            for (const { dr, dc, dir, opposite } of directions) {
                if (!connections[dir]) continue; // No connection in this direction
                
                let newRow = pos.row + dr;
                let newCol = pos.col + dc;
                
                // Handle edge wrapping
                if (this.wrapEdges) {
                    newRow = (newRow + this.gridSize) % this.gridSize;
                    newCol = (newCol + this.gridSize) % this.gridSize;
                } else {
                    if (newRow < 0 || newRow >= this.gridSize || 
                        newCol < 0 || newCol >= this.gridSize) {
                        continue;
                    }
                }
                
                const key = `${newRow},${newCol}`;
                if (visited.has(key)) continue;
                
                const neighborTile = this.grid[newRow][newCol];
                const neighborConnections = this.getConnections(neighborTile);
                
                // Check if neighbor has a connection back to current tile
                if (neighborConnections[opposite]) {
                    neighborTile.powered = true;
                    visited.add(key);
                    queue.push({ row: newRow, col: newCol });
                }
            }
        }
    }
    
    renderPipe(tile) {
        const pipeDiv = document.createElement('div');
        pipeDiv.className = 'pipe';
        
        const connections = this.getConnections(tile);
        const [north, east, south, west] = connections;
        
        // Create pipe segments based on connections
        if (tile.type.name === 'end') {
            // End pipe - one connection
            if (north) {
                pipeDiv.innerHTML = '<div class="pipe-segment pipe-corner-top"></div><div class="pipe-segment pipe-end-cap"></div>';
            } else if (east) {
                pipeDiv.innerHTML = '<div class="pipe-segment pipe-corner-right"></div><div class="pipe-segment pipe-end-cap"></div>';
            } else if (south) {
                pipeDiv.innerHTML = '<div class="pipe-segment pipe-corner-bottom"></div><div class="pipe-segment pipe-end-cap"></div>';
            } else {
                pipeDiv.innerHTML = '<div class="pipe-segment pipe-corner-left"></div><div class="pipe-segment pipe-end-cap"></div>';
            }
        } else if (tile.type.name === 'straight') {
            // Straight pipe
            if (north && south) {
                pipeDiv.innerHTML = '<div class="pipe-segment pipe-vertical"></div>';
            } else {
                pipeDiv.innerHTML = '<div class="pipe-segment pipe-horizontal"></div>';
            }
        } else if (tile.type.name === 'corner') {
            // Corner pipe
            let segments = '';
            if (north) segments += '<div class="pipe-segment pipe-corner-top"></div>';
            if (east) segments += '<div class="pipe-segment pipe-corner-right"></div>';
            if (south) segments += '<div class="pipe-segment pipe-corner-bottom"></div>';
            if (west) segments += '<div class="pipe-segment pipe-corner-left"></div>';
            segments += '<div class="pipe-segment pipe-center"></div>';
            pipeDiv.innerHTML = segments;
        } else if (tile.type.name === 't') {
            // T junction
            let segments = '';
            if (north) segments += '<div class="pipe-segment pipe-corner-top"></div>';
            if (east) segments += '<div class="pipe-segment pipe-corner-right"></div>';
            if (south) segments += '<div class="pipe-segment pipe-corner-bottom"></div>';
            if (west) segments += '<div class="pipe-segment pipe-corner-left"></div>';
            segments += '<div class="pipe-segment pipe-center"></div>';
            pipeDiv.innerHTML = segments;
        } else if (tile.type.name === 'plus') {
            // Plus/cross pipe
            pipeDiv.innerHTML = `
                <div class="pipe-segment pipe-vertical"></div>
                <div class="pipe-segment pipe-horizontal"></div>
                <div class="pipe-segment pipe-center"></div>
            `;
        }
        
        return pipeDiv;
    }
    
    updateDisplay() {
        // Clear board
        this.gameBoard.innerHTML = '';
        this.gameBoard.style.gridTemplateColumns = `repeat(${this.gridSize}, 60px)`;
        
        let poweredCount = 0;
        let totalCount = this.gridSize * this.gridSize;
        
        // Render grid
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const tile = this.grid[row][col];
                const tileDiv = document.createElement('div');
                tileDiv.className = 'tile';
                
                if (tile.powered) {
                    tileDiv.classList.add('powered');
                    poweredCount++;
                }
                
                if (this.gameWon) {
                    tileDiv.classList.add('completed');
                }
                
                if (tile.isSource) {
                    tileDiv.classList.add('source');
                }
                
                // Check for incorrect connections (powered tile connecting to unpowered)
                if (tile.powered && this.hasIncorrectConnections(row, col)) {
                    tileDiv.classList.add('incorrect');
                }
                
                if (this.hideUnpowered && !tile.powered && !tile.isSource) {
                    tileDiv.classList.add('hidden');
                }
                
                tileDiv.appendChild(this.renderPipe(tile));
                tileDiv.addEventListener('click', () => this.rotatePipe(row, col));
                
                this.gameBoard.appendChild(tileDiv);
            }
        }
        
        // Update stats
        this.moveCountEl.textContent = this.moveCount;
        this.poweredCountEl.textContent = poweredCount;
        this.totalCountEl.textContent = totalCount;
    }
    
    checkWin() {
        // Check if all tiles are powered
        let allPowered = true;
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (!this.grid[row][col].powered) {
                    allPowered = false;
                    break;
                }
            }
            if (!allPowered) break;
        }
        
        if (!allPowered) return;
        
        // Check for no excess/incorrect connections
        let hasIncorrect = false;
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.hasIncorrectConnections(row, col)) {
                    hasIncorrect = true;
                    break;
                }
            }
            if (hasIncorrect) break;
        }
        
        if (allPowered && !hasIncorrect) {
            this.gameWon = true;
            
            // Check and update best score for this grid size
            const currentBest = this.bestScores[this.gridSize];
            if (currentBest === undefined || this.moveCount < currentBest) {
                this.bestScores[this.gridSize] = this.moveCount;
                this.saveBestScores();
                this.updateBestScoreDisplay();
            }
            
            this.winMessage.classList.remove('hidden');
            this.finalMovesEl.textContent = this.moveCount;
            this.updateDisplay(); // Refresh display to show green background
            this.saveGame();
        }
    }
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PipePuzzle();
});
