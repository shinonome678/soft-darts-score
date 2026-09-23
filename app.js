(() => {
'use strict';

const ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const CRICKET_TARGETS=[20,19,18,17,16,15,'BULL'];
const DB_KEY='softDarts.games.v2',ACTIVE_KEY='softDarts.active.v2';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let games=read(DB_KEY,read('softDarts.games.v1',[])),active=read(ACTIVE_KEY,read('softDarts.active.v1',null)),zeroScore=501,dialogAction=null;

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function persist(){localStorage.setItem(DB_KEY,JSON.stringify(games));active?localStorage.setItem(ACTIVE_KEY,JSON.stringify(active)):localStorage.removeItem(ACTIVE_KEY)}
function uid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}
function nowISO(){const d=new Date(),z=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`}
function todayKey(){return nowISO().slice(0,10)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(iso){const d=new Date(iso);return`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function typeLabel(g){if(typeof g==='string')return g==='COUNT_UP'?'COUNT-UP':g==='CRICKET'?'CRICKET 練習':g==='CRICKET_VS'?'CRICKET 対戦':'01';return typeLabel(g.gameType)}
function scoreFor(type,n){if(type==='MISS')return 0;if(type==='OUTER_BULL'||type==='INNER_BULL')return 50;return n*(type==='DOUBLE'?2:type==='TRIPLE'?3:1)}
function marksFor(type,n){if(type==='OUTER_BULL')return 1;if(type==='INNER_BULL')return 2;if(![15,16,17,18,19,20].includes(n))return 0;return type==='TRIPLE'?3:type==='DOUBLE'?2:1}
function hitLabel(d){if(d.hitType==='MISS')return'MISS';if(d.hitType==='OUTER_BULL')return'OUTER BULL';if(d.hitType==='INNER_BULL')return'INNER BULL';return`${d.hitType[0]}${d.hitNumber}`}
function cricketTarget(d){return d.hitType.includes('BULL')?'BULL':CRICKET_TARGETS.includes(d.hitNumber)?d.hitNumber:null}
function show(id){$$('.screen').forEach(x=>x.classList.toggle('active',x.id===id));window.scrollTo(0,0);if(id==='home')renderHome();if(id==='records')renderRecords()}

function createBoard(){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 420 420');svg.innerHTML='<circle cx="210" cy="210" r="207" fill="#090b0e" stroke="#303943" stroke-width="4"/>';
 const rings=[{inner:181,outer:196,type:'DOUBLE'},{inner:116,outer:181,type:'SINGLE'},{inner:101,outer:116,type:'TRIPLE'},{inner:31,outer:101,type:'SINGLE'}];
 rings.forEach(r=>ORDER.forEach((num,i)=>{const p=document.createElementNS(ns,'path'),a=-99+i*18;p.setAttribute('d',arcPath(210,210,r.inner,r.outer,a,a+18));p.setAttribute('fill',sectorColor(i,r.type));p.setAttribute('stroke','#aaa8a2');p.setAttribute('stroke-width','.7');p.classList.add('wedge');p.dataset.type=r.type;p.dataset.number=num;svg.appendChild(p)}));
 ORDER.forEach((num,i)=>{const a=(-90+i*18)*Math.PI/180,t=document.createElementNS(ns,'text');t.setAttribute('x',210+202*Math.cos(a));t.setAttribute('y',210+202*Math.sin(a));t.classList.add('number');t.textContent=num;svg.appendChild(t)});
 [['OUTER_BULL',31,'#e2383f',1],['INNER_BULL',13,'#17151b',4]].forEach(([type,r,color,w])=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',210);c.setAttribute('cy',210);c.setAttribute('r',r);c.setAttribute('fill',color);c.setAttribute('stroke',type==='INNER_BULL'?'#e2383f':'#231e26');c.setAttribute('stroke-width',w);c.classList.add('wedge');c.dataset.type=type;svg.appendChild(c)});
 svg.addEventListener('click',e=>{const w=e.target.closest('.wedge');if(w)addDart(w.dataset.type,w.dataset.number?+w.dataset.number:null)});$('#board').appendChild(svg);
}
function point(r,a,cx=210,cy=210){return[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)]}
function arcPath(cx,cy,inner,outer,a1,a2){const a=point(outer,a1,cx,cy),b=point(outer,a2,cx,cy),c=point(inner,a2,cx,cy),d=point(inner,a1,cx,cy);return`M${a} A${outer} ${outer} 0 0 1 ${b} L${c} A${inner} ${inner} 0 0 0 ${d}Z`}
function sectorColor(i,type){const even=i%2===0;if(type==='DOUBLE'||type==='TRIPLE')return even?'#e2383f':'#087bd8';return even?'#1b181f':'#eeeef0'}

function startGame(type,start=null){
 active={id:uid(),gameType:type,zeroOneStartScore:start,startedAt:nowISO(),endedAt:null,isComplete:false,darts:[],bustRounds:[],currentPlayer:1,currentRound:1,winner:null};persist();renderGame();show('game');
}
function normalRound(){return Math.floor(active.darts.length/3)+1}
function normalDart(){return active.darts.length%3+1}
function currentTurnDarts(){return active.darts.filter(d=>d.roundNumber===active.currentRound&&d.player===active.currentPlayer)}
function addDart(type,num){
 if(!active)return;const versus=active.gameType==='CRICKET_VS',round=versus?active.currentRound:normalRound(),dart=versus?currentTurnDarts().length+1:normalDart();
 const item={id:uid(),gameId:active.id,roundNumber:round,dartNumberInRound:dart,player:versus?active.currentPlayer:1,hitNumber:num,hitType:type,score:scoreFor(type,num),marks:marksFor(type,num),thrownAt:nowISO()};active.darts.push(item);
 if(active.gameType==='ZERO_ONE'){
  const state=zeroState(active);if(state.busted){item.autoBustCause=true;active.bustRounds.push(round);while(active.darts.length%3)active.darts.push({...item,id:uid(),dartNumberInRound:active.darts.length%3+1,hitNumber:null,hitType:'MISS',score:0,marks:0,autoBustFill:true});flash('BUST',true);persist();renderGame();return}if(state.remaining===0){flash('FINISH!',true);completeGame();return}
 }
 if(versus){flash(`${hitLabel(item)}  ${item.marks?`+${item.marks} Mark`:''}`);advanceVersus();persist();if(active)renderGame();return}
 flash(`${hitLabel(item)}  +${active.gameType==='CRICKET'?`${item.marks} Mark`:item.score}`);persist();if(active.gameType!=='ZERO_ONE'&&active.darts.filter(d=>!d.autoBustFill).length===24){completeGame();return}renderGame();
}
function advanceVersus(){
 if(currentTurnDarts().length<3)return;
 const state=cricketState(active),p=active.currentPlayer-1,closed=CRICKET_TARGETS.every(t=>state.marks[p][t]>=3),ahead=state.scores[p]>=state.scores[1-p];
 if(closed&&ahead){active.winner=active.currentPlayer;completeGame();return}
 if(active.currentPlayer===1){active.currentPlayer=2;return}
 if(active.currentRound>=15){active.winner=state.scores[0]===state.scores[1]?0:state.scores[0]>state.scores[1]?1:2;completeGame();return}
 active.currentPlayer=1;active.currentRound++;
}
function zeroState(g){let remaining=g.zeroOneStartScore,busted=false;const roundIds=[...new Set(g.darts.map(d=>d.roundNumber))],lastRound=g.darts.at(-1)?.roundNumber;for(const r of roundIds){const before=remaining,ds=g.darts.filter(d=>d.roundNumber===r),total=ds.reduce((a,d)=>a+d.score,0),isBust=g.bustRounds.includes(r)||total>before;if(isBust)remaining=before;else remaining-=total;if(r===lastRound)busted=isBust}return{remaining,busted}}
function cricketState(g){const marks=[{},{}],scores=[0,0];CRICKET_TARGETS.forEach(t=>{marks[0][t]=0;marks[1][t]=0});for(const d of g.darts){const t=cricketTarget(d);if(t===null||!d.marks)continue;const p=(d.player||1)-1,o=1-p,before=marks[p][t],after=before+d.marks,extra=Math.max(0,after-3)-Math.max(0,before-3);marks[p][t]=Math.min(3,after);if(marks[o][t]<3)scores[p]+=extra*(t==='BULL'?25:+t)}return{marks,scores}}
function manualBust(){if(active?.gameType!=='ZERO_ONE'||normalDart()===1)return;const r=normalRound();active.bustRounds.push(r);while(active.darts.length%3)active.darts.push({id:uid(),gameId:active.id,roundNumber:r,dartNumberInRound:active.darts.length%3+1,player:1,hitNumber:null,hitType:'MISS',score:0,marks:0,thrownAt:nowISO(),autoBustFill:true});flash('BUST',true);persist();renderGame()}
function undo(){
 if(!active?.darts.length)return flash('戻せる投球がありません');
 if(active.gameType==='CRICKET_VS'){
  if(currentTurnDarts().length===0){if(active.currentPlayer===2)active.currentPlayer=1;else{active.currentPlayer=2;active.currentRound=Math.max(1,active.currentRound-1)}}
  active.darts.pop();flash('1投戻しました');persist();renderGame();return;
 }
 const last=active.darts.at(-1),r=last.roundNumber;if(last.autoBustFill){while(active.darts.at(-1)?.autoBustFill)active.darts.pop();if(active.darts.at(-1)?.autoBustCause)active.darts.pop()}else active.darts.pop();active.bustRounds=active.bustRounds.filter(x=>x!==r);flash('1投戻しました');persist();renderGame();
}
function completeGame(){const done=active;done.endedAt=nowISO();done.isComplete=true;games.push(done);active=null;persist();renderResult(done);show('result')}
function abandon(){if(!active)return;active.endedAt=nowISO();active.isComplete=false;if(active.darts.length)games.push(active);active=null;persist();show('home')}
function flash(text,strong=false){$('#feedback').textContent=text;if(navigator.vibrate&&(strong||text.includes('+')))navigator.vibrate(strong?[40,30,40]:18)}

function renderGame(){
 if(!active)return;const vs=active.gameType==='CRICKET_VS',rn=vs?active.currentRound:normalRound(),dn=vs?currentTurnDarts().length+1:normalDart(),m=metrics(active);$('#game').classList.toggle('vs-mode',vs);$('#gameTitle').textContent=typeLabel(active);$('#roundPill').textContent=`R${rn} / ${vs?15:active.gameType==='ZERO_ONE'?'∞':8}`;$('#gameProgress').textContent=vs?`PLAYER ${active.currentPlayer} · ${dn}本目`:`${active.darts.filter(d=>!d.autoBustFill).length}${active.gameType==='ZERO_ONE'?'':' / 24'} darts`;$('#normalScore').classList.toggle('hidden',vs);$('#bust').classList.toggle('hidden',active.gameType!=='ZERO_ONE');
 if(!vs){$('#scoreCaption').textContent=active.gameType==='ZERO_ONE'?'REMAIN':active.gameType==='CRICKET'?'TOTAL MARKS':'TOTAL';$('#currentScore').textContent=active.gameType==='ZERO_ONE'?m.remaining:active.gameType==='CRICKET'?m.totalMarks:m.total;$('#nextDart').textContent=`${dn}本目`}
 $('#vsScoreboard').classList.toggle('hidden',!vs);$('#roundHistory').classList.toggle('hidden',vs);if(vs)renderVersus();else renderRoundHistory();
}
function markSvg(count,player){let s='<svg viewBox="0 0 40 40" class="mark-svg '+(player===1?'player-one':'player-two')+'">';if(count>=1)s+='<line x1="9" y1="31" x2="31" y2="9"/>';if(count>=2)s+='<line x1="9" y1="9" x2="31" y2="31"/>';if(count>=3)s+='<circle cx="20" cy="20" r="16"/>';return s+'</svg>'}
function renderVersus(){
 const state=cricketState(active),rows=CRICKET_TARGETS.map(t=>`<div class="cricket-cell">${markSvg(state.marks[0][t],1)}</div><div class="cricket-cell target">${t}</div><div class="cricket-cell">${markSvg(state.marks[1][t],2)}</div>`).join('');
 const log=[...active.darts].reverse().slice(0,14).map(d=>`<div class="vs-log-row"><span>R${d.roundNumber} P${d.player}-${d.dartNumberInRound}</span><span>${hitLabel(d)}</span><b>${d.marks}M</b></div>`).join('');
 $('#vsScoreboard').innerHTML=`<div class="vs-head"><div class="player ${active.currentPlayer===1?'active':''}"><small>PLAYER 1</small><b>${state.scores[0]}</b></div><div class="vs-round">R${active.currentRound}/15<br>${currentTurnDarts().length+1}本目</div><div class="player ${active.currentPlayer===2?'active':''}"><small>PLAYER 2</small><b>${state.scores[1]}</b></div></div><div class="cricket-table">${rows}</div><div class="vs-log"><div class="vs-log-title">投球履歴（ラウンド・選手・投目）</div>${log||'<div class="empty">まだ投球がありません</div>'}</div>`;
}
function roundsFor(g){const ids=[...new Set(g.darts.filter(d=>!d.autoBustFill).map(d=>d.roundNumber))];return ids.map(r=>{const ds=g.darts.filter(d=>d.roundNumber===r&&!d.autoBustFill),value=ds.reduce((a,d)=>a+(g.gameType==='CRICKET'?d.marks:d.score),0);return{r,ds,value}})}
function renderRoundHistory(){const rs=roundsFor(active);$('#roundHistory').innerHTML=`<h3>${active.gameType==='CRICKET'?'ラウンド別Marks':'ラウンド別Score'}</h3><div class="round-list">${rs.map(x=>`<div class="round-card ${active.gameType!=='CRICKET'&&x.value>=100?'ton':''}"><small>ROUND ${x.r}</small><b>${x.value}${active.gameType==='CRICKET'?' M':''}</b><div class="throw-lines">${x.ds.map((d,i)=>`${i+1}. ${hitLabel(d)}${active.gameType==='CRICKET'?` / ${d.marks}M`:''}`).join('<br>')}</div></div>`).join('')||'<div class="empty">投球すると表示されます</div>'}</div>`}

function metrics(g){const ds=g.darts.filter(d=>!d.autoBustFill),total=ds.reduce((a,d)=>a+d.score,0),totalMarks=ds.reduce((a,d)=>a+d.marks,0),bull=ds.filter(d=>d.hitType.includes('BULL')).length,inner=ds.filter(d=>d.hitType==='INNER_BULL').length,triple=ds.filter(d=>d.hitType==='TRIPLE').length,remaining=g.gameType==='ZERO_ONE'?zeroState(g).remaining:null,div=ds.length||1;return{total,totalMarks,bull,inner,triple,remaining,bullRate:bull/div*100,tripleRate:triple/div*100,threeDart:total/div*3,mpr:totalMarks/Math.max(1,Math.ceil(div/3))}}
function renderResult(g){
 if(g.gameType==='CRICKET_VS'){const s=cricketState(g),winner=g.winner===0?'DRAW':`PLAYER ${g.winner} WIN`;$('#resultContent').innerHTML=`<div class="card hero-card"><small>CRICKET · ${g.currentRound} ROUNDS</small><div class="hero">${winner}</div></div><div class="metric-grid"><div class="metric"><small>PLAYER 1</small><b>${s.scores[0]} pts</b></div><div class="metric"><small>PLAYER 2</small><b>${s.scores[1]} pts</b></div><div class="metric"><small>総投球数</small><b>${g.darts.length}</b></div></div>`;return}
 const m=metrics(g),hero=g.gameType==='COUNT_UP'?m.total:g.gameType==='CRICKET'?`${m.totalMarks} Marks`:m.remaining===0?'FINISH':`${m.remaining} 残り`;$('#resultContent').innerHTML=`<div class="card hero-card"><small>${typeLabel(g)}</small><div class="hero">${hero}</div></div><div class="metric-grid"><div class="metric"><small>3 Dart Avg</small><b>${m.threeDart.toFixed(1)}</b></div><div class="metric"><small>Bull率</small><b>${m.bullRate.toFixed(1)}%</b></div><div class="metric"><small>投球数</small><b>${g.darts.filter(d=>!d.autoBustFill).length}</b></div></div>`;
}

function completeGames(filter){return games.filter(g=>g.isComplete&&(!filter||filter(g)))}
function renderHome(){const d=new Date();$('#today').textContent=`${d.getMonth()+1}月${d.getDate()}日 ${'日月火水木金土'[d.getDay()]}曜日`;const today=completeGames(g=>g.startedAt.slice(0,10)===todayKey()),cu=today.filter(g=>g.gameType==='COUNT_UP'),avg=cu.length?Math.round(cu.reduce((a,g)=>a+metrics(g).total,0)/cu.length):'—',darts=cu.flatMap(g=>g.darts),bull=darts.filter(x=>x.hitType.includes('BULL')).length;$('#homeAverage').textContent=avg;$('#homeBull').textContent=darts.length?`${(bull/darts.length*100).toFixed(1)}%`:'—';$('#homeGames').textContent=today.length;const box=$('#resumeCard');box.classList.toggle('hidden',!active);if(active)box.innerHTML=`<b>途中の${esc(typeLabel(active))}があります</b><p>${active.darts.length}投を記録済み</p><button id="resume" class="button primary">続きから</button><button id="discard" class="text-button">破棄する</button>`}
function renderRecords(){const today=completeGames(g=>g.startedAt.slice(0,10)===todayKey());$('#todayTab').innerHTML=today.length?`<div class="card">${['CRICKET_VS','COUNT_UP','ZERO_ONE','CRICKET'].map(t=>{const a=today.filter(g=>g.gameType===t);return a.length?`<div class="history-item"><b>${typeLabel(t)}</b><span>${a.length}ゲーム</span></div>`:''}).join('')}</div>`:'<div class="empty">今日の記録はありません</div>';const all=[...completeGames()].reverse();$('#historyTab').innerHTML=all.length?`<div class="card">${all.map(g=>{let result;if(g.gameType==='CRICKET_VS')result=g.winner===0?'DRAW':`P${g.winner} WIN`;else{const m=metrics(g);result=g.gameType==='COUNT_UP'?m.total:g.gameType==='CRICKET'?`${m.totalMarks} M`:m.remaining===0?'FINISH':`${m.remaining} 残り`}return`<div class="history-item"><div><b>${typeLabel(g)}</b><small>${fmtDate(g.startedAt)} · ${g.darts.filter(d=>!d.autoBustFill).length}投</small></div><span>${result}</span></div>`}).join('')}</div>`:'<div class="empty">履歴はありません</div>';const cu=completeGames(g=>g.gameType==='COUNT_UP'),vs=completeGames(g=>g.gameType==='CRICKET_VS'),cr=completeGames(g=>g.gameType==='CRICKET');$('#bestTab').innerHTML=`<div class="metric-grid"><div class="metric"><small>Count-Up最高</small><b>${cu.length?Math.max(...cu.map(g=>metrics(g).total)):'—'}</b></div><div class="metric"><small>対戦数</small><b>${vs.length}</b></div><div class="metric"><small>Cricket最高MPR</small><b>${cr.length?Math.max(...cr.map(g=>metrics(g).mpr)).toFixed(2):'—'}</b></div></div>`}
function confirmBox(title,text,fn){dialogAction=fn;$('#dialogTitle').textContent=title;$('#dialogText').textContent=text;$('#dialog').classList.remove('hidden')}

document.addEventListener('click',e=>{
 const go=e.target.closest('[data-go]');if(go)show(go.dataset.go);
 const start=e.target.closest('[data-start]');if(start)startGame(start.dataset.start);
 const sc=e.target.closest('[data-score]');if(sc){zeroScore=+sc.dataset.score;$$('[data-score]').forEach(x=>x.classList.toggle('selected',x===sc))}
 const tab=e.target.closest('[data-tab]');if(tab){$$('.tabs button').forEach(x=>x.classList.toggle('selected',x===tab));$$('.tab-pane').forEach(x=>x.classList.toggle('active',x.id===tab.dataset.tab))}
 if(e.target.id==='resume'){renderGame();show('game')}if(e.target.id==='discard')confirmBox('途中ゲームを破棄','記録した投球も削除されます。',()=>{active=null;persist();renderHome()});
});
$('#startZero').onclick=()=>startGame('ZERO_ONE',zeroScore);$('#miss').onclick=()=>addDart('MISS',null);$('#undo').onclick=undo;$('#bust').onclick=manualBust;$('#leaveGame').onclick=()=>confirmBox('ゲームを閉じますか？','途中記録を保存してホームへ戻ります。',()=>show('home'));$('#finishGame').onclick=()=>confirmBox('ゲームを途中終了','未完了として保存し、平均集計から除外します。',abandon);$('#dialogCancel').onclick=()=>$('#dialog').classList.add('hidden');$('#dialogOk').onclick=()=>{const fn=dialogAction;$('#dialog').classList.add('hidden');dialogAction=null;fn?.()};

createBoard();renderHome();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.__SOFT_DARTS_TEST__={cricketState,zeroState,marksFor,scoreFor};
})();
