// JayWorld interactive site – dev branch
const state = { editing: false, editingIndex: null, items: [], lang: 'ko', railPage: 0 };

const els = {
  rail: () => document.getElementById('rail'),
  grid: () => document.getElementById('grid'),
  year: () => document.getElementById('year'),
  railPrev: () => document.getElementById('railPrev'),
  railNext: () => document.getElementById('railNext'),
  langKo: () => document.getElementById('langKo'),
  langEn: () => document.getElementById('langEn'),
  gameBtn: () => document.getElementById('gameBtn'),
  gameDialog: () => document.getElementById('gameDialog'),
  gameCanvas: () => document.getElementById('gameCanvas'),
  gameQuit: () => document.getElementById('gameQuit'),
};

const STORAGE_KEY = 'jayworld.art.json';

window.addEventListener('DOMContentLoaded', init);

async function init(){
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
  makeBubbles();
  await loadData();
  renderAll();
  bindUI();
}

function bindUI(){
  // Language toggle
  els.langKo()?.addEventListener('click', ()=>setLang('ko'));
  els.langEn()?.addEventListener('click', ()=>setLang('en'));

  // Rail navigation: 3-at-a-time
  els.railPrev()?.addEventListener('click', ()=>{
    state.railPage = Math.max(0, state.railPage - 1);
    updateRailTransform();
  });
  els.railNext()?.addEventListener('click', ()=>{
    const maxPage = Math.ceil(state.items.length / 3) - 1;
    state.railPage = Math.min(maxPage, state.railPage + 1);
    updateRailTransform();
  });

  // Scroll reveal
  setupReveals();

  // Game
  els.gameBtn()?.addEventListener('click', openGame);
  els.gameQuit()?.addEventListener('click', closeGame);

  // Swipe support on rail
  let startX = null;
  els.rail()?.addEventListener('pointerdown', e=>{ startX = e.clientX; });
  els.rail()?.addEventListener('pointerup', e=>{
    if(startX == null) return; const dx = e.clientX - startX; startX = null;
    if(Math.abs(dx) < 30) return;
    if(dx < 0) els.railNext().click(); else els.railPrev().click();
  });
}

async function loadData(){
  const local = localStorage.getItem(STORAGE_KEY);
  const savedLang = localStorage.getItem('jayworld.lang');
  if(savedLang) state.lang = savedLang;
  if(local){ try{ state.items = JSON.parse(local); return; }catch{/* ignore */} }
  try{
    const res = await fetch('data/art.json', {cache:'no-cache'});
    state.items = await res.json();
  }catch(err){
    console.error('Failed to load data/art.json', err);
    state.items = getFallbackItems();
  }
}

function renderAll(){
  const byDate = [...state.items].sort((a,b)=> new Date(b.date) - new Date(a.date));
  renderRail(byDate);
  renderGrid(byDate);
  i18nApply();
  setupNSFW();
  updateRailTransform();
}

function renderRail(items){
  const el = els.rail();
  el.innerHTML = '';
  items.forEach((item, idx) => el.append(createCard(item, idx)));
}

function renderGrid(items){
  const el = els.grid();
  el.innerHTML = '';
  items.forEach((item, idx) => el.append(createTile(item, idx)));
}

