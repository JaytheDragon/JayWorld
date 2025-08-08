// JayWorld interactive site – dev branch (clean)
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

document.addEventListener('readystatechange', ()=>{ if(document.readyState==='interactive'||document.readyState==='complete'){ init(); }});

async function init(){
  const y = els.year(); if(y) y.textContent = new Date().getFullYear();
  makeBubbles();
  await loadData();
  renderAll();
  bindUI();
}

function bindUI(){
  els.langKo()?.addEventListener('click', (e)=>{ e.preventDefault(); setLang('ko'); });
  els.langEn()?.addEventListener('click', (e)=>{ e.preventDefault(); setLang('en'); });
  els.railPrev()?.addEventListener('click', ()=>pageRail(-1));
  els.railNext()?.addEventListener('click', ()=>pageRail(1));
  setupReveals();
  els.gameBtn()?.addEventListener('click', openGame);
  els.gameQuit()?.addEventListener('click', closeGame);
  let startX = null;
  els.rail()?.addEventListener('pointerdown', e=>{ startX = e.clientX; });
  els.rail()?.addEventListener('pointerup', e=>{
    if(startX == null) return; const dx = e.clientX - startX; startX = null;
    if(Math.abs(dx) < 30) return;
    if(dx < 0) pageRail(1); else pageRail(-1);
  });
}

