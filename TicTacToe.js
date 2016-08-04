/**
 * Created by redun on 26/07/2016.
 */



function ticTacToe(){
    var state = {

    };
    function getState(){
        console.log('getting game state of tictactoe');
        return state;
    }

    this._id = "12345";
    this._rev = "6-7bfd0d96183ba00e1c6d11d358966999";
    this.gameName = 'Tic Tac Toe';
    this.maxPlayers = 2;
    this.minPlayers = 2;

    this.actions = {
        post: {
            placeSymbol: function (args) {
                if(args.row && args.col && args.symbol) {
                    console.log("row", args.row, "col", args.col, "symbol", args.symbol);


                    return {ok: true};
                }
                else{
                    return new Error("Missing arguments");
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
        this.core.createBoard("mainBoard");
    },
    this.getState = getState
    
};

module.exports = ticTacToe;