'use strict';

import $ from 'jquery';
import io from 'socket.io-client';

var gameState ={
  PrepairingAGame: 0,
  SelectingACard: 1,
  WaitingForAllPlayersToSelect: 2,
  DealerIsSelecting: 3,
  SelectingAsADealer: 4,
  Scoring: 5,
}
var myState;

const UpdatePlayerState = function(jsonPlayerState){
  let playerState = JSON.parse(jsonPlayerState);
  $("#player_state_list").empty();
  playerState.forEach(player => {
    let text = '<div class="playerState">' + player.playerName + "<br>" + player.state + "<br>得点:" + player.score + "</div>";
    if(player.state == "勝者"){
        text = '<div class="playerState"><b>' + player.playerName + "<br>" + player.state + "<br>得点:" + player.score + "</b></div>";
    }
    $("#player_state_list").append($(text, {
      id : player.playerName
    }))
  });
}

const StateChange_SelectingAsADealer = function(){
  if(myState == gameState.SelectingAsADealer)return;
  myState = gameState.SelectingAsADealer;
  $("#top_Information").text("カードを引いていきましょう");
  $("#btn_keep_order").text("引く");
  $("#btn_keep_order").off('click');
  $("#btn_keep_order").click(() => {
    console.log('DealerDrawACard');
    socket.emit('onDealerDrawACard', 0);
  })
  $("#btn_keep_order").show();
};

const StateChange_AnswerCardSelected = function(thingCard){
  if(myState == gameState.Scoring)return;
  myState = gameState.Scoring;
  $("#top_Information").text("選ばれたのは" + thingCard +"でした。出したのは…");
  $("#btn_keep_order").hide();
  $("#btn_keep_order").off('click');
}


const StateChange_SelectingACard = function(){
  if(myState == gameState.SelectingACard)return;
  myState = gameState.SelectingACard;
  $("#top_Information").text("お題に合ったカードを手札から選んでください");
  $("#btn_keep_order").text("選ぶ");
  $("#btn_keep_order").show();
  $("#btn_keep_order").off('click');
  $("#btn_keep_order").click(() => {
    console.log('onThingCardSelected');
    const selectedID = $('[name="hand_cards"]:checked').attr('id');
    if(!selectedID)return;
    $('[name="hand_cards"]:checked').prop("checked",false);
    socket.emit('onThingCardSelected', $('label[for=' + selectedID +']').text());
    $("#btn_keep_order").fadeOut();
  })
  $("#btn_keep_order").show();
};

const StateChange_PrepairingAGame = function(){
  if(myState == gameState.PrepairingAGame)return;
  myState = gameState.PrepairingAGame;

  $("#top_Information").text("全員(2人以上)が準備完了したら、ゲームを開始します");
  $("#btn_keep_order").text("準備完了");
  $("#btn_keep_order").off('click');
  $("#btn_keep_order").click(() => {
    console.log('joinConfirmed');
    socket.emit('onPlayerPrepaired', 0);
    $("#btn_keep_order").off('click');
  })
  $("#description_card").text("");
  ClearHand();
  ClearAnswerArea();
  $("#btn_keep_order").show();

  $("#reset-button").click(() => {
    socket.emit('resetRequest', 0);
    $("#reset-button").off();
  })
  $("#reset-button").show();
  $("#giveup-button").click(() => {
    socket.emit('giveup', 0);
    $("#giveup-button").off();
  })
  $("#giveup-button").show();
}

const StateChange_WaitingForAllPlayersToSelect = function(){
  if(myState == gameState.WaitingForAllPlayersToSelect)return;
  myState = gameState.WaitingForAllPlayersToSelect;

  console.log("StateChange_WaitingForAllPlayersToSelect");
  $("#top_Information").text("全員が選び終わるまで待ってください");
  $("#btn_keep_order").off();
  $("#btn_keep_order").hide();
}