function createCard(item){
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener">
      <span class="chip">${formatDate(item.date)}</span>
      <img class="thumb" src="${sanitizeUrl(item.image)}" alt="${escapeHtml(item.title || '작품')}">
    </a>
    <div class="meta">
      <h3>${escapeHtml(item.title || '제목 없음')}</h3>
      <div class="small">${escapeHtml(item.author || 'Jay 제이')}</div>
    </div>`;
  return card;
}

function createTile(item){
  const tile = document.createElement('article');
  tile.className = 'tile';
  const nsfwAttr = item.nsfw ? ' data-nsfw="true"' : '';
  tile.innerHTML = `
    <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener"${nsfwAttr}>
      <img src="${sanitizeUrl(item.image)}" alt="${escapeHtml(item.title || '작품')}">
    </a>
    <div class="meta">
      <div><strong>${escapeHtml(item.title || '제목 없음')}</strong></div>
      <div class="small">${formatDate(item.date)} · ${escapeHtml(item.author || 'Jay 제이')}</div>
    </div>`;
  return tile;
}

// i18n
const I18N = {
  ko:{'nav.intro':'소개','nav.gallery':'갤러리','nav.sites':'웹사이트','nav.contact':'연락처','hero.title':'Jay 제이','hero.desc1':'하우스는 언제나 이긴다. 퍼리 애호가 · A.I 에이전트 개발자 · 웹 개발자','hero.desc2':'소비러 · A.I 에이전트 개발자 · 웹 개발자 · 그림 연습생','gallery.title':'아트 갤러리','gallery.subtitle':'날짜순으로 정리된 Jay의 OC 아트. 좌우 스와이프 또는 아래로 스크롤해 감상하세요.','gallery.visit':'트위터 방문하기','sites.title':'웹사이트','sites.subtitle':'제가 만든 프로젝트들을 만나보세요.','contact.title':'연락처','contact.subtitle':'협업 · 커미션 · 대화 모두 환영합니다.'},
  en:{'nav.intro':'Intro','nav.gallery':'Gallery','nav.sites':'Websites','nav.contact':'Contact','hero.title':'Jay','hero.desc1':'The house always wins. Furry enjoyer · AI Agent Developer · Web Developer','hero.desc2':'Consumer · AI Agent Dev · Web Dev · Art Learner','gallery.title':'Art Gallery','gallery.subtitle':'OC art sorted by date. Swipe horizontally or scroll vertically.','gallery.visit':'Visit Twitter','sites.title':'Websites','sites.subtitle':'Check out my projects.','contact.title':'Contact','contact.subtitle':'Open for collab, commissions, chat.'}
};
function setLang(code){
  state.lang=code;
  localStorage.setItem('jayworld.lang', code);
  i18nApply();
}
function i18nApply(){ document.querySelectorAll('[data-i18n]').forEach(el=>{ const key=el.getAttribute('data-i18n'); const t=(I18N[state.lang]||{})[key]; if(t) el.textContent=t; }); }

// rail 3-at-a-time
function updateRailTransform(){
  const card = document.querySelector('.card');
  // Fallback value ensures movement even before layout settles
  const cardWidth = card ? (card.getBoundingClientRect().width + 16) : 280;
  const step = 3;
  const maxPage = Math.max(0, Math.ceil(state.items.length / step) - 1);
  state.railPage = Math.min(state.railPage, maxPage);
  const offset = cardWidth * step * state.railPage * -1;
  const rail = els.rail();
  if(rail){ rail.style.transform = `translateX(${offset}px)`; }
}

// NSFW blur with spoiler button
function setupNSFW(){
  document.querySelectorAll('[data-nsfw="true"]').forEach(wrapper=>{
    const tile = wrapper.closest('.tile');
    if(tile && !tile.querySelector('.spoiler')){
      tile.classList.add('nsfw');
      const s = document.createElement('div');
      s.className='spoiler';
      s.innerHTML = '<span>NSFW 콘텐츠 · 주의</span><button class="btn small">보기</button>';
      s.querySelector('button').addEventListener('click',()=>{ tile.classList.remove('nsfw'); s.remove(); });
      tile.prepend(s);
    }
  });
}

// scroll reveal observer
function setupReveals(){
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); } else { e.target.classList.remove('visible'); } });
  },{threshold:0.12});
  document.querySelectorAll('.section, .tile, .card').forEach(el=>{ el.classList.add('reveal'); obs.observe(el); });
}

// Mini game: simple space-invaders with art thumbs
let game = null;
function openGame(){ els.gameDialog().showModal(); game = startGame(els.gameCanvas(), state.items); }
function closeGame(){ if(game && game.stop) game.stop(); game=null; els.gameDialog().close(); }
function startGame(canvas, items){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H=canvas.height;
  let running=true, left=false, right=false, shoot=false, score=0;
  const player={x:W/2,y:H-30,w:40,h:8};
  const shots=[];
  const enemies = Array.from({length: Math.min(24, items.length)}, (_,i)=>({x:40+(i%8)*80,y:40+Math.floor(i/8)*70,w:40,h:30,dx:1,img:new Image()}));
  enemies.forEach((e,i)=>{ e.img.src = sanitizeUrl(items[i%items.length]?.image||''); });
  function key(e,v){ if(e.code==='ArrowLeft') left=v; if(e.code==='ArrowRight') right=v; if(e.code==='Space') shoot=v; if(e.code==='Escape') closeGame(); }
  window.addEventListener('keydown',e=>key(e,true)); window.addEventListener('keyup',e=>key(e,false));
  (function loop(){ if(!running) return; ctx.clearRect(0,0,W,H);
    if(left) player.x-=5; if(right) player.x+=5; player.x=Math.max(20,Math.min(W-20,player.x)); if(shoot){ shots.push({x:player.x,y:player.y-10}); shoot=false; }
    enemies.forEach(e=>{ e.x+=e.dx; if(e.x<20||e.x>W-60){ e.dx*=-1; e.y+=20; }});
    for(const s of shots){ s.y-=6; for(const e of enemies){ if(!e.dead && s.x>e.x&&s.x<e.x+e.w&&s.y<e.y+e.h&&s.y>e.y){ e.dead=true; s.hit=true; score++; }} }
    ctx.fillStyle='#fff'; ctx.fillRect(player.x-20,player.y,40,8);
    shots.filter(s=>!s.hit&&s.y>-10).forEach(s=>{ ctx.fillRect(s.x-2,s.y,4,8); });
    enemies.filter(e=>!e.dead).forEach(e=>{ ctx.drawImage(e.img,e.x,e.y,e.w,e.h); });
    ctx.fillStyle='#cdb7ff'; ctx.fillText('Score: '+score, 10, 20);
    requestAnimationFrame(loop);
  })();
  return { stop(){ running=false; } };
}

function formatDate(input){ try{ const d = new Date(input); return new Intl.DateTimeFormat('ko', {year:'numeric', month:'short', day:'numeric'}).format(d); }catch{ return input; } }
function escapeHtml(s){ return (s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function sanitizeUrl(u){ if(!u) return '#'; try{ const url = new URL(u, location.href); return url.href; }catch{ return u; } }
function makeBubbles(){ const container = document.getElementById('bubbles'); if(!container) return; const count = 28; for(let i=0;i<count;i++){ const b = document.createElement('div'); b.className = 'bubble'; const size = 40 + Math.random()*120; const left = Math.random()*100; const delay = Math.random()*-20; const dur = 25 + Math.random()*35; const dx = (Math.random()*80-40) + 'vw'; b.style.width = `${size}px`; b.style.height = `${size}px`; b.style.left = `${left}vw`; b.style.bottom = `-10vh`; b.style.animationDelay = `${delay}s`; b.style.setProperty('--dur', `${dur}s`); b.style.setProperty('--dx', dx); b.style.setProperty('--s', 0.6 + Math.random()*0.8); container.append(b);} }
function getFallbackItems(){ const base=[{title:'프로필', image:'OC/제이 프사.jpg'},{title:'제이 유혹', image:'OC/제이 유혹.png'},{title:'제이 흥미', image:'OC/제이 흥미.png'},{title:'제이 음흉', image:'OC/제이 음흉.png'}]; return base.map((b,i)=>({...b, author:'Jay 제이', description:'플레이스홀더 항목', date:new Date(Date.now()-i*86400000).toISOString(), link:'https://x.com/jellodrago'})); }
const state = { editing: false, editingIndex: null, items: [] };
const els = {
  rail: () => document.getElementById('rail'),
  grid: () => document.getElementById('grid'),
  year: () => document.getElementById('year'),
  editToggle: () => document.getElementById('editToggle'),
  editBar: () => document.getElementById('editBar'),
  addItemBtn: () => document.getElementById('addItemBtn'),
  exportBtn: () => document.getElementById('exportBtn'),
  importInput: () => document.getElementById('importInput'),
  dialog: () => document.getElementById('editDialog'),
  fTitle: () => document.getElementById('fTitle'),
  fAuthor: () => document.getElementById('fAuthor'),
  fDesc: () => document.getElementById('fDesc'),
  fDate: () => document.getElementById('fDate'),
  fImage: () => document.getElementById('fImage'),
  fLink: () => document.getElementById('fLink'),
  saveItemBtn: () => document.getElementById('saveItemBtn'),
};
const STORAGE_KEY = 'jayworld.art.json';
init();
async function init(){
  document.addEventListener('DOMContentLoaded', () => { els.year().textContent = new Date().getFullYear(); });
  makeBubbles();
  await loadData();
  renderAll();
  bindUI();
}
function bindUI(){
  els.editToggle().addEventListener('click', () => { state.editing = !state.editing; els.editToggle().classList.toggle('primary', state.editing); els.editBar().hidden = !state.editing; renderAll(); });
  els.addItemBtn().addEventListener('click', () => openEditor());
  els.exportBtn().addEventListener('click', exportJSON);
  els.importInput().addEventListener('change', importJSON);
  els.saveItemBtn().addEventListener('click', saveFromDialog);
}
async function loadData(){
  const local = localStorage.getItem(STORAGE_KEY);
  if(local){ try{ state.items = JSON.parse(local); return; }catch{} }
  try{ const res = await fetch('data/art.json', {cache:'no-cache'}); state.items = await res.json(); }
  catch(err){ console.error('Failed to load data/art.json', err); state.items = getFallbackItems(); }
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items, null, 2)); }
function renderAll(){ const byDate = [...state.items].sort((a,b)=> new Date(b.date) - new Date(a.date)); renderRail(byDate.slice(0,12)); renderGrid(byDate); }
function renderRail(items){ const el = els.rail(); el.innerHTML=''; for(const [idx,item] of items.entries()) el.append(createCard(item, idx)); }
function renderGrid(items){ const el = els.grid(); el.innerHTML=''; for(const [idx,item] of items.entries()) el.append(createTile(item, idx)); }
function createCard(item, index){
  const card = document.createElement('article'); card.className='card';
  card.innerHTML = `<a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener"><span class="chip">${formatDate(item.date)}</span><img src="${sanitizeUrl(item.image)}" alt="${escapeHtml(item.title||'작품')}"></a><div class="meta"><h3>${escapeHtml(item.title||'제목 없음')}</h3><div class="small">${escapeHtml(item.author||'Jay 제이')}</div></div>`;
  card.querySelector('img').className='thumb';
  if(state.editing){ const actions=document.createElement('div'); actions.className='edit-actions'; actions.innerHTML=`<button class="btn small subtle" data-act="edit">수정</button><button class="btn small outline" data-act="del">삭제</button>`; actions.addEventListener('click',(e)=>{const act=e.target.getAttribute('data-act'); if(act==='edit') openEditor(item,index); if(act==='del') deleteItem(index); e.preventDefault(); e.stopPropagation();}); card.append(actions);} return card; }