async function loadData(){
  const savedLang = localStorage.getItem('jayworld.lang');
  if(savedLang) state.lang = savedLang;
  try{
    const res = await fetch(new URL('data/art.json?v=' + Date.now(), location.origin + location.pathname.replace(/index\.html?$/,'')).toString(), {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    state.items = await res.json();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch {}
  }catch(err){
    console.warn('Fetch failed, trying localStorage', err);
    const local = localStorage.getItem(STORAGE_KEY);
    if(local){ try{ state.items = JSON.parse(local); return; }catch{/* ignore */} }
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
  const el = els.rail(); if(!el) return;
  el.innerHTML = '';
  items.forEach((item, idx) => el.append(createCard(item, idx)));
}

function renderGrid(items){
  const el = els.grid(); if(!el) return;
  el.innerHTML = '';
  items.forEach((item, idx) => el.append(createTile(item, idx)));
}

function createCard(item){
  const card = document.createElement('article');
  card.className = 'card';
  const isNSFW = (item && (item.nsfw || /nsfw|불건전/i.test(item.image || '') || /nsfw|불건전/i.test(item.title || '')));
  const nsfwAttr = isNSFW ? ' data-nsfw="true"' : '';
  card.innerHTML = `
    <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener"${nsfwAttr}>
      <span class="chip">${formatDate(item.date)}</span>
      <img class="thumb" src="${sanitizeUrl(item.image)}" alt="${escapeHtml(item.title || '작품')}">
    </a>
    <div class="meta">
      <h3>${escapeHtml(item.title || '제목 없음')}</h3>
      <div class="small">
        ${formatDate(item.date)} · ${escapeHtml(item.author || 'Jay 제이')}
        ${renderHostLink(item.link)}
      </div>
    </div>`;
  return card;
}

function createTile(item){
  const tile = document.createElement('article');
  tile.className = 'tile';
  const isNSFW = (item && (item.nsfw || /nsfw|불건전/i.test(item.image || '') || /nsfw|불건전/i.test(item.title || '')));
  const nsfwAttr = isNSFW ? ' data-nsfw="true"' : '';
  tile.innerHTML = `
    <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener"${nsfwAttr}>
      <img src="${sanitizeUrl(item.image)}" alt="${escapeHtml(item.title || '작품')}">
    </a>
    <div class="meta">
      <div><strong>${escapeHtml(item.title || '제목 없음')}</strong></div>
      <div class="small">${formatDate(item.date)} · ${escapeHtml(item.author || 'Jay 제이')} ${renderHostLink(item.link)}</div>
    </div>`;
  return tile;
}

function renderHostLink(u){
  const host = getHost(u);
  return host ? `· <a class="host" href="${sanitizeUrl(u)}" target="_blank" rel="noopener">${escapeHtml(host)}</a>` : '';
}
function getHost(u){ try { const h = new URL(u, location.href).hostname; return h.replace(/^www\./,''); } catch { return ''; } }

// i18n
const I18N = {
  ko:{'nav.intro':'소개','nav.gallery':'갤러리','nav.sites':'웹사이트','nav.contact':'연락처','hero.title':'Jay 제이','hero.desc1':'하우스는 언제나 이긴다. 퍼리 애호가 · A.I 에이전트 개발자 · 웹 개발자','hero.desc2':'소비러 · A.I 에이전트 개발자 · 웹 개발자 · 그림 연습생','gallery.title':'아트 갤러리','gallery.subtitle':'날짜순으로 정리된 Jay의 OC 아트. 좌우 스와이프 또는 아래로 스크롤해 감상하세요.','gallery.visit':'트위터 방문하기','sites.title':'웹사이트','sites.subtitle':'제가 만든 프로젝트들을 만나보세요.','contact.title':'연락처','contact.subtitle':'협업 · 커미션 · 대화 모두 환영합니다.'},
  en:{'nav.intro':'Intro','nav.gallery':'Gallery','nav.sites':'Websites','nav.contact':'Contact','hero.title':'Jay','hero.desc1':'The house always wins. Furry enjoyer · AI Agent Developer · Web Developer','hero.desc2':'Consumer · AI Agent Dev · Web Dev · Art Learner','gallery.title':'Art Gallery','gallery.subtitle':'OC art sorted by date. Swipe horizontally or scroll vertically.','gallery.visit':'Visit Twitter','sites.title':'Websites','sites.subtitle':'Check out my projects.','contact.title':'Contact','contact.subtitle':'Open for collab, commissions, chat.'}
};
function setLang(code){ state.lang=code; localStorage.setItem('jayworld.lang', code); renderAll(); }
function i18nApply(){ document.querySelectorAll('[data-i18n]').forEach(el=>{ const key=el.getAttribute('data-i18n'); const t=(I18N[state.lang]||{})[key]; if(t) el.textContent=t; }); }

// rail 3-at-a-time with swing animation
function updateRailTransform(){
  const card = document.querySelector('.card');
  const cardWidth = card ? (card.getBoundingClientRect().width + 16) : 280;
  const step = 1; // show 1 big card at a time
  const maxPage = Math.max(0, Math.ceil(state.items.length / step) - 1);
  state.railPage = Math.min(state.railPage, maxPage);
  const offset = cardWidth * step * state.railPage * -1;
  const rail = els.rail();
  if(rail){
    const current = getComputedStyle(rail).transform.includes('matrix') ? new DOMMatrix(getComputedStyle(rail).transform).m41 : 0;
    rail.style.setProperty('--from', `${current}px`);
    rail.style.setProperty('--tx', `${offset}px`);
    rail.classList.remove('swing');
    void rail.offsetWidth; // reflow
    rail.classList.add('swing');
  }
}
function pageRail(dir){
  const step = 1;
  const maxPage = Math.max(0, Math.ceil(state.items.length / step) - 1);
  state.railPage = Math.max(0, Math.min(maxPage, state.railPage + dir));
  updateRailTransform();
}

// NSFW blur + spoiler button
function setupNSFW(){
  document.querySelectorAll('[data-nsfw="true"]').forEach(wrapper=>{
    const parent = wrapper.closest('.tile, .card');
    if(parent && !parent.querySelector('.spoiler')){
      parent.classList.add('nsfw');
      const s = document.createElement('div');
      s.className='spoiler';
      const ko = {msg:'작성자가 NSFW 이미지로 표시했습니다. 표시할까요?', btn:'보기'};
      const en = {msg:'Author marked this as NSFW image. Show?', btn:'SHOW'};
      const t = state.lang==='ko'? ko : en;
      s.innerHTML = `<div class="spoiler-inner"><span>${escapeHtml(t.msg)}</span><button class="btn small">${escapeHtml(t.btn)}</button></div>`;
      s.querySelector('button').addEventListener('click',()=>{ parent.classList.remove('nsfw'); s.remove(); });
      parent.appendChild(s);
    }
  });
}

// scroll reveal
function setupReveals(){
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); } else { e.target.classList.remove('visible'); } });
  },{threshold:0.12});
  document.querySelectorAll('.section, .tile, .card').forEach(el=>{ el.classList.add('reveal'); obs.observe(el); });
}

