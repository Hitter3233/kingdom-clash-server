window.UI = (() => {
function renderHand(){
 const el=document.getElementById("cards");el.innerHTML="";
 DeckSystem.getHand().forEach((c,i)=>{
   const b=document.createElement("button");b.className="card";b.innerHTML=`<span class="cost">${c.cost}</span><b>${c.name}</b><small>${c.desc}</small>`;
   b.onclick=()=>{if(Game)Game.select(i);document.querySelectorAll(".card").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")};
   el.appendChild(b);
 });
}
function animateReplacement(index){
 const slots=document.querySelectorAll(".card");
 if(slots[index]){slots[index].classList.remove("entering");void slots[index].offsetWidth;slots[index].classList.add("entering");}
}
function update(mana,time,selected){
 document.getElementById("manaFill").style.width=(mana*10)+"%";
 document.getElementById("manaText").textContent=`${mana.toFixed(1)} / 10 BLESSING`;
 document.getElementById("timer").textContent=`${Math.floor(time/60)}:${String(Math.ceil(time%60)).padStart(2,"0")}`;
 document.querySelectorAll(".card").forEach((el,i)=>el.classList.toggle("disabled",mana<DeckSystem.getHand()[i].cost));
}
function init(){
 DeckSystem.buildUI();
 document.getElementById("startGame").onclick=()=>{if(DeckSystem.getDeck().length===8){document.getElementById("deckScreen").style.display="none";document.getElementById("game").style.display="block";Game.start()}};
 document.getElementById("openDeck").onclick=()=>{if(!document.getElementById("message").style.display||document.getElementById("message").style.display==="none"){document.getElementById("deckScreen").style.display="block";DeckSystem.buildUI()}};
 document.getElementById("restart").onclick=()=>location.reload();
}
return {renderHand,update,init,animateReplacement};
})(); UI.init();

document.addEventListener("DOMContentLoaded", () => {
  const connect = document.getElementById("connectMp");
  const create = document.getElementById("createRoom");
  const join = document.getElementById("joinRoom");
  const server = document.getElementById("serverUrl");
  const code = document.getElementById("joinCode");

  connect?.addEventListener("click", async () => {
    try {
      await Multiplayer.connect(server.value.trim());
    } catch (e) {
      console.error(e);
    }
  });

  create?.addEventListener("click", () => Multiplayer.createRoom());

  join?.addEventListener("click", () => {
    if (code.value.trim()) Multiplayer.joinRoom(code.value);
  });
});