const UpdateHand = function(privateState){    
  console.log(privateState);
  if(privateState.length != 5)
  {
    console.log("手札が5枚ないのはおかしい");
  }
  for(let i = 0; i < privateState.length; i++){
    $('label[for=my_thing_card' + i + ']').text(privateState[i].name);
    if(privateState[i].name.length > 6){
      $('label[for=my_thing_card' + i + ']').css('font-size', 'min(3vh,5vw)');
    } else if(privateState[i].name.length > 3){
      $('label[for=my_thing_card' + i + ']').css('font-size', 'min(8vh,5vw)');
    }else {
      $('label[for=my_thing_card' + i + ']').css('font-size', 'min(8vh,10vw)');
    }     
  }
};

const ClearHand = function(){    
  for(let i = 0; i < 5; i++){
    $('label[for=my_thing_card' + i + ']').text("");      
  }
};

const HighlightSelectedCard = function(thingCard){
  $(".answer_cards").each(function(index, element){
    if($(element).text() == thingCard){
      $(element).addClass("selectable");
    };});
}

const HaveAlreadySelected = function(playerState, socketID){
  let myPlayerState = MyPlayerState(playerState, socketID);
  return (myPlayerState == "選択済み" || myPlayerState == "親");
}

const MyPlayerState = function(playerState, socketID){
  let myPlayer = playerState.find(player => player.socketID == socketID);
  if(myPlayer)return myPlayer.state;
  else        return "未参加";
}

const ClearAnswerArea = function(){
  $(".answer_cards").each(function(index, element){
    $(element).hide();});
  $('[name="answer_cards"]:checked').prop("checked",false);
  $(".answer_cards").each(function(index, element){
    $(element).removeClass("selectable");
  });
}

let userName;
while(!userName || userName.length > 10){
  userName = prompt("ユーザー名を入力してください(短めだと助かる、10字以下)", "");
}
const socketQueryParameters = `displayName=${userName}`;
const socket = io($('#main').attr('data-ipAddress') + '?' + socketQueryParameters);
console.log('entry.jsに入った');



socket.on('UpdatePlayerStateRequest_Prepair', (jsonPlayerState) => {
  console.log('player state came');
  UpdatePlayerState(jsonPlayerState);
  StateChange_PrepairingAGame();
});

socket.on('UpdatePlayerStateRequest_Select', (jsonPlayerState) => {
  console.log('player state came');
  let playerState = JSON.parse(jsonPlayerState);
  UpdatePlayerState(jsonPlayerState);
  ClearAnswerArea();

  if(HaveAlreadySelected(playerState, socket.id)){
    StateChange_WaitingForAllPlayersToSelect();
  }
  else{
    StateChange_SelectingACard();
  }
});


socket.on('privateGameState', (jsonPrivateState) => {
  console.log('player private state came');
  let privateState = JSON.parse(jsonPrivateState);
  UpdateHand(privateState);
});

socket.on('OnNewDescriptionCard', (currentDescription) => { 
  console.log('new description card came');
  $("#description_card").text(currentDescription);
});




socket.on('OnSelectionPhase', (dealerSocketID) => {
  console.log('Dealer is selecting');
  if(dealerSocketID == socket.id){
    StateChange_SelectingAsADealer();
  }
  else
  {
    $("#top_Information").text("親がカードを選んでいます");
  }
});

socket.on('DealerDrawACardResult', (openCards) => {
  console.log('draw result came');
  console.log(openCards);
  for(let i = 0; i < openCards.length; i++)
  {
    $('label[for=answer_card' + i +']').text(openCards[i].card);
    if(openCards[i].name.length > 6){
      $('label[for=answer_card' + i + ']').css('font-size', 'min(3vh,5vw)');
    } else if(openCards[i].name.length > 3){
      $('label[for=answer_card' + i + ']').css('font-size', 'min(8vh,5vw)');
    }else {
      $('label[for=answer_card' + i + ']').css('font-size', 'min(8vh,10vw)');
    }     

    if($('label[for=answer_card' + i +']').is(':hidden'))
    {
      $('label[for=answer_card' + i +']').fadeIn();
    }
  }
});

