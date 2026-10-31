(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const ui={height:$('height'),best:$('best'),start:$('start-screen'),pause:$('pause-screen'),fall:$('fall-screen'),runHeight:$('run-height'),toast:$('toast'),burst:$('burst-status'),freeze:$('freeze-status'),touchBurst:$('touch-burst'),touchFreeze:$('touch-freeze')};
let W=0,H=0,dpr=1,last=0,toastTimer=0;
const WORLD={width:900,gravity:1900,goal:52000};
const input={left:false,right:false,jump:false};
let state='title',player=null,platforms=[],particles=[],trail=[],cameraY=0;
let best=Number(localStorage.getItem('ccc-best')||0),checkpoint=0,highest=0,elapsed=0,charging=0,freezeTime=0,burstCooldown=0,freezeCooldown=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a),scale=()=>W/WORLD.width,viewH=()=>H/scale();
ui.best.textContent=best+'m';
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();
function platform(x,y,w,type='normal'){return{x,y,w,h:16,type,fallAt:0}}
function makeWorld(){
 platforms=[platform(0,0,WORLD.width,'start')];let y=105,x=350;
 while(y<WORLD.goal+700){let w=rand(115,185);x=clamp(x+rand(-250,250),20,WORLD.width-w-20);let roll=Math.random(),type=roll<.12?'bouncy':roll<.23?'crumble':'normal';platforms.push(platform(x,y,w,type));y+=rand(95,150)}
 for(let n=1;n<=52;n++)platforms.push(platform(90,n*1000,180,'checkpoint'));
 platforms.sort((a,b)=>a.y-b.y);
}
function hideOverlays(){ui.start.classList.add('hidden');ui.pause.classList.add('hidden');ui.fall.classList.add('hidden')}
function showToast(s){ui.toast.textContent=s;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100)}
function updateHUD(){
 const meters=Math.floor(highest/10),burstUnlocked=highest>=9000,freezeUnlocked=highest>=18000;
 ui.height.textContent=meters+'m';ui.best.textContent=best+'m';
 ui.burst.classList.toggle('ready',burstUnlocked&&burstCooldown<=0);ui.burst.classList.toggle('locked',!burstUnlocked);
 ui.freeze.classList.toggle('ready',freezeUnlocked&&freezeCooldown<=0);ui.freeze.classList.toggle('locked',!freezeUnlocked);
 ui.burst.querySelector('small').textContent=!burstUnlocked?'Unlock at 900m':burstCooldown>0?'Recharging…':'READY · SHIFT';
 ui.freeze.querySelector('small').textContent=!freezeUnlocked?'Unlock at 1,800m':freezeCooldown>0?'Recharging…':'READY · E';
 ui.touchBurst.disabled=!burstUnlocked||burstCooldown>0;ui.touchFreeze.disabled=!freezeUnlocked||freezeCooldown>0;
}
function screenY(y){return viewH()-(y-cameraY)}
function emit(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-210,210),vy:rand(-130,250),life:rand(.35,.8),max:.8,size:rand(2,6),color})}
function spawnAt(y,keepCheckpoint=false){
 makeWorld();player={x:keepCheckpoint?140:W/(2*scale())-17,y:y+16,vx:0,vy:0,w:34,h:34,onGround:true,face:1};
 cameraY=Math.max(0,y-viewH()*.42);highest=y;charging=0;freezeTime=0;burstCooldown=0;freezeCooldown=0;elapsed=0;particles=[];trail=[];
 updateHUD();state='playing';hideOverlays();showToast(keepCheckpoint?'CHECKPOINT RESPAWN. YOU GOT THIS.':'FIND YOUR RHYTHM. KEEP CLIMBING.');
}
function reset(){checkpoint=0;spawnAt(0)}
function pause(){if(state==='playing'){state='paused';ui.pause.classList.remove('hidden')}else if(state==='paused'){state='playing';ui.pause.classList.add('hidden')}}
function burst(){if(state!=='playing'||highest<9000||burstCooldown>0||player.onGround)return;burstCooldown=3;player.vx=player.face*690;player.vy=680;emit(player.x+17,player.y+17,'#d7ff76',18);showToast('BURST!');updateHUD()}
function freeze(){if(state!=='playing'||highest<18000||freezeCooldown>0||player.onGround)return;freezeCooldown=7;freezeTime=1.05;player.vy=0;emit(player.x+17,player.y+17,'#83eaff',20);showToast('TIME TO THINK.');updateHUD()}
function land(p){
 player.y=p.y+player.h;player.vy=p.type==='bouncy'?820:0;player.onGround=true;
 if(p.type==='bouncy'){emit(player.x+17,p.y,'#ff9bc7',12);showToast('BOING!')}
 if(p.type==='crumble'&&!p.fallAt)p.fallAt=elapsed+.48;
 if(p.type==='checkpoint'&&p.y>checkpoint){checkpoint=p.y;showToast('CHECKPOINT REACHED');}
}
function die(){if(state!=='playing')return;state='fall';ui.runHeight.textContent=Math.floor(highest/10)+'m';ui.fall.classList.remove('hidden');}
function update(dt){
 if(state!=='playing'||!player)return;dt=Math.min(dt,.033);elapsed+=dt;
 burstCooldown=Math.max(0,burstCooldown-dt);freezeCooldown=Math.max(0,freezeCooldown-dt);
 const dir=(input.right?1:0)-(input.left?1:0);
 if(dir){player.face=dir;player.vx+=dir*2100*dt}else player.vx*=Math.pow(.0008,dt);
 player.vx=clamp(player.vx,-390,390);
 if(input.jump&&player.onGround)charging=Math.min(1,charging+dt*1.15);
 if(!input.jump&&charging>0&&player.onGround){const power=charging;player.vy=470+power*750;player.vx+=player.face*(90+power*210);player.onGround=false;emit(player.x+17,player.y,'#d7ff76',8);charging=0}
 if(freezeTime>0){freezeTime-=dt;player.vy=0}else player.vy-=WORLD.gravity*dt;
 const oldY=player.y;player.x+=player.vx*dt;player.y+=player.vy*dt;player.x=clamp(player.x,0,WORLD.width-player.w);player.onGround=false;
 if(player.vy<=0){for(const p of platforms){if(p.fallAt&&elapsed>=p.fallAt){p.y=-99999;continue}if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY>=p.y+player.h-2&&player.y<=p.y+player.h){land(p);break}}}
 highest=Math.max(highest,player.y);
 const target=Math.max(0,player.y-viewH()*.42);cameraY+=(target-cameraY)*Math.min(1,dt*5.5);
 if(player.y<cameraY-180)die();
 if(highest>=WORLD.goal){state='won';showToast('YOU MADE IT TO THE TOP!')}
 const meters=Math.floor(highest/10);if(meters>best){best=meters;localStorage.setItem('ccc-best',String(best))}
 for(const p of platforms)if(p.type==='crumble'&&p.fallAt&&elapsed>=p.fallAt)p.y=-99999;
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=500*dt;if(p.life<=0)particles.splice(i,1)}
 if(!player.onGround&&Math.abs(player.vy)>50){trail.push({x:player.x+17,y:player.y+17,life:.18});if(trail.length>8)trail.shift()}
 for(const t of trail)t.life-=dt;trail=trail.filter(t=>t.life>0);updateHUD();
}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function draw(){
 ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#202c4c');sky.addColorStop(.55,'#17233d');sky.addColorStop(1,'#10172b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 for(let i=0;i<65;i++){const x=(i*137.7)%W,y=((i*83.3+cameraY*.13*scale())%(H+40))-20;ctx.globalAlpha=.15+(i%4)*.07;ctx.fillStyle='#dce8ff';ctx.fillRect(x,y,2,2)}ctx.globalAlpha=1;
 const s=scale();ctx.save();ctx.scale(s,s);
 for(let layer=0;layer<3;layer++){const yy=((cameraY*.22+layer*260)%viewH());ctx.fillStyle=['#26375a','#223252','#1d2b49'][layer];for(let i=-1;i<4;i++){ctx.beginPath();ctx.ellipse(i*WORLD.width/2+layer*71,yy+layer*95,WORLD.width*.36,22,0,0,Math.PI*2);ctx.fill()}}
 for(const p of platforms){const sy=screenY(p.y);if(sy<-40||sy>viewH()+40)continue;ctx.fillStyle=p.type==='checkpoint'?'#d7ff76':p.type==='bouncy'?'#ff91bd':p.type==='crumble'?'#f8c875':'#a9c6e9';rounded(p.x,sy,p.w,p.h,7);ctx.fill();ctx.fillStyle='#ffffff55';rounded(p.x+5,sy+3,p.w-10,3,2);ctx.fill();if(p.type==='checkpoint'){ctx.fillStyle='#d7ff76';ctx.font='11px monospace';ctx.fillText('CHECKPOINT',p.x+12,sy-9)}}
 if(screenY(WORLD.goal)>-80&&screenY(WORLD.goal)<viewH()+100){ctx.fillStyle='#d7ff76';ctx.fillRect(0,screenY(WORLD.goal),WORLD.width,5);ctx.font='bold 20px sans-serif';ctx.fillText('THE TOP',30,screenY(WORLD.goal)-15)}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,screenY(p.y)-p.size/2,p.size,p.size)}ctx.globalAlpha=1;
 if(player){for(const t of trail){ctx.globalAlpha=t.life/.18*.2;ctx.fillStyle='#d7ff76';ctx.beginPath();ctx.arc(t.x,screenY(t.y),5,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 const px=player.x+17,py=screenY(player.y+17);ctx.save();ctx.translate(px,py);ctx.rotate(player.vx*.00045);if(charging>0){ctx.strokeStyle='#d7ff76';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,29,-Math.PI/2,-Math.PI/2+Math.PI*2*charging);ctx.stroke()}
 ctx.shadowColor='#d7ff7666';ctx.shadowBlur=18;const g=ctx.createLinearGradient(-16,-18,17,17);g.addColorStop(0,'#f2ffc1');g.addColorStop(1,'#a8e64e');ctx.fillStyle=g;rounded(-17,-17,34,34,8);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;rounded(-11,-11,22,22,5);ctx.stroke();ctx.restore()}
 ctx.restore();
 const vignette=ctx.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.8);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#050a1880');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 if(state==='won'){ctx.fillStyle='#0b1226bb';ctx.fillRect(0,0,W,H);ctx.fillStyle='#d7ff76';ctx.textAlign='center';ctx.font='bold 42px sans-serif';ctx.fillText('YOU MADE IT!',W/2,H/2);ctx.textAlign='start'}
}
function frame(t){const dt=(t-last)/1000||0;last=t;update(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
$('play-button').addEventListener('click',reset);$('resume-button').addEventListener('click',pause);$('pause-button').addEventListener('click',pause);$('restart-button').addEventListener('click',reset);
$('again-button').addEventListener('click',()=>{if(checkpoint>0)spawnAt(checkpoint,true);else reset()});
$('fall-menu-button').addEventListener('click',()=>{state='title';ui.fall.classList.add('hidden');ui.start.classList.remove('hidden')});
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' ','ArrowUp'].includes(e.key))e.preventDefault();if(e.repeat)return;if(e.key==='Escape'||e.key==='p'){pause();return}if(e.key===' '||e.key==='ArrowUp'||e.key==='w')input.jump=true;if(e.key==='ArrowLeft'||e.key==='a')input.left=true;if(e.key==='ArrowRight'||e.key==='d')input.right=true;if(e.key==='Shift')burst();if(e.key==='e')freeze()});
addEventListener('keyup',e=>{if(e.key===' '||e.key==='ArrowUp'||e.key==='w')input.jump=false;if(e.key==='ArrowLeft'||e.key==='a')input.left=false;if(e.key==='ArrowRight'||e.key==='d')input.right=false});
document.querySelectorAll('[data-hold]').forEach(btn=>{const key=btn.dataset.hold;const down=e=>{e.preventDefault();if(key==='burst'){burst();return}if(key==='freeze'){freeze();return}input[key]=true};const up=e=>{e.preventDefault();if(key==='jump')input.jump=false;else input[key]=false};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
})();
