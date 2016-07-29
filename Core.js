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
}

function Core(savedState){
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
        boards[name] = new Board(rows, cols);
        return boards[name];
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
    this.setHost = function(){
        state.host = id;
    }
}

module.exports = Core;