// Mini game: Tetris with 15x15 mosaic reveal
let game = null;
function openGame(){ const d = els.gameDialog(); if(!d) return; if(typeof d.showModal==='function'){ d.showModal(); } else { d.open = true; } game = startGame(els.gameCanvas(), state.items); }
function closeGame(){ const d=els.gameDialog(); if(game && game.stop) game.stop(); game=null; if(d){ if(typeof d.close==='function') d.close(); else d.open=false; } }
function startGame(canvas, items){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  // Tetris config
  const COLS = 10, ROWS = 20, CELL = Math.floor(Math.min(W*0.5/COLS, H*0.9/ROWS));
  const OFFSET_X = Math.floor((W - COLS*CELL)/2);
  const OFFSET_Y = Math.floor((H - ROWS*CELL)/2);

  const SHAPES = {
    I:[[1,1,1,1]], O:[[1,1],[1,1]], T:[[0,1,0],[1,1,1]], S:[[0,1,1],[1,1,0]], Z:[[1,1,0],[0,1,1]], J:[[1,0,0],[1,1,1]], L:[[0,0,1],[1,1,1]]
  };
  const COLORS = {I:'#6ff',O:'#fd6',T:'#c6f',S:'#6f6',Z:'#f66',J:'#69f',L:'#fc6'};

  function rotate(mat){ const h=mat.length,w=mat[0].length; const res=Array.from({length:w},()=>Array(h).fill(0)); for(let y=0;y<h;y++) for(let x=0;x<w;x++) res[x][h-1-y]=mat[y][x]; return res; }
  function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // Board
  const board = Array.from({length:ROWS},()=>Array(COLS).fill(null));
  let score=0, lines=0, level=0, tick=0, gravity=48; // frames per drop
  const bag = [];
  function refillBag(){ const keys=Object.keys(SHAPES); while(keys.length) bag.push(keys.splice(Math.floor(Math.random()*keys.length),1)[0]); }
  refillBag();

  function newPiece(){ if(!bag.length) refillBag(); const type=bag.pop(); let shape=SHAPES[type].map(r=>r.slice()); return {type, shape, x:Math.floor(COLS/2)-Math.ceil(shape[0].length/2), y:-2}; }
  let cur = newPiece();

  // Art mosaic (15x15 reveal)
  const MOS=15, mosTotal=MOS*MOS; let mosRevealed=new Set(); let linesSinceArt=0; let artIdx=0;
  const img=new Image();
  function pickArt(){ if(!items.length) return; artIdx=(artIdx+1)%items.length; img.src = sanitizeUrl(items[artIdx].image); mosRevealed.clear(); linesSinceArt=0; }
  // Start with the first artwork
  if(items.length){ img.src = sanitizeUrl(items[0].image); }

  function collide(s, offX, offY){ for(let y=0;y<s.shape.length;y++){ for(let x=0;x<s.shape[0].length;x++){ if(s.shape[y][x]){ const nx=s.x+x+offX, ny=s.y+y+offY; if(nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&board[ny][nx])) return true; } } } return false; }
  function lock(){
    let placedAbove=false;
    for(let y=0;y<cur.shape.length;y++){
      for(let x=0;x<cur.shape[0].length;x++){
        if(cur.shape[y][x]){
          const py=cur.y+y;
          if(py<0) { placedAbove=true; }
          else { board[py][cur.x+x]=cur.type; }
        }
      }
    }
    if(placedAbove){ gameOver(); return; }
    const cleared=[]; for(let y=ROWS-1;y>=0;y--){ if(board[y].every(c=>c)){ cleared.push(y); for(let yy=y;yy>0;yy--) board[yy]=board[yy-1].slice(); board[0]=Array(COLS).fill(null); y++; } }
    if(cleared.length){
      const points=[0,40,100,300,1200][cleared.length]*(level+1); score+=points; lines+=cleared.length; linesSinceArt+=cleared.length;
      // reveal mosaic cells randomly
      const needed = Math.min(cleared.length, mosTotal - mosRevealed.size);
      let tries=0; while(mosRevealed.size < mosTotal && tries<needed*10){ const id=Math.floor(Math.random()*mosTotal); mosRevealed.add(id); tries++; }
      if(linesSinceArt>=15){ pickArt(); }
      // Increase difficulty more aggressively
      level = Math.floor(lines / 8);
      gravity = Math.max(5, 48 - level * 5);
    }
    cur = newPiece(); if(collide(cur,0,0)){ gameOver(); }
  }

  function gameOver(){ running=false; showOverlay(`게임 오버\n점수: ${score}\n라인: ${lines}`); }

  // Hold removed

  function hardDrop(){ while(!collide(cur,0,1)) cur.y++; lock(); }

  function rotateCur(){ const next=rotate(cur.shape); const old=cur.shape; cur.shape=next; if(collide(cur,0,0)){ if(!collide(cur,-1,0)) cur.x--; else if(!collide(cur,1,0)) cur.x++; else cur.shape=old; } }

  // Input
  function keyDown(e){
    if(e.repeat) return;
    if(e.code==='ArrowLeft'){ if(!collide(cur,-1,0)) cur.x--; }
    else if(e.code==='ArrowRight'){ if(!collide(cur,1,0)) cur.x++; }
    else if(e.code==='ArrowDown'){ if(!collide(cur,0,1)) cur.y++; else lock(); }
    else if(e.code==='ArrowUp'){ rotateCur(); }
    else if(e.code==='KeyX'){ hardDrop(); }
    else if(e.code==='KeyZ'){ holdPiece(); }
    else if(e.code==='Escape'){ closeGame(); }
  }
  window.addEventListener('keydown', keyDown);

  // Mobile keypad bindings (if present)
  const btn = id=>document.getElementById(id);
  btn('kLeft')?.addEventListener('pointerdown',()=>{ if(!collide(cur,-1,0)) cur.x--; });
  btn('kRight')?.addEventListener('pointerdown',()=>{ if(!collide(cur,1,0)) cur.x++; });
  btn('kDown')?.addEventListener('pointerdown',()=>{ if(!collide(cur,0,1)) cur.y++; else lock(); });
  btn('kRotate')?.addEventListener('pointerdown',()=>{ rotateCur(); });
  btn('kDrop')?.addEventListener('pointerdown',()=>{ hardDrop(); });
  // hold button removed

  // Overlay
  function showOverlay(text){
    const wrap = canvas.closest('.game-wrap');
    let ov = wrap.querySelector('.game-overlay');
    if(!ov){ ov=document.createElement('div'); ov.className='game-overlay'; wrap.appendChild(ov); }
    ov.innerHTML = `<div class="panel"><div class="title">결과</div><pre>${escapeHtml(text)}</pre><button class="btn outline" id="goClose">닫기</button></div>`;
    ov.style.display='grid';
    ov.querySelector('#goClose')?.addEventListener('click', closeGame);
  }

  let running=true;
  (function loop(){ if(!running) return; requestAnimationFrame(loop); ctx.clearRect(0,0,W,H);
    // Draw mosaic background
    if(img.complete){ const gs= Math.min(W,H)*0.9; const mx = (W-gs)/2, my=(H-gs)/2; const cell = Math.floor(gs/MOS);
      for(let gy=0; gy<MOS; gy++){
        for(let gx=0; gx<MOS; gx++){
          const id = gy* MOS + gx;
          const sx = Math.floor(img.width * gx/MOS), sy=Math.floor(img.height * gy/MOS);
          const sw = Math.floor(img.width/MOS), sh=Math.floor(img.height/MOS);
          const dx = mx + gx*cell, dy=my + gy*cell;
          ctx.globalAlpha = mosRevealed.has(id) ? 1 : 0.15;
          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, cell, cell);
          ctx.globalAlpha = 1;
        }
      }
    }
    // Gravity
    tick = (tick+1)%gravity; if(tick===0){ if(!collide(cur,0,1)) cur.y++; else lock(); }
    // Draw board
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const t=board[y][x]; if(t){ ctx.fillStyle=COLORS[t]; ctx.fillRect(OFFSET_X+x*CELL, OFFSET_Y+y*CELL, CELL-1, CELL-1); } }
    // Draw current
    ctx.fillStyle=COLORS[cur.type]; for(let y=0;y<cur.shape.length;y++) for(let x=0;x<cur.shape[0].length;x++) if(cur.shape[y][x]){ const px=cur.x+x, py=cur.y+y; if(py>=0) ctx.fillRect(OFFSET_X+px*CELL, OFFSET_Y+py*CELL, CELL-1, CELL-1); }
    // HUD
    const hudScore = document.getElementById('hudScore'); if(hudScore) hudScore.textContent = String(score);
    const hudLines = document.getElementById('hudLines'); if(hudLines) hudLines.textContent = String(lines);
    const hudLevel = document.getElementById('hudLevel'); if(hudLevel) hudLevel.textContent = String(level);
  })();
  return { stop(){ running=false; window.removeEventListener('keydown', keyDown); } };
}

