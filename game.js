(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const ui={height:$('height'),best:$('best'),start:$('start-screen'),pause:$('pause-screen'),fall:$('fall-screen'),runHeight:$('run-height'),toast:$('toast'),burst:$('burst-status'),freeze:$('freeze-status'),touchBurst:$('touch-burst'),touchFreeze:$('touch-freeze')};
let W=0,H=0,dpr=1,last=0,raf=0,toastTimer=0;
const WORLD={width:900,gravity:1900,ground:0,goal:5200};
const input={left:false,right:false,jump:false,burst:false,freeze:false};
let state='title',player,platforms=[],particles=[],cameraY=0,best=Number(localStorage.getItem('ccc-best')||0),runBest=0,checkpoint=0,highest=0,levelSeed=0,freezeTime=0,burstReady=false,freezeReady=false,charging=0,chargeStart=0,trail=[],elapsed=0;
ui.best.textContent=best+'m';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();
function platform(x,y,w,type='normal'){return {x,y,w,h:16,type,used:false}}
function makeWorld(){platforms=[platform(0,0,900,'start')];let y=105,x=350;while(y<WORLD.goal+1000){let gap=rand(95,155),w=rand(105,185);x=clamp(x+rand(-260,260),25,900-w-25);let type=Math.random()<.13?'bouncy':Math.random()<.12?'crumble':'normal';platforms.push(platform(x,y,w,type));y+=gap;}for(let n=1;n<=5;n++){let cy=n*1000;platforms.push(platform(90,cy,180,'checkpoint'));}platforms.sort((a,b)=>a.y-b.y)}
function reset(){levelSeed++;makeWorld();player={x:W/2-17,y:20,vx:0,vy:0,w:34,h:34,onGround:false,face:1,dead:false};cameraY=0;highest=0;runBest=0;checkpoint=0;particles=[];trail=[];charging=0;freezeTime=0;elapsed=0;burstReady=false;freezeReady=false;updateHUD();state='playing';hideOverlays();showToast('FIND YOUR RHYTHM. KEEP CLIMBING.')}
function hideOverlays(){ui.start.classList.add('hidden');ui.pause.classList.add('hidden');ui.fall.classList.add('hidden')}
function showToast(s){ui.toast.textContent=s;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100)}
function updateHUD(){let h=Math.max(0,Math.floor(highest/10));ui.height.textContent=h+'m';ui.best.textContent=best+'m';burstReady=highest>=9000;freezeReady=highest>=18000;ui.burst.classList.toggle('ready',burstReady);ui.burst.classList.toggle('locked',!burstReady);ui.freeze.classList.toggle('ready',freezeReady);ui.freeze.classList.toggle('locked',!freezeReady);ui.burst.querySelector('small').textContent=burstReady?'READY · SHIFT':'Unlock at 900m';ui.freeze.querySelector('small').textContent=freezeReady?'READY · E':'Unlock at 1,800m';ui.touchBurst.disabled=!burstReady;ui.touchFreeze.disabled=!freezeReady}
function screenY(y){return H-(y-cameraY)}
function burst(){if(state!=='playing'||!burstReady||player.dead||player.onGround)return;burstReady=false;player.vx=player.face*690;player.vy=680;emit(player.x+player.w/2,player.y+player.h/2,'#d7ff76',18);showToast('BURST!');updateHUD()}
function freeze(){if(state!=='playing'||!freezeReady||player.dead||player.onGround)return;freezeReady=false;freezeTime=1.05;player.vy=Math.max(player.vy,0);emit(player.x+17,player.y+17,'#83eaff',20);showToast('TIME TO THINK.');updateHUD()}
function emit(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-210,210),vy:rand(-130,250),life:rand(.35,.85),max:.85,size:rand(2,6),color})}
function land(p){player.y=p.y+player.h;player.vy=p.type==='bouncy'?820:0;player.onGround=true;if(p.type==='bouncy'){emit(player.x+17,p.y,'#ff9bc7',12);showToast('BOING!')}if(p.type==='crumble'&&!p.used){p.used=true;p.fallAt=elapsed+.42}if(p.type==='checkpoint'&&p.y>checkpoint){checkpoint=p.y;showToast('CHECKPOINT REACHED');}}
function die(){if(state!=='playing')return;state='fall';runBest=Math.max(0,Math.floor(highest/10));if(runBest>best){best=runBest;localStorage.setItem('ccc-best',best);ui.best.textContent=best+'m'}ui.runHeight.textContent=runBest+'m';ui.fall.classList.remove('hidden')}
function update(dt){if(state!=='playing')return;elapsed+=dt;dt=Math.min(dt,.033);if(player.dead)return;
 const dir=(input.right?1:0)-(input.left?1:0);if(dir){player.face=dir;player.vx+=dir*2100*dt}else player.vx*=Math.pow(.0008,dt);player.vx=clamp(player.vx,-390,390);
 if(input.jump&&player.onGround){charging=Math.min(1,charging+dt*1.15)}
 if(!input.jump&&charging>0&&player.onGround){let power=clamp(charging,0,1);player.vy=470+power*750;player.vx+=player.face*(90+power*210);player.onGround=false;emit(player.x+17,player.y,'#d7ff76',8);charging=0}
 if(!player.onGround&&input.jump&&charging===0){}if(freezeTime>0){freezeTime-=dt;player.vy=0}else player.vy-=WORLD.gravity*dt;
 let oldY=player.y;player.x+=player.vx*dt;player.y+=player.vy*dt;player.x=clamp(player.x,0,WORLD.width-player.w);
 player.onGround=false;
 if(player.vy<=0){for(const p of platforms){if(p.fallAt&&elapsed>=p.fallAt){p.y=-99999;continue}if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY>=p.y+player.h-2&&player.y<=p.y+player.h){land(p);break}}}
 highest=Math.max(highest,player.y);if(highest>checkpoint+1000&&checkpoint>0)checkpoint=highest-1000;
 const target=Math.max(0,player.y-H*.43);cameraY+=(target-cameraY)*Math.min(1,dt*5.5);
 if(player.y<cameraY-180)die();
 if(highest>=9000&&!burstReady&&!ui.burst.classList.contains('ready')){burstReady=true;showToast('NEW ABILITY: BURST · SHIFT');updateHUD()}
 if(highest>=18000&&!freezeReady&&!ui.freeze.classList.contains('ready')){freezeReady=true;showToast('NEW ABILITY: FREEZE · E');updateHUD()}
 if(highest>=WORLD.goal){state='won';showToast('YOU MADE IT TO THE TOP!')}
 if(highest/10>best){best=Math.floor(highest/10);ui.best.textContent=best+'m';localStorage.setItem('ccc-best',best)}
 if(Math.floor(highest/10)%10===0){}ui.height.textContent=Math.floor(highest/10)+'m';
 for(const p of platforms)if(p.type==='crumble'&&p.fallAt&&elapsed>=p.fallAt)p.y=-99999;
 for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=500*dt;if(p.life<=0)particles.splice(i,1)}
 if(!player.onGround&&Math.abs(player.vy)>50){trail.push({x:player.x+17,y:player.y+17,life:.18});if(trail.length>8)trail.shift()}for(let t of trail)t.life-=dt;trail=trail.filter(t=>t.life>0);
}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function draw(){ctx.clearRect(0,0,W,H);let sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#202c4c');sky.addColorStop(.55,'#17233d');sky.addColorStop(1,'#10172b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // distant soft stars and drifting cloud bands
 for(let i=0;i<65;i++){let x=(i*137.7)%W,y=((i*83.3+cameraY*.13)%(H+40))-20;ctx.globalAlpha=.15+(i%4)*.07;ctx.fillStyle='#dce8ff';ctx.fillRect(x,y,2,2)}ctx.globalAlpha=1;
 for(let layer=0;layer<3;layer++){let yy=((cameraY*.22+layer*260)%H);ctx.fillStyle=['#26375a','#223252','#1d2b49'][layer];for(let i=-1;i<4;i++){let x=i*W/2+((layer*71)%100);ctx.beginPath();ctx.ellipse(x,yy+layer*95,W*.36,22,0,0,Math.PI*2);ctx.fill()}}
 // world platforms
 let scale=W/WORLD.width;ctx.save();ctx.scale(scale,1);for(const p of platforms){let sy=screenY(p.y);if(sy<-40||sy>H+40)continue;let col=p.type==='checkpoint'?'#d7ff76':p.type==='bouncy'?'#ff91bd':p.type==='crumble'?'#f8c875':'#a9c6e9';ctx.fillStyle=col;rounded(p.x*1,sy,WORLD.width*0+p.w, p.h,7);ctx.fill();ctx.fillStyle='#ffffff55';rounded(p.x+5,sy+3,p.w-10,3,2);ctx.fill();if(p.type==='checkpoint'){ctx.fillStyle='#d7ff76';ctx.font='11px DM Mono';ctx.fillText('CHECKPOINT',p.x+12,sy-9)}}
 // goal marker
 if(screenY(WORLD.goal)>-80&&screenY(WORLD.goal)<H+100){ctx.fillStyle='#d7ff76';ctx.fillRect(0,screenY(WORLD.goal),WORLD.width,5);ctx.font='bold 20px Space Grotesk';ctx.fillText('THE TOP',30,screenY(WORLD.goal)-15)}
 // particles
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,screenY(p.y)-p.size/2,p.size,p.size)}ctx.globalAlpha=1;
 // jump charge ring
 if(player&&state!=='title'){let px=(player.x+17),py=screenY(player.y+17);for(const t of trail){ctx.globalAlpha=t.life/.18*.2;ctx.fillStyle='#d7ff76';ctx.beginPath();ctx.arc(t.x,screenY(t.y),5,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 ctx.save();ctx.translate(px,py);ctx.rotate(player.vx*.00045);if(charging>0){ctx.strokeStyle='#d7ff76';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,29,-Math.PI/2,-Math.PI/2+Math.PI*2*charging);ctx.stroke()}
 ctx.shadowColor='#d7ff7666';ctx.shadowBlur=18;let g=ctx.createLinearGradient(-16,-18,17,17);g.addColorStop(0,'#f2ffc1');g.addColorStop(1,'#a8e64e');ctx.fillStyle=g;rounded(-17,-17,34,34,8);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;rounded(-11,-11,22,22,5);ctx.stroke();ctx.restore()}
 ctx.restore();
 // subtle vignette
 let v=ctx.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.8);v.addColorStop(0,'transparent');v.addColorStop(1,'#050a1880');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
 if(state==='won'){ctx.fillStyle='#0b1226bb';ctx.fillRect(0,0,W,H);ctx.fillStyle='#d7ff76';ctx.textAlign='center';ctx.font='bold 42px Space Grotesk';ctx.fillText('YOU MADE IT!',W/2,H/2);ctx.textAlign='start'}
}
function frame(t){let dt=(t-last)/1000||0;last=t;update(dt);draw();raf=requestAnimationFrame(frame)}
raf=requestAnimationFrame(frame);
function pause(){if(state==='playing'){state='paused';ui.pause.classList.remove('hidden')}else if(state==='paused'){state='playing';ui.pause.classList.add('hidden')}}
$('play-button').addEventListener('click',reset);$('resume-button').addEventListener('click',pause);$('pause-button').addEventListener('click',pause);
$('restart-button').addEventListener('click',reset);$('again-button').addEventListener('click',reset);$('fall-menu-button').addEventListener('click',()=>{state='title';ui.fall.classList.add('hidden');ui.start.classList.remove('hidden')});
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' ','ArrowUp'].includes(e.key))e.preventDefault();if(e.repeat)return;if(e.key==='Escape'||e.key==='p'){pause();return}if(e.key===' '||e.key==='ArrowUp'||e.key==='w')input.jump=true;if(e.key==='ArrowLeft'||e.key==='a')input.left=true;if(e.key==='ArrowRight'||e.key==='d')input.right=true;if(e.key==='Shift')burst();if(e.key==='e')freeze()});
addEventListener('keyup',e=>{if(e.key===' '||e.key==='ArrowUp'||e.key==='w')input.jump=false;if(e.key==='ArrowLeft'||e.key==='a')input.left=false;if(e.key==='ArrowRight'||e.key==='d')input.right=false});
document.querySelectorAll('[data-hold]').forEach(btn=>{const key=btn.dataset.hold;const down=e=>{e.preventDefault();if(key==='burst'){burst();return}if(key==='freeze'){freeze();return}input[key]=true};const up=e=>{e.preventDefault();if(key==='jump')input.jump=false;else input[key]=false};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
})();
