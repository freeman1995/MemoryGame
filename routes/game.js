'use strict'

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
 * Waiting list
 * @type {{}}
 */
const waitingList = {};

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
    }
}

/**
 *
 * @param socketIoServer
 */
function subscribe(socketIoServer) {
    // Subscribe on new client connection
    socketIoServer.on('connection', (socket) => {
        console.log(socket.name + ' has connected');
        socket.on('disconnect', () => {
            console.log(socket.name + ' has disconnected');
        });
        socket.on('findPartner', (level) => {
            if (waitingList[level]) {
                if (waitingList[level].length > 0) {
                    let boardSize = BOARD_SIZES[level];
                    let game = new Game(boardSize.rows, boardSize.cols)
                    let socket2 = waitingList[level].pop()

                    game.currTurn = socket2;

                    socket.partner = socket2;
                    socket.game = game;
                    socket.score = 0;
                    socket2.partner = socket;
                    socket2.game = game;
                    socket2.score = 0;

                    socket.emit('gameStart', boardSize.rows, boardSize.cols, false);
                    socket2.emit('gameStart', boardSize.rows, boardSize.cols, true);
                } else {
                    waitingList[level].push(socket);
                }
            } else {
                waitingList[level] = [socket,]
            }
        });
        socket.on('uncoverRequest', index => {
            let board = socket.game.board;
            if (board[index].covered && socket.game.currTurn == socket) {
                if (socket.prevIndex > -1) {
                    if (board[socket.prevIndex].val == board[index].val) {
                        socket.emit('match', index, board[index].val, true);
                        socket.partner.emit('match', index, board[index].val, false);
                        board[index].covered = false;
                        socket.score++;
                        if (!--socket.game.coveredPairsCount) {
                            socket.emit('gameEnd', socket.score > socket.partner.score);
                            socket.partner.emit('gameEnd', socket.score < socket.partner.score);
                        }
                    } else {
                        socket.emit('fail', socket.prevIndex, index, board[index].val, true);
                        socket.partner.emit('fail', socket.prevIndex, index, board[index].val, false);
                        board[index].covered = true;
                        board[socket.prevIndex].covered = true;
                    }
                    socket.game.currTurn = socket.partner;
                    socket.prevIndex = -1;
                } else {
                    socket.emit('squareUncover', index, board[index].val);
                    socket.partner.emit('squareUncover', index, board[index].val);
                    socket.prevIndex = index;
                    board[index].covered = false;
                }
            }
        })
    });
}

module.exports = subscribe;