function formatDate(input){ try{ const d = new Date(input); return new Intl.DateTimeFormat('ko', {year:'numeric', month:'short', day:'numeric'}).format(d); }catch{ return input; } }
function escapeHtml(s){ return (s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function sanitizeUrl(u){ if(!u) return '#'; try{ const url = new URL(u, location.href); return url.href; }catch{ return u; } }
function makeBubbles(){ const container = document.getElementById('bubbles'); if(!container) return; const count = 28; for(let i=0;i<count;i++){ const b = document.createElement('div'); b.className = 'bubble'; const size = 40 + Math.random()*120; const left = Math.random()*100; const delay = Math.random()*-20; const dur = 25 + Math.random()*35; const dx = (Math.random()*80-40) + 'vw'; b.style.width = `${size}px`; b.style.height = `${size}px`; b.style.left = `${left}vw`; b.style.bottom = `-10vh`; b.style.animationDelay = `${delay}s`; b.style.setProperty('--dur', `${dur}s`); b.style.setProperty('--dx', dx); b.style.setProperty('--s', 0.6 + Math.random()*0.8); container.append(b);} }
function getFallbackItems(){
  return [
    {title:'프로필',author:'Jay 제이',description:'기본 프로필 이미지',date:'2025-08-01T09:00:00.000Z',image:'OC/제이 프사.jpg',link:'https://x.com/jellodrago'},
    {title:'유혹',author:'Jay 제이',description:'표정 연습',date:'2025-07-29T09:00:00.000Z',image:'OC/제이 유혹.png',link:'https://x.com/jellodrago'},
    {title:'흥미',author:'Jay 제이',description:'표정 연습',date:'2025-07-27T09:00:00.000Z',image:'OC/제이 흥미.png',link:'https://x.com/jellodrago'},
    {title:'음흉',author:'Jay 제이',description:'표정 연습',date:'2025-07-25T09:00:00.000Z',image:'OC/제이 음흉.png',link:'https://x.com/jellodrago'},
    {title:'제이 건배',author:'Jay 제이',description:'건배!',date:'2025-07-22T09:00:00.000Z',image:'OC/제이 건배.png',link:'https://x.com/jellodrago'},
    {title:'제이님 커미션',author:'Jay 제이',description:'커미션 작업',date:'2025-07-19T09:00:00.000Z',image:'OC/제이님 커미션.png',link:'https://x.com/jellodrago'},
    {title:'움짤 007',author:'Jay 제이',description:'움짤',date:'2025-07-17T09:00:00.000Z',image:'OC/제이_움_007.gif',link:'https://x.com/jellodrago'},
    {title:'움짤 008',author:'Jay 제이',description:'움짤',date:'2025-07-16T09:00:00.000Z',image:'OC/제이_움_008.gif',link:'https://x.com/jellodrago'},
    {title:'Pyroble',author:'Jay 제이',description:'큰 이미지',date:'2025-07-12T09:00:00.000Z',image:'OC/Pyroble-large.png',link:'https://x.com/jellodrago'},
    {title:'BG 샷',author:'Jay 제이',description:'배경',date:'2025-07-10T09:00:00.000Z',image:'OC/jay_BG (1) - Copy.png',link:'https://x.com/jellodrago'},
    {title:'GIF 샷',author:'Jay 제이',description:'움짤',date:'2025-07-08T09:00:00.000Z',image:'OC/Goc4JFfXsAA_Zv8.gif',link:'https://x.com/jellodrago'},
    {title:'KakaoTalk 1',author:'Jay 제이',description:'스냅',date:'2025-07-06T09:00:00.000Z',image:'OC/KakaoTalk_20240822_192734325.png',link:'https://x.com/jellodrago'},
    {title:'KakaoTalk 2',author:'Jay 제이',description:'스냅',date:'2025-07-05T09:00:00.000Z',image:'OC/KakaoTalk_20240822_192757716.png',link:'https://x.com/jellodrago'},
    {title:'일러스트487(27.제이)',author:'Jay 제이',description:'일러스트',date:'2025-06-25T09:00:00.000Z',image:'OC/nsfw 일러스트487(27.제이)/일러스트487(27.제이).png',link:'https://x.com/jellodrago',nsfw:true},
    {title:'일러스트514(불건전)',author:'Jay 제이',description:'NSFW',date:'2025-06-20T09:00:00.000Z',image:'OC/nsfw 일러스트514(불건전)(27.제이)/일러스트514(불건전)(27.제이).png',link:'https://x.com/jellodrago',nsfw:true},
    {title:'Glitch',author:'Jay 제이',description:'NSFW glitch',date:'2025-06-18T09:00:00.000Z',image:'OC/nsfw Glitch/glitch-image-1751249689.png',link:'https://x.com/jellodrago',nsfw:true}
  ];
}


