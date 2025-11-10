// content.js
const SEL_USER='[data-message-author-role="user"]';
const SEL_ASSIST='[data-message-author-role="assistant"]';
const SEL_BOTH='[data-message-author-role]';
const state={entries:[],mounted:false,collapsed:false,obs:null,intObs:null,width:280};
const MAX_CHARS=80;

const ready=()=>new Promise(r=>{/complete|interactive/.test(document.readyState)?r():document.addEventListener('DOMContentLoaded',r,{once:true});});
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
const trim=(s,n=MAX_CHARS)=>{const t=norm(s);return t.slice(0,n)+(t.length>n?'…':'');};
const getRoot=()=>document.querySelector('main,[role="main"],[data-testid="conversation"],#root,body')||document.body;

const isScrollable=el=>{if(!el)return false;const s=getComputedStyle(el);return(['auto','scroll'].includes(s.overflowY))&&el.scrollHeight>el.clientHeight;};
const getScrollContainer=start=>{let el=start?.parentElement;while(el&&el!==document.body){if(isScrollable(el))return el;el=el.parentElement;}const m=document.querySelector('main');if(isScrollable(m))return m;return document.scrollingElement||document.documentElement||document.body;};

const smartScroll=(target,offset=-20)=>{if(!target)return;const c=getScrollContainer(target);
  try{target.scrollIntoView({block:'start',behavior:'instant'});}catch{}
  requestAnimationFrame(()=>{const t=target.getBoundingClientRect();const b=c.getBoundingClientRect?c.getBoundingClientRect():{top:0};
    const top=(c.scrollTop||0)+(t.top-b.top)+offset;
    (c===document.scrollingElement||c===document.documentElement||c===document.body)?window.scrollTo({top,behavior:'smooth'}):c.scrollTo({top,behavior:'smooth'});
    setTimeout(()=>{const t2=target.getBoundingClientRect();const top2=(c.scrollTop||0)+(t2.top-b.top)+offset;
      if(Math.abs((c.scrollTop||window.scrollY)-top2)>8){
        (c===document.scrollingElement||c===document.documentElement||c===document.body)?window.scrollTo({top:top2,behavior:'smooth'}):c.scrollTo({top:top2,behavior:'smooth'});
      }
    },120);
  });
};

const findMessagesSeq=()=>Array.from(getRoot().querySelectorAll(SEL_BOTH))
  .filter(el=>el.matches(SEL_USER)||el.matches(SEL_ASSIST))
  .map(el=>({el,role:el.matches(SEL_USER)?'user':'assistant'}));

const pairReplies=(seq)=>{
  const pairs=new Map();
  for(let i=0;i<seq.length;i++){
    const it=seq[i];
    if(it.role!=='user')continue;
    let reply=null;
    for(let j=i+1;j<seq.length;j++){
      if(seq[j].role==='user')break;
      if(seq[j].role==='assistant'){reply=seq[j].el;break;}
    }
    pairs.set(it.el,reply);
  }
  return pairs;
};

const findUserMessages=()=>Array.from(getRoot().querySelectorAll(SEL_USER))
  .filter(el=>!norm(el.innerText).startsWith('Vous avez dit :'));

const applyWidth=w=>{state.width=w;document.documentElement.style.setProperty('--cq-width',`${w}px`);};
const debounce=(fn,w)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),w);};};
const flash=el=>{el.classList.add('cq-highlight');setTimeout(()=>el.classList.remove('cq-highlight'),1600);};

