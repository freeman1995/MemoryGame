'use strict'

/**
 * 
 * @type {string}
 */
const SERVER = '188.166.30.133:3000'; 

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
    jSquare.find('div div.back div').html(`<img src="${SERVER}/static/images/${val}"/>`);
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
    constructor(name, jBoard) {
        this.client = io(SERVER);
        this.opponentName = null;
        this.jBoard = jBoard;
        this.name = name;

        this.client.on('squareUncover', (index, val) => uncover($('.square').eq(index), val));
        this.client.on('fail', (uncoveredIndex, coveredIndex, coveredVal, mine) => {
            let firstSquare = $('.square').eq(uncoveredIndex);
            let secondSquare = $('.square').eq(coveredIndex);
            uncover(secondSquare, coveredVal, () => {
                $('#messages-row').html(mine ? `You failed!, now it's ${this.opponentName} turn.` : `${this.opponentName} failed, now it's your turn.`);
                cover(firstSquare);
                cover(secondSquare);
            })
        });
        this.client.on('success', (index, val, mine) => {
            $('#messages-row').html(mine ? `You succeed!, not it's your ${this.opponentName} turn.` : `${this.opponentName} succeed!, now it's your turn.`);
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
        this.client.once('logged', id => this.client.id = id).emit('login', name);
    }

    /**
     *
     */
    disconnect() {
        this.client.disconnect();
    }

    /**
     * Starts new game
     */
    play(level) {
        this.client.once('gameStart', (rows, cols, myTurn, opponentName) => {
            this.opponentName = opponentName;

            // draw board
            this.jBoard.html(`<tr><td id="messages-row" colspan="${cols}"></td></tr>`);
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
                                              <div class="card" style="background: green"></div>
                                          </div>
                                      </div>
                                  </div>`);
                    square.on('click', () => {
                        this.client.emit('uncoverRequest', square.data('index'))
                    });
                    jTd.append(square);
                }
            }

            // Notify on first turn
            $('#messages-row').html(myTurn ? "You start." : `${opponentName} starts.`);
        }).emit('findPartner', level);
    }
}