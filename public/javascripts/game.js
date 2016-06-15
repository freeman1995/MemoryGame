'use strict'

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
 * @param val
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
    jSquare.find('div div.back div').html(val);
    jSquare.addClass('flip');
}

/**
 * Represents a player that can play with other player
 */
class Player {
    /**
     *
     */
    constructor(name) {
        this.client = io('188.166.30.133:3000');
        this.client.on('squareUncover', (index, val) => {
            uncover($('.square').eq(index), val);
        });
        this.client.on('fail', (uncoveredIndex, coveredIndex, coveredVal, mine) => {
            let firstSquare = $('.square').eq(uncoveredIndex);
            let secondSquare = $('.square').eq(coveredIndex);
            uncover(secondSquare, coveredVal, () => {
                $('#messages-row').html(mine ? `You failed!, now it's ${this.opponentName} turn.` : `${this.opponentName} failed, now it's your turn.`);
                cover(firstSquare);
                cover(secondSquare);
            })
        });
        this.client.on('match', (index, val, mine) => {
            $('#messages-row').html(mine ? `You succeed!, not it's your ${this.opponentName} turn.` : `${this.opponentName} succeed!, now it's your turn.`);
            uncover($('.square').eq(index), val);
        });
        this.client.on('gameEnd', win => {
            $('#messages-row').html(win ? 'You won!!!' : 'You lost!');
        });
        this.name = name;
        this.opponentName = null;
    }

    /**
     * Starts new game
     */
    play(level, jBoard) {
        this.client.once('gameStart', (rows, cols, myTurn, opponentName) => {
            this.opponentName = opponentName;
            
            // draw board
            let boardContent = `<tr><td id="messages-row" colspan="${cols}"></td></tr>`;
            for (let i = 0; i < rows; i++) {
                boardContent += '<tr>';
                for (let j = 0; j < cols; j++) {
                    boardContent += `<td style="padding: 3px;">
                                        <div data-index=${(i * cols) + j} class="square">
                                            <div class="flipper">
                                                <div class="front">
                                                    <div class="card" style="background: silver"></div>
                                                </div>
                                                <div class="back">
                                                    <div class="card" style="background: green"></div>
                                                </div>
                                            </div>
                                        </div>
                                     </td>`;
                }
                boardContent += '</tr>';
            }
            jBoard.html(boardContent);

            // handle board square clicks
            let thisRef = this;
            $('.square').click(function () {
                let jSquare = $(this);
                thisRef.client.emit('uncoverRequest', jSquare.data('index'));
            });

            // Notify on first turn
            $('#messages-row').html(myTurn ? "You start." : `${opponentName} starts.`);
        }).emit('findPartner', level, this.name);
    }
}