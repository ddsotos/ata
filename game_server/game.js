'use strict';
const crypto = require('crypto');
const socket = require('socket.io-client/lib/socket');
const gameObj = {
  internalGame: require('../game_server/InternalGame'),
  players: new Array(),
  dealerDrawCount: 0
};

class Player{
  constructor(socketID, playerName, playerID){
    this.socketID = socketID;
    this.playerName = playerName;
    this.playerID = playerID
    this.state = "準備未完了";
    this.score = 0;
    this.disconnected = false;
    this.giveup = false;
  }
  WinARound(){
    this.score++;
    this.state = "勝者";
  }
  Disconnect(){
    this.disconnected = true;
  }
  GiveUp(){
    this.giveup = true;
  }
}

function OnNewConnection(socketID, playerName, playerID){
  console.log('onNewConnection');
  if(FindPlayerByName(playerName)){
    if(!TryToReplaceDisconnectedPlayer(socketID, playerName)){
      OnNewConnection(socketID, playerName + "(2)", playerID);
    }
  } else {
    AddPlayer(socketID, playerName, playerID);
  }
}

function AddPlayer(socketID, playerName, playerID){
  var player = new Player(socketID, playerName, playerID);
  gameObj.players.push(player);
}

function onPlayerPrepaired(socketID){
  var player = FindPlayerByID(socketID);
  if(player){
    player.state = "準備完了";
  }
}

function JsonPlayerState(){
  return JSON.stringify(gameObj.players);
}

function FindPlayerByID(socketID){
  return gameObj.players.find(player => 
    player.socketID == socketID
  );
}

function FindPlayerByName(name){
  return gameObj.players.find(player => 
    player.playerName == name
  );
}

function FindPlayerByPlayerID(playerID){
  return gameObj.players.find(player => 
    player.playerID == playerID
  );
}


function disconnect(socketID) {
  if(FindPlayerByID(socketID))
  {
    FindPlayerByID(socketID).Disconnect();
  }
  console.log("disconnectを検知")
}

function Exclude(socketID) {
  gameObj.players = gameObj.players.filter(player => 
    player.socketID != socketID
  );
  console.log("disconnectを検知")
}


function InitInternalGame() {
  gameObj.internalGame.init(gameObj.players);
  gameObj.players.forEach(player =>{
    player.state = "選択中";
  });
  gameObj.players[0].state = "親";  
}

function ResetGame() {
  gameObj.internalGame.reset();
  gameObj.players = gameObj.players.filter(player=> player.disconnected == false);
  gameObj.players.forEach(player =>{
    player.state = "準備未完了";
    player.score = 0;
  })
  gameObj.dealerDrawCount = 0;
}

function HaveAllPlayersSelected(){
  return gameObj.players.filter(player =>player.state == "選択中").length == 0;
}

function CanInitGame() {
  return gameObj.players.length > 1 &&
         gameObj.players.filter(player =>player.state == "準備未完了").length == 0;
}

function PublishEachGameState(rootIo){
  gameObj.players.forEach(player =>{
    const handData = GetHandData(player.socketID);
    rootIo.to(player.socketID).emit('privateGameState', handData);
  });
}

function GetHandData(socketID){
  var player = FindPlayerByID(socketID);
  return JSON.stringify(gameObj.internalGame.internalGamePlayers.find(intplayer => intplayer.playerID == player.playerID).hand);
}

function DealerSocketID(){
  return gameObj.players.find(player =>player.state == "親").socketID;
}

function OnThingCardSelected(socketID, thingCardName){
  var player = FindPlayerByID(socketID);
  if(!player){return};
  console.log(player.playerName + "が"　+ thingCardName + "を選択しました");
  if(player.state != "選択中")return;
  gameObj.internalGame.OnThingCardSelected(player.playerID, thingCardName);
  player.state = "選択済み";
}

function OnAnswerCardSelected(thingCardName){
  console.log("選ばれたのは"　+ thingCardName + "でした");
  let player = GetPlayerWhoSelects(thingCardName);
  if(player){
    player.WinARound();
  }
  else{
    console.log("親は減点すべし");
    let dealer = gameObj.players.find(player =>player.state == "親");
    if(dealer.score > 0){dealer.score = dealer.score - 1;}
  }
}

function GetPlayerWhoSelects(thingCardName){
  let playerID = gameObj.internalGame.GetPlayerIDOfPlayerWhoSelected(thingCardName);
  return FindPlayerByPlayerID(playerID);
}

function PrepairForSelectionPhase(){
  gameObj.internalGame.PrepairForSelectionPhase(gameObj.players.find(player =>player.state == "親").playerID);
}

function GetCurrentDescription(){
  return gameObj.internalGame.currentDescriptionCard.name;
}

function OnDealerDrawACard(){
  gameObj.dealerDrawCount++;
  return gameObj.internalGame.selections.slice(0,gameObj.dealerDrawCount);
}

function HasDealerDrawnAllAnswers(){
  return gameObj.dealerDrawCount >= gameObj.internalGame.selections.length;
}

function NeedReset(){
  return gameObj.players.length < 2;
}

function StartANewRound(){
  gameObj.dealerDrawCount = 0;
  gameObj.internalGame.StartANewRound();
  UpdatePlayerStateForANewRound();
}


function UpdatePlayerStateForANewRound(){
  gameObj.players = gameObj.players.filter(player => player.giveup == false);
  let nextDealerIndex = 0;
  for(let i = 0; i < gameObj.players.length; i++){
    if(gameObj.players[i].state == "親"){
      nextDealerIndex = (i + 1) % gameObj.players.length;
    }
    gameObj.players[i].state ="選択中";
  }
  gameObj.players[nextDealerIndex].state = "親"
}

function TryToReplaceDisconnectedPlayer(socketID, displayName){
  let playerOfSameName = FindPlayerByName(displayName);
  if(playerOfSameName){
    if(playerOfSameName.disconnected)
    {      
      console.log("同じ奴が接続切れ");
      FindPlayerByName(displayName).disconnected = false;
      FindPlayerByName(displayName).socketID = socketID;
      return true;
    }
    else
    {
      console.log("同じ奴が接続中");
      return false;
    }
  }
  return false;
}

function OnGiveUp(socketID){
  if(FindPlayerByID(socketID))FindPlayerByID(socketID).GiveUp();
}

function HasGameStarted(){
  return gameObj.internalGame.internalGamePlayers.length != 0;
}




  module.exports = {
    OnNewConnection,
    disconnect,
    onPlayerPrepaired,
    InitInternalGame,
    PublishEachGameState,
    GetCurrentDescription,
    CanInitGame,
    OnThingCardSelected,
    JsonPlayerState,
    GetHandData,
    HaveAllPlayersSelected,
    DealerSocketID,
    PrepairForSelectionPhase,
    OnDealerDrawACard,
    HasDealerDrawnAllAnswers,
    OnAnswerCardSelected,
    GetPlayerWhoSelects,
    StartANewRound,
    ResetGame,
    TryToReplaceDisconnectedPlayer,
    OnGiveUp,
    NeedReset,
    Exclude,
    HasGameStarted,
    FindPlayerByID
  };