function createTile(item, index){
  const tile=document.createElement('article'); tile.className='tile';
  tile.innerHTML=`<a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener"><img src="${sanitizeUrl(item.image)}" alt="${escapeHtml(item.title||'작품')}"></a><div class="meta"><div><strong>${escapeHtml(item.title||'제목 없음')}</strong></div><div class="small">${formatDate(item.date)} · ${escapeHtml(item.author||'Jay 제이')}</div></div>`;
  if(state.editing){ const actions=document.createElement('div'); actions.className='edit-actions'; Object.assign(actions.style,{position:'absolute',top:'10px',right:'10px'}); actions.innerHTML=`<button class="btn small subtle" data-act="edit">수정</button><button class="btn small outline" data-act="del">삭제</button>`; actions.addEventListener('click',(e)=>{const act=e.target.getAttribute('data-act'); if(act==='edit') openEditor(item,index); if(act==='del') deleteItem(index); e.preventDefault(); e.stopPropagation();}); tile.style.position='relative'; tile.append(actions);} return tile; }
function openEditor(item={}, index=null){ state.editingIndex=index; els.fTitle().value=item.title||''; els.fAuthor().value=item.author||'Jay 제이'; els.fDesc().value=item.description||''; els.fDate().value=(item.date? new Date(item.date).toISOString().slice(0,10):''); els.fImage().value=item.image||''; els.fLink().value=item.link||''; els.dialog().showModal(); }
function saveFromDialog(ev){ ev.preventDefault(); const obj={ title:els.fTitle().value.trim(), author:els.fAuthor().value.trim(), description:els.fDesc().value.trim(), date:els.fDate().value? new Date(els.fDate().value).toISOString():new Date().toISOString(), image:els.fImage().value.trim(), link:els.fLink().value.trim()||'#' }; if(state.editingIndex==null){ state.items.push(obj); } else { state.items[state.editingIndex]=obj; } persist(); els.dialog().close(); renderAll(); }
function deleteItem(index){ if(!confirm('삭제하시겠습니까?')) return; state.items.splice(index,1); persist(); renderAll(); }
function exportJSON(){ const blob=new Blob([JSON.stringify(state.items,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='art.json'; a.click(); URL.revokeObjectURL(url); }
async function importJSON(ev){ const file=ev.target.files?.[0]; if(!file) return; const text=await file.text(); try{ state.items=JSON.parse(text); persist(); renderAll(); }catch{ alert('JSON 파싱 실패'); } }
function formatDate(input){ try{ const d=new Date(input); return new Intl.DateTimeFormat('ko',{year:'numeric',month:'short',day:'numeric'}).format(d);}catch{ return input; } }
function escapeHtml(s){ return (s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function sanitizeUrl(u){ if(!u) return '#'; try{ const url=new URL(u, location.href); return url.href; }catch{ return u; } }
function makeBubbles(){ const container=document.getElementById('bubbles'); if(!container) return; const count=28; for(let i=0;i<count;i++){ const b=document.createElement('div'); b.className='bubble'; const size=40+Math.random()*120; const left=Math.random()*100; const delay=Math.random()*-20; const dur=25+Math.random()*35; const dx=(Math.random()*80-40)+'vw'; b.style.width=`${size}px`; b.style.height=`${size}px`; b.style.left=`${left}vw`; b.style.bottom='-10vh'; b.style.animationDelay=`${delay}s`; b.style.setProperty('--dur', `${dur}s`); b.style.setProperty('--dx', dx); b.style.setProperty('--s', 0.6+Math.random()*0.8); container.append(b);} }
function getFallbackItems(){ const base=[{title:'프로필', image:'OC/제이 프사.jpg'},{title:'제이 유혹', image:'OC/제이 유혹.png'},{title:'제이 흥미', image:'OC/제이 흥미.png'},{title:'제이 음흉', image:'OC/제이 음흉.png'}]; return base.map((b,i)=>({...b, author:'Jay 제이', description:'플레이스홀더 항목', date:new Date(Date.now()-i*86400000).toISOString(), link:'https://x.com/jellodrago'})); }


