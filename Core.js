/**
 * Created by redun on 24/07/2016.
 */

function Board(rows, columns){
    var rows = rows;
    var columns = columns;
    var cells = [];
    for (var i = 0; i < rows; i++){
        cells.push([]);
        for(var j = 0; j < cols; j++){
            cells[i].push([]);
        }
    }
    var checkBounds = function(row, col){
        return row < rows && col < cols && row >= 0 && col >= 0;
    }
    this.placeInCell = function(row, col, object){
        if(checkBounds){
            cells[row][col].push(object);
        }
    }
    this.removeFromCell = function(row, col, object){
        if(checkBounds(row, col)){
            var cell = cells[row][col];
            cell.splice(cell.indexOf(object), 1);
        }
    }
    this.getCells = function(){
        return cells;
    }
    this.getCell = function(row, col){
        if(checkBounds(row, col)){
            return cells[row][col];
        }
    }
    this.getState = function(){
        var boardState = cells.map(function(row){
            return row.map(function(cell){
                return cell.map(function(item){
                    var type = typeof item;
                    if(item.getState){
                        return {type: type, item: item.getState()}
                    }
                    else{
                        return item;
                    }
                });
            });
        });
        return {rows: rows, columns: columns, cells: boardState};
    }
}

function Core(savedState){
    var game = null;
    var state =
    {
        players: {},
        boards: {},
        cards: {},
        active: true,
        open: true
    }
    
    if(savedState) {
        Object.keys(savedState).forEach(function(key){
            state[key] = savedState[key];
        })
    }
    this.createBoard = function(name, rows, cols){
        state.boards[name] = new Board(rows, cols);
        return state.boards[name];
    }
    this.addPlayer = function (player){
        state.players[player._id] = player;
    };
    this.getPlayer = function(id){
        return state.players[id];
    };
    this.getPlayers = function(){
        return Object.keys(state.players);
    }
    this.getState = function(){
        return state;
    }
    this.setHost = function(id){
        state.host = id;
    }
    this.getHost = function(){
        return state.host;
    }
    this.setGame = function(gameIn){
        game = gameIn;
    }
    this.gameOver = function(){
        console.log("Determine", game.events.determineWinner);
        this.getState().leaderBoard = game.events.determineWinner.apply(game);
        this.getState().active = false;
    }

}

module.exports = Core;