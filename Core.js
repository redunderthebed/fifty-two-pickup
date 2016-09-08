/**
 * Created by redun on 24/07/2016.
 */

var stateful = require('./state');

function Board(rows, columns){

    stateful.StatefulObject.call(this);
    var _state = {
        rows: rows,
        columns: columns,
        cells: []
    };

    for (var i = 0; i < rows; i++){
        _state.cells.push([]);
        for(var j = 0; j < columns; j++){
            _state.cells[i].push([]);
        }
    }

    var checkBounds = function(row, col){
        if(row < _state.rows && col < _state.columns && row >= 0 && col >= 0){
            return true;
        }
        else{
            throw new Error("Cell operation out of bounds");
        }
    };

    this.placeInCell = function(row, col, object){
        if(checkBounds(row, col)){
            _state.cells[row][col].push(object);
        }
    };

    this.removeFromCell = function(row, col, object){
        if(checkBounds(row, col)){
            var cell = cells[row][col];
            cell.splice(cell.indexOf(object), 1);
        }
    };

    this.getCells = function(){
        return _state.cells;
    };

    this.getCell = function(row, col){
        if(checkBounds(row, col)){
            return _state.cells[row][col];
        }
    };

    this.getState = function(){
        var boardState = _state.cells.map(function(row){
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
    };

    this.setState = function(inState){
        _state = inState;
    };
}

stateful.addConstructor(Board, module);

function Core(savedState){

    stateful.StatefulObject.call(this);
    var game = null;
    Object.assign(this._state, {
        players: {},
        boards: {},
        cards: {},
        active: true,
        open: true,
        started: false
    });
    /*if(savedState) {
        Object.keys(savedState).forEach(function(key){
            this._state[key] = savedState[key];
        })
    }*/
    this.createBoard = function(name, rows, cols){
        this._state.boards[name] = new Board(rows, cols);
        return this._state.boards[name];
    }
    this.hasEnoughPlayers = function(){{
        return this.getNumPlayers() >= game.minPlayers;
    }}
    this.addPlayer = function (player){
        console.log("There are currently " + this.getNumPlayers() + " and a limit of " + game.maxPlayers);
        if(this.getState().started == true) {
            throw new Error("Game has already started");
        }
        if(this.getNumPlayers() < game.maxPlayers) {
            this._state.players[player._id] = player;
        }
        else{
            throw new Error("Player capacity exceeded");
        }
        console.log("Now there are " + this.getNumPlayers() + " and a limit of " + game.maxPlayers);
    };
    this.getPlayer = function(id){
        return this._state.players[id];
    };
    this.getPlayers = function(){
        return Object.keys(this._state.players);
    };
    this.getState = function(){
        return this._state;
    };
    this.setState = function(state){
        this._state = state;
    }
    this.setPlayerReady = function(playerId, ready){
        var player = this.getPlayer(playerId);
        player.ready = ready;
        var allReady = this.getPlayers().every(function(playerId){
            console.log(this.getPlayer(playerId));
            return this.getPlayer(playerId).ready == true;
        }, this)
        console.log(allReady);
        this.setGameOpen(!allReady);
    };
    this.setGameOpen = function(open){
        this.getState().open = open;
    }
    this.getNumPlayers = function(){
        return this.getPlayers().length;
    };
    this.setHost = function(id){
        this._state.host = id;
    };
    this.getHost = function(){
        return this._state.host;
    };
    this.setGame = function(gameIn){
        game = gameIn;
    };
    this.start = function(){
        this.getState().started = true;
    }
    this.gameOver = function(){
        console.log("Determine", game.events.determineWinner);
        this.getState().leaderBoard = game.events.determineWinner.apply(game);
        this.getState().active = false;
    };

}
stateful.addConstructor(Core, module);
module.exports = Core;