socket.on('onAllAnswersDrawn', (none) => {
  console.log('onAllAnswersDrawn');
  $("#top_Information").text("最も好ましい回答を選んでください");
  $("#btn_keep_order").text("選ぶ");
  $("#btn_keep_order").off('click');
  $("#btn_keep_order").click(() => {
    console.log('onThingCardSelected');
    const selectedID = $('[name="answer_cards"]:checked').attr('id');
    if(!selectedID)return;
    socket.emit('onAnswerCardSelected', $('label[for=' + selectedID +']').text());
    $("#btn_keep_order").fadeOut();
  })
  $("#btn_keep_order").show();
});

socket.on('onAnswerCardSelected', (thingCardName) => {
  console.log('onAnswerCardSelected');
  HighlightSelectedCard(thingCardName);
  StateChange_AnswerCardSelected(thingCardName);
});

socket.on('onWinningAPoint', (thingCardName) => {
  console.log('onWinningAPoint');
  $("#btn_keep_order").text("手を挙げる");
  $("#btn_keep_order").off('click');
  $("#btn_keep_order").click(() => {
    socket.emit('onWinnerRaisingAHand', 0);
    $("#btn_keep_order").fadeOut();
  })
  $("#btn_keep_order").show();
});

socket.on('UpdatePlayerStateRequest_RoundResult', (jsonPlayerState) => {
  $("#btn_keep_order").hide();
  console.log('player state came');
  let playerState = JSON.parse(jsonPlayerState);
  UpdatePlayerState(jsonPlayerState);
  let winner = playerState.find(player => player.state == "勝者");
  if(winner){
    $("#top_Information").text("出したのは" + winner.playerName + "でした。");
  }
  else{
    $("#top_Information").text("出したのはコンピューターでした。");
  }
  let myPlayerState = MyPlayerState(playerState, socket.id);
  if(myPlayerState == "親"){
    $("#btn_keep_order").text("次のラウンドに移ります");
    $("#btn_keep_order").off('click');
    $("#btn_keep_order").click(() => {
      socket.emit('onRoundEnd', 0);
      $("#btn_keep_order").off('click');      
    })
    $("#btn_keep_order").show();
  }
});

socket.on('intrusion_Offer', (jsonPlayerState) => {
    console.log('onWinningAPoint');
    $("#top_Information").text("ゲームの途中です");
    UpdatePlayerState(jsonPlayerState);
  });
  
  socket.on('UpdatePlayerStateRequest_Intrude', (jsonPlayerState) => {
    console.log('乱入成功');
    UpdatePlayerState(jsonPlayerState);
    let playerState = JSON.parse(jsonPlayerState);
    const myPlayerState = MyPlayerState(playerState, socket.id);
    if(myPlayerState == "選択済み"){
      StateChange_WaitingForAllPlayersToSelect(); 
    } else if(myPlayerState == "選択中"){
      StateChange_SelectingACard();
    } else if(myPlayerState == "準備未完了"|| myPlayerState == "準備完了"){
      StateChange_PrepairingAGame();
    } else if(myPlayerState == "親"){
      StateChange_WaitingForAllPlayersToSelect(); 
    }
  });



/* socket.on('start data', (jsonGameState) => {
      console.log('start data came');
      let gameState = JSON.parse(jsonGameState);
      updateGameObj(gameState);
      setMarketEvent();
});
socket.on('requestResult', (jsonRequestResult) => {
      let requestResult = JSON.parse(jsonRequestResult);
      console.log('requestResult came ' + requestResult.result);
      if(requestResult.result){
        updateGameObj(requestResult.gameState);
      } else {
        updateErrorMessage(requestResult.errorMessage);
      }
});
 */



