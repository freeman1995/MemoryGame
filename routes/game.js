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
            this.board.push({val: i + 1, covered: true});
            this.board.push({val: i + 1, covered: true});
        }
        shuffle(this.board);

        console.log(this.board);
    }
}

/**
 *
 * @param socketIoServer
 */
function subscribe(socketIoServer, socket) {
    const rooms = socketIoServer.sockets.adapter.rooms;
    socket.on('login', name => {
        socket.name = name;
        socket.emit('logged', socket.id);
        console.log('\n' + socket.name + ' has connected\n');
    });
    socket.on('disconnect', () => {
        if (socket.name) {
            socket.partner.emit('opponentLeft');
            socket.partner.game = null;
            console.log('\n' + socket.name + ' has disconnected\n');
        }
    });
    socket.on('findPartner', level => {
        if (!socket.name) return;

        socket.join(level);
        if (rooms[level].length > 1) {
            socket.leave(level);
            let socket2 = popClient(socketIoServer, rooms[level]);
            socket2.leave(level);

            let game = new Game(BOARD_SIZES[level].rows, BOARD_SIZES[level].cols);
            game.currTurn = socket2;
            socket.partner = socket2;
            socket.game = game;
            socket.score = 0;
            socket2.partner = socket;
            socket2.game = game;
            socket2.score = 0;

            socket.emit('gameStart', BOARD_SIZES[level].rows, BOARD_SIZES[level].cols, false, socket2.name);
            socket2.emit('gameStart', BOARD_SIZES[level].rows, BOARD_SIZES[level].cols, true, socket.name);
        }
    });
    socket.on('uncoverRequest', index => {
        let game = socket.game;
        if (!game || !game.board[index].covered || game.currTurn != socket) return;

        if (socket.prevIndex > -1) {
            if (game.board[socket.prevIndex].val == game.board[index].val) {
                socket.emit('success', index, game.board[index].val, true, socket.score);
                socket.partner.emit('success', index, game.board[index].val, false, socket.partner.score);
                game.board[index].covered = false;
                socket.score++;

                if (!--socket.game.coveredPairsCount) {
                    let result = socket.score == socket.partner.score ?
                        -1 : socket.score > socket.partner.score ? socket.id : socket.partner.id;
                    socket.emit('gameEnd', result);
                    socket.partner.emit('gameEnd', result);
                }
            } else {
                socket.emit('fail', socket.prevIndex, index, game.board[index].val, true);
                socket.partner.emit('fail', socket.prevIndex, index, game.board[index].val, false);
                game.board[index].covered = true;
                game.board[socket.prevIndex].covered = true;
            }
            socket.game.currTurn = socket.partner;
            socket.prevIndex = -1;
        } else {
            socket.emit('squareUncover', index, game.board[index].val);
            socket.partner.emit('squareUncover', index, game.board[index].val);
            socket.prevIndex = index;
            game.board[index].covered = false;
        }
    });
}

module.exports = subscribe;