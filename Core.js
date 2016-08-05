/**
 * Created by redun on 24/07/2016.
 */

function Board(rows, columns){
    var rows = rows;
    var columns = columns;
    var cells = [];
    for (var i = 0; i < rows; i++){
        cells.push([]);
        for(var j = 0; j < columns; j++){
            cells[i].push([]);
        }
    }
    var checkBounds = function(row, col){
        if(row < rows && col < columns && row >= 0 && col >= 0){
            return true;
        }
        else{
            throw new Error("Cell operation out of bounds");
        }
    }
    this.placeInCell = function(row, col, object){
        if(checkBounds(row, col)){
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
        open: true,
        started: false
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
    this.hasEnoughPlayers = function(){{
        return this.getNumPlayers() >= game.minPlayers;
    }}
    this.addPlayer = function (player){
        console.log("There are currently " + this.getNumPlayers() + " and a limit of " + game.maxPlayers);
        if(this.getState().started == true) {
            throw new Error("Game has already started");
        }
        if(this.getNumPlayers() < game.maxPlayers) {
            state.players[player._id] = player;
        }
        else{
            throw new Error("Player capacity exceeded");
        }
    };
    this.getPlayer = function(id){
        return state.players[id];
    };
    this.getPlayers = function(){
        return Object.keys(state.players);
    };
    this.getState = function(){
        return state;
    };
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
        state.host = id;
    };
    this.getHost = function(){
        return state.host;
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

module.exports = Core;