const mountUI=()=>{if(state.mounted)return;state.mounted=true;
  const sidebar=document.createElement('aside');sidebar.id='cq-sidebar';
  const resizer=document.createElement('div');resizer.id='cq-resizer';
  const header=document.createElement('div');header.id='cq-header';
  const title=document.createElement('div');title.id='cq-title';title.textContent='Mes questions';
  const count=document.createElement('div');count.id='cq-count';count.textContent='0';
  const toggle=document.createElement('button');toggle.id='cq-toggle';toggle.textContent='⟷';
  header.appendChild(title);header.appendChild(count);header.appendChild(toggle);
  const list=document.createElement('div');list.id='cq-list';
  const preview=document.createElement('div');preview.id='cq-preview';preview.style.display='none';
  sidebar.appendChild(resizer);sidebar.appendChild(header);sidebar.appendChild(list);sidebar.appendChild(preview);
  document.documentElement.appendChild(sidebar);document.body.classList.add('cq-has-sidebar');

  chrome.storage?.local.get(['cqCollapsed','cqWidth']).then(v=>{const w=Math.min(Math.max(v?.cqWidth||280,200),560);applyWidth(w);if(v?.cqCollapsed){state.collapsed=true;sidebar.classList.add('cq-collapsed');document.body.classList.add('cq-collapsed');}});
  toggle.addEventListener('click',()=>{state.collapsed=!state.collapsed;sidebar.classList.toggle('cq-collapsed',state.collapsed);document.body.classList.toggle('cq-collapsed',state.collapsed);chrome.storage?.local.set({cqCollapsed:state.collapsed}).catch(()=>{});});

  let drag=false,startX=0,startW=0;
  resizer.addEventListener('mousedown',e=>{drag=true;startX=e.clientX;startW=state.width;document.body.classList.add('cq-resizing');e.preventDefault();});
  window.addEventListener('mousemove',e=>{if(!drag)return;const dx=startX-e.clientX;const w=Math.min(Math.max(startW+dx,200),560);applyWidth(w);});
  window.addEventListener('mouseup',()=>{if(!drag)return;drag=false;document.body.classList.remove('cq-resizing');chrome.storage?.local.set({cqWidth:state.width}).catch(()=>{});});

  state.intObs=new IntersectionObserver(ents=>{ents.forEach(ent=>{const id=ent.target.getAttribute('data-cq-id');const item=document.querySelector(`.cq-item[data-cq-id="${id}"]`);if(!item)return;ent.isIntersecting?item.classList.add('active'):item.classList.remove('active');});},{root:null,threshold:0.25});

  rescan();
  state.obs=new MutationObserver(debounce(()=>rescan(),200));
  state.obs.observe(getRoot(),{childList:true,subtree:true,characterData:true});
};

const rescan=()=>{const seq=findMessagesSeq();const pairs=pairReplies(seq);const users=findUserMessages();
  const mapped=users.map(el=>{
    let id=el.getAttribute('data-cq-id');if(!id){id='cq-'+Math.random().toString(36).slice(2);el.setAttribute('data-cq-id',id);}
    const replyEl=pairs.get(el)||null;
    let replyId=replyEl?.getAttribute('data-cq-id');if(replyEl&&!replyId){replyId='cq-r-'+Math.random().toString(36).slice(2);replyEl.setAttribute('data-cq-id',replyId);}
    const fullQ=norm(el.innerText||'');
    return {id,el,qText:trim(fullQ),qFull:fullQ,replyEl,replyId};
  }).filter(m=>m.qText);
  const sig=JSON.stringify(mapped.map(m=>[m.id,m.replyId,m.qText]));const prev=JSON.stringify(state.entries.map(m=>[m.id,m.replyId,m.qText]));if(sig===prev)return;
  state.entries=mapped;renderList();
};

const renderList=()=>{const list=document.querySelector('#cq-list');const count=document.querySelector('#cq-count');const preview=document.querySelector('#cq-preview');if(!list||!count||!preview)return;
  list.innerHTML='';count.textContent=String(state.entries.length);
  state.entries.forEach(m=>{
    const item=document.createElement('div');item.className='cq-item';item.setAttribute('data-cq-id',m.id);

    const txt=document.createElement('button');txt.className='cq-textbtn';txt.type='button';txt.title=m.qFull;
    const iconQ=document.createElement('span');iconQ.className='cq-icon';iconQ.textContent='🧑';
    const label=document.createElement('span');label.className='cq-label';label.textContent=m.qText;
    txt.appendChild(iconQ);txt.appendChild(label);
    txt.addEventListener('click',()=>{smartScroll(m.el);flash(m.el);});
    txt.addEventListener('mouseenter',e=>showPreview(preview,m.qFull,e.currentTarget));
    txt.addEventListener('mouseleave',()=>hidePreview(preview));

    const edit=document.createElement('button');edit.className='cq-edit';edit.type='button';edit.title='Éditer';edit.textContent='✏️';
    edit.addEventListener('click',async e=>{e.stopPropagation();await openEditorFor(m.el);});

    const reply=document.createElement('button');reply.className='cq-reply';reply.type='button';reply.title='Voir la réponse';
    const iconR=document.createElement('span');iconR.className='cq-icon';iconR.textContent='🤖';
    reply.appendChild(iconR);
    if(m.replyEl){reply.addEventListener('click',e=>{e.stopPropagation();smartScroll(m.replyEl);flash(m.replyEl);});}
    else{reply.disabled=true;reply.classList.add('cq-disabled');reply.title='Réponse indisponible';}

    const row=document.createElement('div');row.className='cq-row';
    row.appendChild(txt);row.appendChild(edit);row.appendChild(reply);
    item.appendChild(row);list.appendChild(item);

    if(state.intObs)state.intObs.observe(m.el);
    if(m.replyEl&&state.intObs)state.intObs.observe(m.replyEl);
  });
};

