window.DeckSystem = (() => {
  let deck = JSON.parse(localStorage.getItem("kingdomDeck") || "null");
  if (!Array.isArray(deck) || deck.length !== 8) deck = window.CARDS.slice(0,8).map(c => c.id);

  let hand = [];
  let drawPile = [];

  function getDeck(){ return deck; }
  function setDeck(newDeck){ deck = newDeck; localStorage.setItem("kingdomDeck", JSON.stringify(deck)); }

  function setup(){
    hand = deck.slice(0,4).map(id => CARDS.find(c => c.id === id));
    drawPile = deck.slice(4).map(id => CARDS.find(c => c.id === id));
  }

  function getHand(){ return hand; }

  function play(index){
    if(index < 0 || index >= hand.length) return;
    const played = hand[index];
    if(drawPile.length){
      hand[index] = drawPile.shift();
      drawPile.push(played);
    }
    return played;
  }

  function buildUI(){
    const grid=document.getElementById("deckGrid");
    grid.innerHTML="";
    CARDS.forEach(card=>{
      const button=document.createElement("button");
      button.className="deckCard"+(deck.includes(card.id)?" selected":"");
      button.innerHTML=`<b>${card.name} · ${card.cost} blessing</b><small>${card.desc}</small>`;
      button.onclick=()=>{
        if(deck.includes(card.id)) deck=deck.filter(id=>id!==card.id);
        else if(deck.length<8) deck.push(card.id);
        setDeck(deck);
        buildUI();
      };
      grid.appendChild(button);
    });
    document.getElementById("deckCount").textContent=`${deck.length} / 8 selected`;
    document.getElementById("startGame").disabled=deck.length!==8;
  }

  return {getDeck,setDeck,setup,getHand,play,buildUI};
})();