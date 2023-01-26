const robot = {

    move_delay: 0, // set this to 100 to see movement
    piece_delay: 0, // set this to 200 to pause between pieces

    init: function() {
        game.add_event_listener((e) => {
            if (e.type == "new_piece") robot.next(e.state);
            else if (e.type == "game_on") { /* ... */ }
            else if (e.type == "game_off") { /* ... */ }
            else if (e.type == "game_over") { /* ... */ }
        });
    },

    next: async function(state) {
        const data1 = this.collect_data_of_possible_moves(state);
        const best_move1 = this.best_of(data1);
        game.switch_hold_piece();
        const data2 = this.collect_data_of_possible_moves(state);
        const best_move2 = this.best_of(data2);

        var best;
        if (this.comp_value_of(best_move1) < this.comp_value_of(best_move2)) {
            game.switch_hold_piece(); // it was better before switch, switch back 
            best = best_move1;
        } else {
            best = best_move2;
        }
        await this.go_position(state, best.column, best.rotation);
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

    collect_data_of_possible_moves: function(state) {
        const data = [];
        var shape = state.current_piece.geometry.shape;
        for (var r = 0; r < 4; ++r) { // try on every rotation
            if (r > 0) shape = shape.map(b => [-1 * b[1], b[0]]);
            for (var x = -2; x < board_width; ++x) { // try every position in board
                const y = this.height(state, shape, x);
                if (y) { // filter out invalid moves
                    const e = this.holes_under(state, shape, x, y, r);
                    const f = this.flatness_of_surface_with_piece(state, shape, x, y);
                    data.push({ rotation: r, column: x, height: y, holes_right_below: e.under,
                        holes_deeper_below: e.deeper, flatness: f});
                }
            }
        }
        return data;
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

    height: function(state, shape, x) {
        if (!this.can_move(state, state.x, state.y, shape, x - state.x, 0)) return null;
        var dy = 1;
        while (dy < board_height && this.can_move(state, x, state.y, shape, 0, dy)) ++dy;
        if (dy == board_height) return null;
        const lowest_block_in_piece = Math.max(...shape.map(s => s[1]));
        return state.y + dy -2 + lowest_block_in_piece;
    },

    holes_under: function(state, shape, x, y) {
        var count = { under: 0, deeper: 0 };
        for (s of shape) {
            const xx = x + s[0] + 2;
            var yy = y + s[1] + 2 + 1; // one below the block
            if (xx < 0 || xx >= state.board.length || yy < 0 || yy >= state.board[xx].length) continue; 
            if (this.shape_contains(shape, s[0], s[1] + 1)) continue;
            if (state.board[xx][yy] === 0) ++count.under;

            const max = state.board[xx].length;
            for (; yy < max; ++yy) if (state.board[xx][yy] == 0) count.deeper += 1; //deeper
        }
        return count;
    },

    flatness_of_surface_with_piece: function(state, shape, cx, cy) {
        const surface = [];
        var variation = 0;
        for (var x = 1; x <= board_width; ++x) {
            for (var y = 0; y < board_height + 2; ++y) {
                if (state.board[x][y] !== 0) break;
                var current_piece = false;
                for (s of shape) {
                    if ((x == cx + s[0] + 2) && (y == cy + s[1] + 1)) { current_piece = true; break; }
                }
                if (current_piece) break;
            }
            surface[x - 1] = y;
            if (x != 1) variation += Math.abs(surface[x - 2] - surface[x - 1]);
        }
        return variation;
    },

    shape_contains: function(shape, x, y) {
        for (s of shape) if (s[0] === x && s[1] === y) return true;
        return false;
    },

    best_of: (data) => data.sort((a,b) => robot.comp_value_of(a) - robot.comp_value_of(b))[0],

    comp_value_of: function(e) {
        return (e.holes_right_below * 15000) + (e.holes_deeper_below * 500) + (Math.pow(board_height - e.height, 3.2) * 10) + e.flatness; // 500k w/ hold
        //return (e.holes_right_below * 10000) + (e.holes_deeper_below * 500) + (Math.pow(board_height - e.height, 3.2) * 10) + e.flatness; // 80k (160k w/ hold)
        //return (e.holes_right_below * 10000) + (e.holes_deeper_below * 1000) + (Math.pow(board_height - e.height, 3.2) * 10) + e.flatness;
        //return (e.holes_right_below * 50000) + (e.holes_deeper_below * 5000) + (Math.pow(board_height - e.height, 3.2) * 10) + e.flatness;
    }
}