const showPreview=(box,text,anchor)=>{box.textContent=text;box.style.display='block';const r=anchor.getBoundingClientRect();box.style.top=`${r.top+window.scrollY+r.height+6}px`;box.style.left=`calc(100vw - var(--cq-width) + 8px)`;};
const hidePreview=box=>{box.style.display='none';box.textContent='';};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const focusEditor=root=>{const area=(root.closest('article')||document).querySelector('textarea,[contenteditable="true"]')||document.querySelector('textarea,[contenteditable="true"]');if(!area)return false;if(area.tagName==='TEXTAREA'){area.focus();area.selectionStart=area.value.length;area.selectionEnd=area.value.length;}else{area.focus();}return true;};
const hoverEl=el=>{['mouseenter','mouseover'].forEach(t=>el.dispatchEvent(new MouseEvent(t,{bubbles:true})));};

const findEditButton=root=>{const labels=['Modifier le message','Modifier','Edit','Editar','Bearbeiten','Modifica','Редактировать','編集','편집','编辑'];
  const scope=root.closest('article,[data-message-author-role]')||root;
  let btn=null;
  const sels=[...labels.map(l=>`button[aria-label*="${l}"]`),...labels.map(l=>`button[title*="${l}"]`),'button[data-testid*="edit"]','[role="button"][data-action="edit"]'];
  for(const s of sels){try{btn=scope.querySelector(s);}catch{} if(btn)break;}
  if(btn)return btn;
  const cand=scope.querySelectorAll('button,[role="button"]');
  for(const b of cand){const t=(b.getAttribute('aria-label')||b.getAttribute('title')||b.textContent||'').toLowerCase();if(/edit|modifier|editar|bearbeiten|modifica|редакт|編集|편집|编辑/.test(t))return b;}
  return null;
};

const findMoreButton=root=>{const labels=['Plus','More','Options','Actions','⋯','…'];const scope=root.closest('article,[data-message-author-role]')||root;
  const sels=['button[aria-haspopup="menu"]','button:has(svg[data-icon="ellipsis"])','button[aria-label*="…"]','button[aria-label*="⋯"]'];
  labels.forEach(l=>{sels.push(`button[aria-label*="${l}"]`);sels.push(`button[title*="${l}"]`);});
  for(const s of sels){try{const b=scope.querySelector(s)||scope.parentElement?.querySelector(s);if(b)return b;}catch{}}
  return null;
};

const findEditInMenu=()=>{const labels=['Modifier le message','Modifier','Edit','Editar','Bearbeiten','Modifica','Редактировать','編集','편집','编辑'];
  const pop=document.querySelector('[role="menu"],[data-headlessui-state],div[role="dialog"],[data-radix-popper-content]');
  if(!pop)return null;
  const items=[...pop.querySelectorAll('button,[role="menuitem"],[role="option"],[data-radix-collection-item]')];
  return items.find(n=>labels.some(l=>(n.textContent||n.getAttribute('aria-label')||'').toLowerCase().includes(l.toLowerCase())));
};

const tryClickEdit=async(root)=>{const btn=findEditButton(root);if(btn){btn.click();await sleep(160);return focusEditor(root);}return false;};
const tryMenuEdit=async(root)=>{const more=findMoreButton(root);if(!more)return false;more.click();await sleep(160);const inMenu=findEditInMenu();if(inMenu){inMenu.click();await sleep(160);return focusEditor(root);}return false;};
const tryGlobalEdit=async()=>{const any=findEditButton(document.body);if(any){any.click();await sleep(160);return focusEditor(document.body);}return false;};

const openEditorFor=async(msgEl)=>{smartScroll(msgEl);await sleep(180);hoverEl(msgEl);if(await tryClickEdit(msgEl))return true;if(await tryMenuEdit(msgEl))return true;if(await tryGlobalEdit())return true;return false;};

(async()=>{await ready();mountUI();})();
