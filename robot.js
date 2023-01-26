const robot = {

    move_delay: 100, // set this to 0 to fastest mode
    piece_delay: 200, // set this to 0 to fastest mode

    init: function() {
        game.add_event_listener((e) => {
            if (e.type == "new_piece") robot.next(e.state);
            else if (e.type == "game_on") { /* ... */ }
            else if (e.type == "game_off") { /* ... */ }
            else if (e.type == "game_over") { /* ... */ }
        });
    },

    next: async function(state) {
        // deside here what to do and then drop piece

        // as an example lets rotate once
        game.rotate_cw();

        // There is also a helper to move any absolute position (if possible).
        // Try that with random values:
        const position = Math.floor(Math.random() * 12) - 2;
        const rotation = Math.floor(Math.random() * 3);
        await this.go_position(state, position, rotation);

        // you can use hold-feature too as many times as you want...
        game.switch_hold_piece(); 

        // ...but lets switch the original piece back for now:
        game.switch_hold_piece(); 

        // finally some animation delay and drop piece
        if (robot.piece_delay) await new Promise(r => setTimeout(r, robot.piece_delay));
        game.drop();
    },

    /**
     * Helper to move, rotate and drop current piece into given position.
     * 
     * @param {*} state Current state
     * @param {*} x Target x (-2=left most, 10=right most)
     * @param {*} rotation Rotation given times from initial (not current!) rotation clockwise
     */
    go_position: async function(state, x, rotation) {
        var dx = x - state.x, dr = rotation - state.rotation;
        const max = Math.max(Math.abs(dx), Math.abs(dr));
        for (var i = 0; i < max; ++i) {
            if (dr > 0) { game.rotate_cw(); --dr; }
            if (dr < 0) { game.rotate_ccw(); ++dr; }
            if (dx > 0) { game.move_right(); --dx; }
            if (dx < 0) { game.move_left(); ++dx; }
            if (this.move_delay) await new Promise(r => setTimeout(r, this.move_delay));
        }
    },

    /**
     * Helper to check if given piece (shape in x,y) overlaps with other pieces or borders
     * of the board.
     * 
     * @param {*} state The current state in game
     * @param {*} shape The blocks of the piece
     * @param {*} x The x location in board (-2..10)
     * @param {*} y The y location in board (0..20)
     * @returns 
     */
    overlap: function(state, shape, x, y) {
        for (i = 0; i < shape.length; ++i) {
            const xx = x + shape[i][0] + 2, yy = y + shape[i][1] + 2;
            if (xx < 0 || xx >= state.board.length || yy < 0 || yy >= state.board[xx].length) continue; 
            if (state.board[xx][yy] != 0) return true;
        }
        return false;
    },

    /**
     * Helper to check if given shape can move from given position dx and dy
     * blocks.
     * 
     * @param {*} state The state of the game
     * @param {*} x  The x location in board (0..10)
     * @param {*} y  The y location in board (0..20)
     * @param {*} shape The blocks of the piece in current rotation
     * @param {*} dx The delta of x movement
     * @param {*} dy The delta of y movement
     * @returns 
     */
    can_move: function(state, x, y, shape, dx, dy) {
        var xx = x, yy = y;
        const dir = [dx == 0 ? 0 : dx / Math.abs(dx), dy == 0 ? 0 : dy / Math.abs(dy)];
        while (x + dx != xx || y + dy != yy) {
            xx += dir[0]; yy += dir[1];
            if (this.overlap(state, shape, xx, yy)) return false;
        }
        return true;
    },

    /**
     * Helper to calculate how low the given shape can drop in given position x.
     * 
     * @param {*} state The state of the game
     * @param {*} shape The shape of the piece in current rotation
     * @param {*} x The location horizontally
     * @returns 
     */
    height: function(state, shape, x) {
        if (!this.can_move(state, state.x, state.y, shape, x - state.x, 0)) return null;
        var dy = 1;
        while (dy < board_height && this.can_move(state, x, state.y, shape, 0, dy)) ++dy;
        if (dy == board_height) return null;
        const lowest_block_in_piece = Math.max(...shape.map(s => s[1]));
        return state.y + dy -2 + lowest_block_in_piece;
    },

}