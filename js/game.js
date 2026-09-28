window.Game = (() => {
const canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d");
const W=1000,H=760,riverY=380,laneX=[330,670];
const sprites={};
function loadSprite(name){
 const img=new Image();
 img.src="assets/"+name+".png";
 sprites[name]=img;
}
["shepherd","disciple","guard","light","tower_player","tower_ai"].forEach(loadSprite);
function spriteReady(name){return sprites[name]&&sprites[name].complete&&sprites[name].naturalWidth>0;}

let units=[],particles=[],mana=5,aiBlessing=5,time=180,selected=null,gameOver=false,last=performance.now(),aiThink=1.5,effects=[],floaters=[];
const towers=[
 {team:"player",x:500,y:705,hp:3000,max:3000,kind:"king",range:270,dmg:78,rate:.75,last:0},
 {team:"player",x:330,y:650,hp:1900,max:1900,kind:"tower",range:230,dmg:52,rate:.8,last:0,lane:0},
 {team:"player",x:670,y:650,hp:1900,max:1900,kind:"tower",range:230,dmg:52,rate:.8,last:0,lane:1},
 {team:"ai",x:500,y:55,hp:3000,max:3000,kind:"king",range:270,dmg:78,rate:.75,last:0},
 {team:"ai",x:330,y:110,hp:1900,max:1900,kind:"tower",range:230,dmg:52,rate:.8,last:0,lane:0},
 {team:"ai",x:670,y:110,hp:1900,max:1900,kind:"tower",range:230,dmg:52,rate:.8,last:0,lane:1}
];
function spawn(card,team,lane){
 const y=team==="player"?575:185;
 units.push({team,x:laneX[lane]+Math.random()*34-17,y,hp:card.hp,max:card.hp,dmg:card.dmg,range:card.range,speed:card.speed,rate:card.rate,last:0,color:card.color,name:card.name,lane,age:0});
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function burst(x,y,color,count=8){for(let i=0;i<count;i++)particles.push({x,y,r:2+Math.random()*4,vx:(Math.random()-.5)*70,vy:(Math.random()-.5)*70,life:.55,max:.55,color})}
function cardArrival(x,y,color){for(let i=0;i<18;i++)effects.push({x:x+(Math.random()-.5)*28,y:y+(Math.random()-.5)*28,r:4+Math.random()*10,life:.7,max:.7,color,spin:Math.random()*6})}
function holyBurst(x,y,color="#f7d875"){
 for(let i=0;i<20;i++){
   const a=Math.random()*Math.PI*2, s=50+Math.random()*150;
   particles.push({x,y,r:2+Math.random()*4,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.8,max:.8,color});
 }
 effects.push({x,y,r:8,life:.65,max:.65,color,spin:0});
}
function drawEffects(dt){effects.forEach(e=>{e.life-=dt;e.r+=45*dt;ctx.globalAlpha=Math.max(0,e.life/e.max);ctx.strokeStyle=e.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1});effects=effects.filter(e=>e.life>0)}
function hpbar(x,y,w,h,hp,max){ctx.fillStyle="#07100bdd";ctx.fillRect(x-w/2,y,w,h);ctx.fillStyle=hp/max>.5?"#65df77":hp/max>.25?"#f2ca57":"#e55b5b";ctx.fillRect(x-w/2,y,w*Math.max(0,hp/max),h);ctx.strokeStyle="#ffffff55";ctx.strokeRect(x-w/2,y,w,h)}
function drawBackground(){
 ctx.fillStyle="#163522";ctx.fillRect(0,0,W,H);
 // Rich grass bands
 for(let y=0;y<H;y+=24){
   ctx.fillStyle=(Math.floor(y/24)%2===0)?"#1a3d27":"#173722";
   ctx.fillRect(0,y,W,24);
 }
 // Stone banks around the river
 ctx.fillStyle="#405347";ctx.fillRect(0,riverY-52,W,12);ctx.fillRect(0,riverY+40,W,12);
 for(let x=0;x<W;x+=44){
   ctx.strokeStyle="#73857a55";ctx.strokeRect(x,riverY-52,44,12);
   ctx.strokeRect(x,riverY+40,44,12);
 }
 // River
 ctx.fillStyle="#286f96";ctx.fillRect(0,riverY-40,W,80);
 for(let x=0;x<W;x+=42){
   ctx.strokeStyle="#72b3cc77";ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(x,riverY-15);
   ctx.quadraticCurveTo(x+10,riverY-22,x+21,riverY-15);
   ctx.quadraticCurveTo(x+31,riverY-8,x+42,riverY-15);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x+8,riverY+16);
   ctx.quadraticCurveTo(x+18,riverY+9,x+29,riverY+16);ctx.stroke();
 }
 // Bridges with rails and planks
 laneX.forEach(x=>{
   ctx.fillStyle="#684525";ctx.fillRect(x-58,riverY-50,116,100);
   ctx.fillStyle="#b97b43";
   for(let bx=x-51;bx<=x+51;bx+=17)ctx.fillRect(bx,riverY-45,12,90);
   ctx.strokeStyle="#4b301c";ctx.lineWidth=5;ctx.strokeRect(x-58,riverY-50,116,100);
   ctx.strokeStyle="#d39a5c";ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(x-57,riverY-35);ctx.lineTo(x+57,riverY-35);ctx.moveTo(x-57,riverY+35);ctx.lineTo(x+57,riverY+35);ctx.stroke();
 });
 // Lane paths and center glow
 laneX.forEach(x=>{
   ctx.strokeStyle="#ffffff15";ctx.setLineDash([9,14]);ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(x,10);ctx.lineTo(x,riverY-53);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x,riverY+53);ctx.lineTo(x,H-10);ctx.stroke();
   ctx.setLineDash([]);
 });
 // Decorative grass tufts
 for(let i=0;i<34;i++){
   const x=(i*97)%W, y=(i*53+31)%(H-110);
   if(Math.abs(y-riverY)<65)continue;
   ctx.strokeStyle="#8db06b55";ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(x,y+5);ctx.lineTo(x-3,y-2);ctx.moveTo(x,y+5);ctx.lineTo(x+4,y-3);ctx.stroke();
 }
}
function drawTower(t){
 if(t.hp<=0)return;
 const w=t.kind==="king"?92:76,h=t.kind==="king"?86:70;
 ctx.save();ctx.translate(t.x,t.y);
 // shadow
 ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(5,h/2+12,w*.62,10,0,0,Math.PI*2);ctx.fill();
 // body
 const towerSprite=t.team==="player"?"tower_player":"tower_ai";
 if(spriteReady(towerSprite)){
   ctx.drawImage(sprites[towerSprite],-w/2,-h/2,w,h+18);
 }else{
   ctx.fillStyle=t.team==="player"?"#4f79b5":"#a95353";ctx.fillRect(-w/2,-h/2,w,h);
 }
 ctx.fillStyle=t.team==="player"?"#7099d0":"#c96b6b";ctx.fillRect(-w/2+7,-h/2+7,w-14,10);
 // stone blocks
 ctx.strokeStyle="#26313d88";ctx.lineWidth=2;
 for(let yy=-h/2+22;yy<h/2;yy+=17)ctx.beginPath(),ctx.moveTo(-w/2,yy),ctx.lineTo(w/2,yy),ctx.stroke();
 // roof
 ctx.fillStyle="#e0c77f";ctx.beginPath();ctx.moveTo(-w/2-7,-h/2);ctx.lineTo(0,-h/2-18);ctx.lineTo(w/2+7,-h/2);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#7b5c28";ctx.stroke();
 // cross
 ctx.fillStyle="#f5e7ba";ctx.fillRect(-7,-h/2+13,14,h-27);ctx.fillRect(-18,-h/2+31,36,11);
 // windows
 ctx.fillStyle="#dff5ff";ctx.fillRect(-w/2+11,-h/2+13,10,14);ctx.fillRect(w/2-21,-h/2+13,10,14);
 // banner
 ctx.fillStyle=t.team==="player"?"#315c9b":"#8b3333";ctx.fillRect(-17,h/2-3,34,18);
 ctx.fillStyle="#fff";ctx.font="bold 13px serif";ctx.textAlign="center";ctx.fillText("✝",0,h/2+10);
 ctx.restore();
 hpbar(t.x,t.y-h/2-28,t.kind==="king"?115:96,9,t.hp,t.max);
}
function drawUnit(u){
 const pulse=1+Math.sin(u.age*5)*.035;
 ctx.save();ctx.translate(u.x,u.y);ctx.scale(pulse,pulse);
 ctx.fillStyle="#0009";ctx.beginPath();ctx.ellipse(0,23,22,8,0,0,Math.PI*2);ctx.fill();

 const key = u.name==="Shepherd"?"shepherd":
             u.name==="Disciple"?"disciple":
             u.name==="Temple Guard"?"guard":
             u.name==="Light"?"light":null;
 if(key && spriteReady(key)){
   ctx.drawImage(sprites[key],-32,-42,64,64);
 }else{
   ctx.fillStyle=u.color;ctx.strokeStyle=u.team==="player"?"#a7d8ff":"#ffaaaa";ctx.lineWidth=3;
   ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle="#ffffff55";ctx.beginPath();ctx.arc(-6,-7,7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle="#fff";ctx.font="bold 18px serif";ctx.textAlign="center";ctx.fillText(u.name==="Light"?"✦":"✝",0,6);
 }
 ctx.strokeStyle=u.team==="player"?"#8bd0ff66":"#ff777766";ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(0,0,25+Math.sin(u.age*4)*2,0,Math.PI*2);ctx.stroke();
 ctx.restore();
 hpbar(u.x,u.y-34,52,6,u.hp,u.max);
 ctx.fillStyle="#fff";ctx.font="bold 10px system-ui";ctx.textAlign="center";
 ctx.shadowColor="#000";ctx.shadowBlur=3;ctx.fillText(u.name,u.x,u.y-42);ctx.shadowBlur=0;
}
function draw(){ctx.clearRect(0,0,W,H);drawBackground();towers.forEach(drawTower);units.forEach(drawUnit);particles.forEach(p=>{ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1})}
function chooseTarget(u){
 // Units first fight opposing units in their own lane.
 const enemyUnits=units.filter(v=>v.team!==u.team&&v.hp>0&&v.lane===u.lane);
 if(enemyUnits.length)return enemyUnits.sort((a,b)=>dist(u,a)-dist(u,b))[0];
 // Then attack ONLY an opposing tower. Prefer the tower in the same lane.
 const enemyTowers=towers.filter(t=>t.team!==u.team&&t.hp>0);
 const laneTower=enemyTowers.find(t=>t.kind==="tower"&&t.lane===u.lane);
 if(laneTower)return laneTower;
 return enemyTowers.find(t=>t.kind==="king")||null;
}
function update(dt){
 if(gameOver)return;
 time=Math.max(0,time-dt);if(time<=0)return finish("TIME!");
 mana=Math.min(10,mana+dt*.75);
 aiBlessing=Math.min(10,aiBlessing+dt*.70);
 aiThink-=dt;
 if(aiThink<=0){
   aiThink=2.0+Math.random()*2.0;
   const affordable=CARDS.filter(c=>c.cost<=aiBlessing);
   if(affordable.length){
     const c=affordable[Math.floor(Math.random()*affordable.length)];
     aiBlessing-=c.cost;
     spawn(c,"ai",Math.random()<.5?0:1);
   }
 }
 units.forEach(u=>{
   if(u.hp<=0)return;u.age+=dt;
   const target=chooseTarget(u);if(!target)return;const d=dist(u,target);
   if(d<=u.range){u.last-=dt;if(u.last<=0){u.last=u.rate;target.hp-=u.dmg;burst(target.x,target.y,u.team==="player"?"#ffe27a":"#ff7777",5)}}
   else{const dx=target.x-u.x,dy=target.y-u.y,l=Math.hypot(dx,dy)||1;u.x+=dx/l*u.speed*dt;u.y+=dy/l*u.speed*dt}
 });
 towers.forEach(t=>{if(t.hp<=0)return;t.last-=dt;if(t.last>0)return;const target=units.filter(u=>u.team!==t.team&&u.hp>0&&dist(t,u)<=t.range).sort((a,b)=>dist(t,a)-dist(t,b))[0];if(target){t.last=t.rate;target.hp-=t.dmg;burst(target.x,target.y,"#fff",6)}});
 units=units.filter(u=>u.hp>0);drawEffects(dt);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt});particles=particles.filter(p=>p.life>0);
 const aiKing=towers.find(t=>t.team==="ai"&&t.kind==="king"),playerKing=towers.find(t=>t.team==="player"&&t.kind==="king");
 if(aiKing.hp<=0)finish("VICTORY!");else if(playerKing.hp<=0)finish("DEFEAT");
}
function finish(text){gameOver=true;document.getElementById("result").textContent=text;document.getElementById("message").style.display="block";document.getElementById("restart").style.display="inline-block"}
function deploy(x,y){
 if(selected===null||gameOver)return;const hand=DeckSystem.getHand(),card=hand[selected];if(!card||mana<card.cost)return;if(y<riverY+20||y>690)return;
 mana-=card.cost;const lane=x<500?0:1;spawn(card,"player",lane);cardArrival(laneX[lane],575,card.color||"#ffe27a");const playedIndex=selected;DeckSystem.play(selected);selected=null;UI.renderHand();UI.animateReplacement(playedIndex);
}
canvas.addEventListener("click",e=>{const r=canvas.getBoundingClientRect();deploy((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)});
function start(){units=[];particles=[];effects=[];mana=5;aiBlessing=5;time=180;selected=null;gameOver=false;DeckSystem.setup();UI.renderHand();last=performance.now();requestAnimationFrame(loop)}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();UI.update(mana,time,selected);requestAnimationFrame(loop)}
return {start,select:i=>{selected=i}};
})();
