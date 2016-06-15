/**
 * Deprecated!!!!!!!!!!!!!!!
 */
class Game {
    constructor(containerView, rows, cols) {
        this.gameBoardData = null;
        this.prevSquare = null;
        this.rows = rows;
        this.cols = cols;
        this.containerView = containerView;
    }

    /**
     * Shuffles the elements of an array
     * @param arr - the array
     */
    shuffle(arr) {
        let j, x, i;
        for (i = arr.length; i; i -= 1) {
            j = Math.floor(Math.random() * i);
            x = arr[i - 1];
            arr[i - 1] = arr[j];
            arr[j] = x;
        }
    }

    /**
     * Initialize the gameBoardData variable with array of elements
     * that represents the game board squares values
     */
    initBoardData() {
        this.gameBoardData = [];
        for (let i = 0; i < (this.rows * this.cols) / 2; i++) {
            this.gameBoardData.push(i + 1);
            this.gameBoardData.push(i + 1);
        }
        this.shuffle(this.gameBoardData);
    }

    /**
     * Draws the game board in the html page
     */
    drawBoard() {
        let content = '';
        for (let i = 0; i < ROWS; i++) {
            content += '<tr>';
            for (let j = 0; j < COLS; j++) {
                content += `<td style="padding: 3px;">
                                <div data-state="covered" data-index=${(i * ROWS) + j} class="game-board-square">
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
            content += '</tr>';
        }
        this.containerView.html(content);
    }

    /**
     * Handles square click
     * @param square
     */
    handleClick(square) {
        if (square.data('state') == 'covered') {
            this.uncover(square, () => {
                if (this.prevSquare) {
                    if (this.prevSquare.find('div div.back div').html() != square.find('div div.back div').html()) {
                        this.cover(square);
                        this.cover(this.prevSquare);
                    }
                    this.prevSquare = null;
                } else {
                    this.prevSquare = square;
                }
            });
        }
    }

    /**
     * Binds onclick listener to each game board square click event
     */
    bindClickHandler() {
        let thisRef = this
        $('.game-board-square').each(function () {
            let square = $(this);
            square.on('click', () => {
                thisRef.handleClick(square);
            });
        });
    }

    /**
     * What do u think it does sherlock?
     * @param square
     */
    cover(square) {
        square.data('state', 'covered')
        square.removeClass('flip')
        square.one('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', () => {
            square.find('div div.back div').html(null)
        })
    }

    /**
     * Do i really need to explain...?
     * @param square
     * @param val
     * @param callback
     */
    uncover(square, callback) {
        square.data('state', 'uncovered')
        square.addClass('flip')
        square.find('div div.back div').html(this.gameBoardData[square.data('index')])
        square.one('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', callback)
    }

    /**
     * Starts new game
     */
    start() {
        this.initBoardData();
        this.drawBoard();
        this.bindClickHandler();
    }
}