/**
 * Created by redun on 26/07/2016.
 */



function ticTacToe(){
    var state = {

    };
    function getState(){
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
            }
        }
    };
    this.events = {
        playerJoined: new function(player){

        }
    };
    this.init = function(){
        this.core.createBoard("mainBoard");
    },
    this.getState = getState
    
};

module.exports = ticTacToe;