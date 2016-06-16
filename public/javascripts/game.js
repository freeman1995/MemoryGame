'use strict'

const DIGITAL_OCEAN_HOST = '188.166.30.133';
const LOCAL_HOST = 'localhost';
const SERVER = `${LOCAL_HOST}:3000`;

/**
 * Represents the levels of a game
 * @type {{HARD: number, MEDIUM: number, EASY: number}}
 */
const LEVELS = {
    EASY: 0,
    MEDIUM: 1,
    HARD: 2,
};

/**
 *
 * @param jSquare
 */
function cover(jSquare) {
    jSquare.removeClass('flip');
}

/**
 *
 * @param jSquare
 * @param val
 * @param callback
 */
function uncover(jSquare, val, callback) {
    jSquare.one('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', callback);
    jSquare.find('div div.back div').html(`<img src="http://${SERVER}/images/${val}.png"/>`);
    jSquare.addClass('flip');
}

/**
 * Represents a player that can play with other player
 */
class Player {
    /**
     *
     * @param name
     * @param jBoard
     */
    constructor(name, jBoard, jChat) {
        this.client = io(SERVER);
        this.opponentName = null;
        this.jBoard = jBoard;
        this.jChat = jChat;
        this.name = name;
            
        this.client.on('squareUncover', (index, val) => uncover($('.square').eq(index), val));
        this.client.on('fail', (uncoveredIndex, coveredIndex, coveredVal) => {
            let firstSquare = $('.square').eq(uncoveredIndex);
            let secondSquare = $('.square').eq(coveredIndex);
            uncover(secondSquare, coveredVal, () => {
                $('#messages-row').html(`You failed!, now it's ${this.opponentName} turn.`);
                cover(firstSquare);
                cover(secondSquare);
            })
        });
        this.client.on('opponentFail', (uncoveredIndex, coveredIndex, coveredVal) => {
            let firstSquare = $('.square').eq(uncoveredIndex);
            let secondSquare = $('.square').eq(coveredIndex);
            uncover(secondSquare, coveredVal, () => {
                $('#messages-row').html(`${this.opponentName} failed, now it's your turn.`);
                cover(firstSquare);
                cover(secondSquare);
            })
        });
        this.client.on('success', (uncoveredIndex, index, val, score) => {
            $('#messages-row').html('You succeed!, you gain another turn!');
            $('#score').html(`My score: ${score}`);
            $('.square').eq(index).find('div div.back div').css('border-color', 'green');
            $('.square').eq(uncoveredIndex).find('div div.back div').css('border-color', 'green');
            uncover($('.square').eq(index), val);
        });
        this.client.on('opponentSuccess', (uncoveredIndex, index, val, score) => {
            $('#messages-row').html(`${this.opponentName} succeed!, he has another turn.`);
            $('#opponent-score').html(`Opponent score: ${score}`);
            $('.square').eq(index).find('div div.back div').css('border-color', 'red');
            $('.square').eq(uncoveredIndex).find('div div.back div').css('border-color', 'red');
            uncover($('.square').eq(index), val);
        });
        this.client.on('gameEnd', winner => {
            if (winner == -1) {
                $('#messages-row').html("It's a draw!");
            } else {
                $('#messages-row').html(winner == this.client.id ? 'You won!!!' : 'You lost!');
            }
        });
        this.client.on('opponentLeft', () => {
            $('#messages-row').html(`${this.opponentName} has left, what a loser...`);
        });
        this.client.on('msg', msg => this.jChat.append(`<div align="right">${msg}</div>`));
        this.client.once('logged', id => this.client.id = id).emit('login', name);
    }

    /**
     *
     */
    disconnect() {
        this.client.disconnect();
    }

    /**
     * 
     * @param msg
     */
    sendMsg(msg) {
        this.jChat.append(`<div align="left">${msg}</div>`);
        this.client.emit('msg', msg);
    }
    
    /**
     * Starts new game
     */
    play(level, callback) {
        this.client.once('gameStart', (rows, cols, myTurn, opponentName) => {
            this.opponentName = opponentName;

            // draw board
            this.jBoard.html(`<tr><td id="messages-row" colspan="${cols}"></td></tr>
                              <tr><td id="score" colspan="${cols/2}">My score: 0</td><td id="opponent-score" colspan="${cols/2}">Opponent score: 0</td></tr>`);
            for (let i = 0; i < rows; i++) {
                let jTr = $('<tr></tr>>');
                this.jBoard.append(jTr);
                for (let j = 0; j < cols; j++) {
                    let jTd = $('<td style="padding: 3px;"></td>');
                    jTr.append(jTd);
                    let square = $(`<div data-index=${(i * cols) + j} class="square">
                                      <div class="flipper">
                                          <div class="front">
                                              <div class="card" style="background: silver"></div>
                                          </div>
                                          <div class="back">
                                              <div class="card"></div>
                                          </div>
                                      </div>
                                  </div>`);
                    square.on('click', () => {
                        this.client.emit('uncoverRequest', square.data('index'))
                    });
                    jTd.append(square);
                }
            }

            // Notify on first turn and execute callback
            $('#messages-row').html(myTurn ? "You start." : `${opponentName} starts.`);
            callback();
        }).emit('findOpponent', level);
    }
}