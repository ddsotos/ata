'use strict';
const fs = require('fs');
const computerSelectionID = 10000;

class Deck{
    constructor(cards){
        this.cards = cards.members;
        shuffle(this.cards); 
        console.log(this.cards[0]);
    }
    Draw(){
        return this.cards.pop();
    }
}

class Selection{
    constructor(playerID, card){
        this.card = card;
        this.playerID = playerID;
    }

}

class InternalGamePlayer{
    constructor(deck, playerID){
      this.deckToDraw = deck;
      this.hand = new Array();
      this.selection;
      this.playerID = playerID; 
      this.DrawUpTo5();
    }
    DrawUpTo5(){
      while(this.hand.length < 5){
          this.hand.push(this.deckToDraw.Draw());
      }
    }
    Play(thingCardName){
        if(this.selection)return;//すでに選んでる
        for(let i = 0; i < this.hand.length; i++){
            if(this.hand[i].name == thingCardName){           
                this.hand[i] = this.deckToDraw.Draw();
            }
        }
        this.selection = new Selection(this.playerID, thingCardName);
    }
    SelectRandomlyIfYet(){
        if(this.selection)return;//すでに選んでる
        this.selection = new Selection(this.playerID,this.hand.pop());
        this.DrawUpTo5();
    }
}
  

function InternalGame(){
    this.currentDescriptionCard;
    this.internalGamePlayers = new Array();
    this.selections = new Array();
    this.thingCardDeck = new Deck(JSON.parse(fs.readFileSync('game_server/ata_things.json')));
    this.descriptionCardDeck= new Deck(JSON.parse(fs.readFileSync('game_server/ata_descriptions.json')));

    this.reset = function(){
        this.currentDescriptionCard;
        this.internalGamePlayers = new Array();
        this.selections = new Array();    
        this.thingCardDeck = new Deck(JSON.parse(fs.readFileSync('game_server/ata_things.json')));
        this.descriptionCardDeck= new Deck(JSON.parse(fs.readFileSync('game_server/ata_descriptions.json')));
    };


    this.init = function(players){
        console.log(players.length + "人でゲームを始めました");
        this.UpdateDescriptionCard();
        players.forEach(player=>
        {
          let internalplayer = new InternalGamePlayer(this.thingCardDeck, player.playerID);
          internalplayer.DrawUpTo5();
          this.internalGamePlayers.push(internalplayer);
        })
    };
    this.OnThingCardSelected = function(playerID, thingCardName){
        let player = this.internalGamePlayers[playerID];
        player.Play(thingCardName);
    }
    this.PrepairForSelectionPhase = function(dealerPlayerID){
        this.selections.length = 0;
        this.internalGamePlayers.forEach(player => {
            if(player.playerID == dealerPlayerID)return;
            player.SelectRandomlyIfYet();
            this.selections.push(player.selection);
        })
        this.selections.push(new Selection(computerSelectionID, this.thingCardDeck.Draw().name));
        shuffle(this.selections);
        if(this.selections.length != this.internalGamePlayers.length)//親が出さない分、コンピューターが一枚だす
        {
          console.log("エラー：人が選んだカードを集めたが、数が足りない");
        }     
    }
    this.GetPlayerIDOfPlayerWhoSelected = function(thingCardName){
        return this.selections.find(selection => 
            selection.card == thingCardName
            ).playerID;
    }

    this.UpdateDescriptionCard = function(){
        this.currentDescriptionCard = this.descriptionCardDeck.Draw();
    }

    this.StartANewRound = function(){
        this.UpdateDescriptionCard();
        this.selections = new Array();
        this.internalGamePlayers.forEach(player => {
            player.selection = null;
        })
    }

    


}


let shuffle = function(array){
    let m = array.length;
    let seed =Date.now();
    while (m) {
        const i = Math.floor(Math.random(seed) * m--);
        [array[m], array[i]] = [array[i], array[m]];
    }
}

let internalGame = new InternalGame();
module.exports = internalGame;