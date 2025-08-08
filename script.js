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


