'use strict'

/**
 *
 * @param server
 * @param room
 */
function popClient(server, room) {
    return server.sockets.adapter.nsp.connected[Object.keys(room.sockets)[0]];
}

/**
 * Shuffles the elements of an array
 * @param arr - the array
 */
function shuffle(arr) {
    let j, x, i;
    for (i = arr.length; i; i -= 1) {
        j = Math.floor(Math.random() * i);
        x = arr[i - 1];
        arr[i - 1] = arr[j];
        arr[j] = x;
    }
}

/**
 * Represents the levels of a game
 * @type {{HARD: {rows: number, cols: number}, MEDIUM: {rows: number, cols: number}, EASY: {rows: number, cols: number}}}
 */
const BOARD_SIZES = {
    0: {
        rows: 3,
        cols: 4,
    },
    1: {
        rows: 4,
        cols: 5,
    },
    2: {
        rows: 6,
        cols: 6,
    },
};

/**
 * Game
 */
class Game {
    /**
     *
     * @param rows
     * @param cols
     */
    constructor(rows, cols) {
        this.currTurn = null;
        this.board = [];
        this.coveredPairsCount = (rows * cols) / 2;

        for (let i = 0; i < (rows * cols) / 2; i++) {
            this.board.push({val: i, covered: true});
            this.board.push({val: i, covered: true});
        }
        shuffle(this.board);

        console.log(this.board);
    }
}

/**
 *
 * @type {{}}
 */
const lobbies = {};

/**
 *
 * @param socketIoServer
 */
function subscribe(socketIoServer, socket) {
    socket.on('login', name => {
        socket.name = name;
        socket.emit('logged', socket.id);
        console.log('\n' + socket.name + ' has connected\n');
    });
    socket.on('disconnect', () => {
        if (socket.name) {
            if (socket.opponent) {
                socket.opponent.emit('opponentLeft');
                socket.opponent.game = null;
            }
            if (socket.lobbyId) {
                lobbies[socket.lobbyId] = null;
            }
            console.log('\n' + socket.name + ' has disconnected\n');
        }
    });
    socket.on('findOpponent', level => {
        if (!socket.name) return;

        // if already in other lobby or in a game, leave it
        if (socket.lobbyId != null) {
            lobbies[socket.lobbyId] = null;
        } else if (socket.game) {
            socket.opponent.emit('opponentLeft');
            socket.game = null;
            socket.opponent.game = null;
        }

        // If lobby is not empty
        if (lobbies[level]) {
            let socket2 = lobbies[level];
            socket2.lobbyId = null;
            lobbies[level] = null;

            let game = new Game(BOARD_SIZES[level].rows, BOARD_SIZES[level].cols);
            game.currTurn = socket2;
            socket.opponent = socket2;
            socket.game = game;
            socket.score = 0;
            socket2.opponent = socket;
            socket2.game = game;
            socket2.score = 0;

            socket.emit('gameStart', BOARD_SIZES[level].rows, BOARD_SIZES[level].cols, false, socket2.name);
            socket2.emit('gameStart', BOARD_SIZES[level].rows, BOARD_SIZES[level].cols, true, socket.name);
        } else {
            // Join lobby
            lobbies[level] = socket;
            socket.lobbyId = level;
        }
    });
    socket.on('uncoverRequest', index => {
        let game = socket.game;
        if (!game || !game.board[index].covered || game.currTurn != socket) return;

        if (socket.prevIndex > -1) {
            if (game.board[socket.prevIndex].val == game.board[index].val) {
                socket.score += 10;
                socket.emit('success', index, game.board[index].val, socket.score);
                socket.opponent.emit('opponentSuccess', index, game.board[index].val, socket.score);
                game.board[index].covered = false;

                if (!--socket.game.coveredPairsCount) {
                    let result = socket.score == socket.opponent.score ?
                        -1 : socket.score > socket.opponent.score ? socket.id : socket.opponent.id;
                    socket.emit('gameEnd', result);
                    socket.opponent.emit('gameEnd', result);
                }
            } else {
                socket.emit('fail', socket.prevIndex, index, game.board[index].val);
                socket.opponent.emit('opponentFail', socket.prevIndex, index, game.board[index].val);
                game.board[index].covered = true;
                game.board[socket.prevIndex].covered = true;
                socket.game.currTurn = socket.opponent;
            }
            socket.prevIndex = -1;
        } else {
            socket.emit('squareUncover', index, game.board[index].val);
            socket.opponent.emit('squareUncover', index, game.board[index].val);
            socket.prevIndex = index;
            game.board[index].covered = false;
        }
    });
}

module.exports = subscribe;