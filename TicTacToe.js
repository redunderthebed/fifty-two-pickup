/**
 * Created by redun on 26/07/2016.
 */
var state = require('./state');

function TicTacToe(){
    state.StatefulObject.call(this);

    function getState(){
        console.log('getting game state of tictactoe');
        return this._state;
    }
    this.setState = function(state){
        this._state = state;
    }

    this._id = "12345";
    this._rev = "6-7bfd0d96183ba00e1c6d11d358966999";
    this.gameName = 'Tic Tac Toe';
    this.maxPlayers = 2;
    this.minPlayers = 2;

    this.actions = {
        post: {
            placeSymbol: function (args) {
                if(args.row && args.col) {
                    var index = this.core.getPlayers().indexOf(args.playerId);
                    if(index == 0){
                        args.symbol = 'X';
                    }
                    else{
                        args.symbol = 'O';
                    }
                    console.log("row", args.row, "col", args.col, "symbol", args.symbol);
                    this.core.getState().boards.mainBoard.placeInCell(args.row, args.col, args.symbol);


                    return {ok: true};
                }
                else{
                    throw new Error("Missing arguments");
                }
            },
            setWinner: function(args){
                console.log("Set winner");
                console.log("Set winner", this.getState());
                this.getState().winner = args.playerId;
                this.core.gameOver();
                return {ok:true};
            },
            setLoser : function(args){
                console.log("Set loser");
                this.getState().loser = args.playerId;
                return {ok:true};
            }
        }
    };
    this.events = {
        playerJoined: function(player){

        },
        determineWinner: function(){
            console.log("determining winner");
            var first = this.core.getPlayer(this.getState().winner);
            var second = this.core.getPlayer(this.getState().loser);
            return {first: first, second:second};
        }

    };
    this.init = function(){
        this.core.createBoard("mainBoard", 3, 3);
    };
    this.getState = getState
    
};

state.addConstructor(TicTacToe, module);

module.exports = TicTacToe;