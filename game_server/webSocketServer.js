playerCount = 0;
var flags ={
  waitForRaisingAHand: false,
  alreadyStarted: false,
  answerCardSelected:false,
}

function createWebSocketServer(io, game) {
    console.log("oncreateWebSocketServer");                           
    const rootIo = io.of('/');
    rootIo.on('connection', (socket) => {
      console.log("サーバー側でwebsocket構成中");
      const displayName = socket.handshake.query.displayName;
      console.log(displayName + "が参加表明");
     
      socket.on('disconnect', () => {
              game.disconnect(socket.id);
      });


      socket.on('onPlayerPrepaired', (indexInMarket) => {
        game.onPlayerPrepaired(socket.id);
        rootIo.emit('UpdatePlayerStateRequest_Prepair', game.JsonPlayerState());
        InitGameIfPossible(io, game);
      });

      socket.on('exclude-disconnected', (none) => {
        console.log('exclude-disconnected');
        game.ExcludeDisconnected();
        InitGameIfPossible(io, game);
      });

      socket.on('onThingCardSelected', (thingCardName) => {
        //socketidの人が実際のプレイヤーであるかチェックすべき
        game.OnThingCardSelected(socket.id, thingCardName);      
        rootIo.emit('UpdatePlayerStateRequest_Select', game.JsonPlayerState());
        socket.emit('privateGameState', game.GetHandData(socket.id));
        if(game.HaveAllPlayersSelected()){
          game.PrepairForSelectionPhase();
          rootIo.emit('OnSelectionPhase', game.DealerSocketID());
        }
      });

      socket.on('onDealerDrawACard', (thingCardName) => {
        console.log('DealerDrawACard');
        rootIo.emit('DealerDrawACardResult', game.OnDealerDrawACard());
        if(game.HasDealerDrawnAllAnswers()){
          socket.emit('onAllAnswersDrawn', 0);
        }
      });

      socket.on('onAnswerCardSelected', (thingCardName) => {
        console.log('AnswerCardSelected');
        flags.answerCardSelected = true;
        rootIo.emit('onAnswerCardSelected', thingCardName);
        game.OnAnswerCardSelected(thingCardName); 
        let player = game.GetPlayerWhoSelects(thingCardName);
        if(player){
          rootIo.to(player.socketID).emit('onWinningAPoint', 0);
        }
        flags.waitForRaisingAHand = true;
        setTimeout(()=> {
          if(flags.waitForRaisingAHand){
            flags.waitForRaisingAHand = false;
            console.log('誰も手を挙げなかったので結果公開');
            rootIo.emit('UpdatePlayerStateRequest_RoundResult', game.JsonPlayerState());
            }}, 3000);
      });

      socket.on('onWinnerRaisingAHand', (none) => {
        console.log('onWinnerRaisingAHand');
        flags.waitForRaisingAHand = false;
        rootIo.emit('UpdatePlayerStateRequest_RoundResult', game.JsonPlayerState());
      });

      socket.on('onRoundEnd', (none) => {
        console.log('onRoundEnd');
        flags.answerCardSelected = false;
        game.StartANewRound();
        if(game.NeedReset()){
          reset(rootIo, game);
        } else {     
        rootIo.emit('OnNewDescriptionCard', game.GetCurrentDescription());
        rootIo.emit('UpdatePlayerStateRequest_Select', game.JsonPlayerState());
        }
      });

      socket.on('resetRequest', (none) => {
        console.log('resetRequest');
        reset(rootIo, game)
      });

   



      socket.on('giveup', (none) => {
        console.log('giveup');
        game.OnGiveUp(socket.id);
      });

      if(flags.alreadyStarted)
      {
        if(game.TryToReplaceDisconnectedPlayer(socket.id,displayName)){
          socket.emit('OnNewDescriptionCard', game.GetCurrentDescription());
          socket.emit('privateGameState', game.GetHandData(socket.id));
          socket.emit('UpdatePlayerStateRequest_Intrude', game.JsonPlayerState());
          if(game.HaveAllPlayersSelected()){
            if(flags.answerCardSelected){
              socket.emit('UpdatePlayerStateRequest_RoundResult', game.JsonPlayerState()); 
            } else {
            socket.emit('OnSelectionPhase', game.DealerSocketID()); 
            }
          } 
        }
        else{
        socket.emit('OnNewDescriptionCard', game.GetCurrentDescription());
        socket.emit('intrusion_Offer', game.JsonPlayerState());
        }
      }
      else{
      game.OnNewConnection(socket.id, displayName,playerCount);
      rootIo.emit('UpdatePlayerStateRequest_Prepair', game.JsonPlayerState());
      playerCount++;
      }
    });
  }

  function reset(rootIo, game) {
    game.ResetGame();
    rootIo.emit('UpdatePlayerStateRequest_Prepair', game.JsonPlayerState());
    flags.alreadyStarted = false;
    flags.answerCardSelected = false;
  }

  function InitGameIfPossible(rootIo, game) {
    if(game.CanInitGame())
    {
      flags.alreadyStarted = true;
      game.InitInternalGame();
      game.PublishEachGameState(rootIo);
      rootIo.emit('OnNewDescriptionCard', game.GetCurrentDescription());
      rootIo.emit('UpdatePlayerStateRequest_Select', game.JsonPlayerState());
    }
  }


  
  module.exports = {
    createWebSocketServer
  }