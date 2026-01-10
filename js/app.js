import { QUESTIONS } from '../data/questions.js';
import { CARDS } from '../data/cards.js';

const app = document.getElementById('app');
const STORAGE_KEY = 'award_cards_collection_v1';
const ASKED_KEY = 'award_cards_asked_v1';

/* Utility for localStorage */
const store = {
  load(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')}
    catch(e){return []}
  },
  save(list){localStorage.setItem(STORAGE_KEY,JSON.stringify(list))}
}
const askedStore = {
  load(){
    try{return JSON.parse(localStorage.getItem(ASKED_KEY) || '[]')}
    catch(e){return []}
  },
  save(list){localStorage.setItem(ASKED_KEY,JSON.stringify(list))}
}

let state = { collection: store.load(), asked: askedStore.load() };
// helper de UI: mostrar mensagens rápidas (snackbar)
function showSnackbar(text){
  const id = 'aw-snackbar';
  let el = document.getElementById(id);
  if(!el){
    el = document.createElement('div');
    el.id = id;
    el.className = 'snackbar';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2200);
}

function removeResetButton(){
  const prev = document.getElementById('reset-asked');
  if(prev) prev.remove();
}

/* --- Views --- */
function renderHome(){
  const html = `
    <div class="container">
      <div class="header">
        <div class="h1">Escolha um tema</div>
        <button class="btn" id="view-collection">Coleção</button>
      </div>
      <div class="list">${QUESTIONS.map(t => `
        <div class="topic" data-topic="${t.id}">
          <img src="${t.image}" alt="${t.name}" />
          <div class="meta">
            <div class="title">${t.name}</div>
            <div class="small">${t.questions.length} questão(ões)</div>
          </div>
          <div class="small">Começar</div>
        </div>`).join('')}</div>
    </div>`;
  app.innerHTML = html;
  // delegação: captura cliques dentro da lista para identificar o tema clicado
  const listEl = app.querySelector('.list');
  if(listEl){
    listEl.addEventListener('click', (ev)=>{
      const topicEl = ev.target.closest('.topic');
      if(!topicEl) return;
      const topicId = topicEl.dataset.topic;
      startTopic(topicId);
    });
  }
  document.getElementById('view-collection').addEventListener('click', ()=>renderCollection());
}

function startTopic(topicId){
  const topic = QUESTIONS.find(t=>t.id===topicId);
  if(!topic){ console.warn('tema não encontrado:', topicId); return renderHome(); }
  // filtra perguntas ainda não feitas
  let pool = topic.questions.filter(q => !state.asked.includes(q.id));
  if(pool.length === 0){
    // todas as perguntas do tema já foram feitas — mostrar tela de conclusão
    console.info('Todas as perguntas do tema já foram usadas; mostrando tela de conclusão.');
    renderTopicComplete(topic);
    return;
  }
  const q = pool[Math.floor(Math.random()*pool.length)];
  console.log('Selecting question', q.id);
  renderCardScreen(topic,q);
}

function renderCardScreen(topic,q){
  const html = `
  <div class="container">
    <div class="header" style="width:100%">
      <button class="btn" id="back-home">Voltar</button>
      <div class="h1">${topic.name}</div>
      <div style="width:36px"></div>
    </div>
    <div class="card-wrap" style="margin-top:12px">
      <div class="card" id="study-card">
        <div class="face front" style="background-image:url('${q.image}')">
          <div class="overlay"></div>
          <div style="z-index:2;width:100%">
            <div class="question">${q.question}</div>
            <div class="options">${q.options.map((o,i)=>`<div class="option" data-index="${i}">${o}</div>`).join('')}</div>
          </div>
        </div>
        <div class="face back center" id="card-back" style="display:none">
          <div class="back-content center">
            <div class="note" id="back-msg"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
  app.innerHTML = html;
  removeResetButton();
  document.getElementById('back-home').addEventListener('click', ()=>renderHome());
  document.querySelectorAll('.option').forEach(el=>el.addEventListener('click', (e)=>handleAnswer(e,q)));
}

function renderTopicComplete(topic){
  const html = `
  <div class="container">
    <div class="header">
      <button class="btn" id="back-home">Início</button>
      <div class="h1">Parabéns</div>
      <div style="width:36px"></div>
    </div>
    <div style="margin-top:18px;display:flex;flex-direction:column;align-items:center;gap:12px">
      <div class="note">Parabéns! Você concluiu todas as perguntas de <strong>${topic.name}</strong>.</div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn" id="restart-topic">Reiniciar perguntas</button>
        <button class="btn" id="to-home">Voltar</button>
      </div>
    </div>
  </div>`;
  app.innerHTML = html;
  removeResetButton();
  document.getElementById('to-home').addEventListener('click', ()=>renderHome());
  document.getElementById('restart-topic').addEventListener('click', ()=>{
    const topicIds = topic.questions.map(q=>q.id);
    state.asked = state.asked.filter(id => !topicIds.includes(id));
    askedStore.save(state.asked);
    showSnackbar('Perguntas do tema reiniciadas');
    startTopic(topic.id);
  });
}

function handleAnswer(e,q){
  const idx = Number(e.currentTarget.dataset.index);
  const card = document.getElementById('study-card');
  const back = document.getElementById('card-back');
  const backMsg = document.getElementById('back-msg');
  // add visual selection
  e.currentTarget.classList.add(idx===q.answerIndex? 'correct':'wrong');
  // start 360 animation and swap content at 50%
  const duration = 800;
  card.classList.add('rotate-360');
  setTimeout(()=>{
    // reveal back
    back.style.display = 'flex';
    backMsg.textContent = idx===q.answerIndex? 'Parabéns! Você acertou.' : 'Tente novamente.';
  }, duration/2);
  card.addEventListener('animationend', ()=>{
    card.classList.remove('rotate-360');
    // After short delay, navigate accordingly
    setTimeout(()=>{
      if(idx===q.answerIndex){
        // marca como respondida (somente em acerto)
        if(!state.asked.includes(q.id)){
          state.asked.push(q.id);
          askedStore.save(state.asked);
          console.log('Marked answered', q.id, 'askedCount', state.asked.length);
        }
        grantReward(q.rewardCardId);
      } else {
        renderHome();
      }
    },600);
  },{once:true});
}

function grantReward(cardId){
  // ensure card exists
  const reward = CARDS.find(c=>c.id===cardId);
  if(!reward) return renderReward(null);
  // add to collection if not exists
  if(!state.collection.find(c=>c.id===cardId)){
    state.collection.push(reward);
    store.save(state.collection);
  }
  renderReward(reward);
}

function renderReward(card){
  const html = `
  <div class="container">
    <div style="width:100%" class="header">
      <button class="btn" id="to-home">Início</button>
      <div class="h1">Recompensa</div>
      <div style="width:36px"></div>
    </div>
    <div style="margin-top:18px;display:flex;flex-direction:column;gap:16px;align-items:center">
      <div class="collectible rotate-continuous center" role="img" aria-label="${card?.title || 'Card'}">
        <img src="${card?.frontImage || 'assets/card_math_front.svg'}" alt="${card?.title|| 'Card'}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\'note\'>Imagem não encontrada</div>')"/>
      </div>
      <div class="note">Você recebeu: <strong>${card?.title || '—'}</strong></div>
      <button class="btn" id="to-collection">Ver Coleção</button>
    </div>
  </div>`;
  app.innerHTML = html;
  removeResetButton();
  document.getElementById('to-home').addEventListener('click', ()=>renderHome());
  document.getElementById('to-collection').addEventListener('click', ()=>renderCollection());
} 

function renderCollection(){
  const list = state.collection;
  const html = `
  <div class="container">
    <div class="header">
      <button class="btn" id="back-home">Início</button>
      <div class="h1">Minha Coleção</div>
      <div style="width:36px"></div>
    </div>
    <div style="margin-top:12px">
      ${list.length===0? '<div class="note">Nenhuma carta ainda. Jogue e ganhe prêmios!</div>' : `<div class="collection-list">${list.map(c=>`<div class="card-thumb" data-id="${c.id}"><img src="${c.frontImage}" alt="${c.title||''}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\'note\'>Imagem não encontrada</div>')"/></div>`).join('')}</div>`}
    </div>
  </div>`;
  app.innerHTML = html;
  document.getElementById('back-home').addEventListener('click', ()=>renderHome());
  document.querySelectorAll('.card-thumb').forEach(el=>el.addEventListener('click', ()=>renderCardView(el.dataset.id)));
  // botão para resetar histórico de perguntas visível na tela de coleção
  removeResetButton();
  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-asked';
  resetBtn.className = 'btn reset-btn';
  resetBtn.textContent = 'Reset Perguntas';
  resetBtn.addEventListener('click', ()=>{
    const ok = confirm('Tem certeza que deseja reiniciar TODOS os dados (coleção e histórico)? Esta ação não pode ser desfeita.');
    if(!ok) return;
    state.asked = [];
    state.collection = [];
    askedStore.save(state.asked);
    store.save(state.collection);
    showSnackbar('Dados reiniciados');
    // atualizar a tela para refletir coleção vazia
    renderCollection();
  });
  // anexar ao body para ficar fixo no canto inferior
  document.body.appendChild(resetBtn);
} 

function renderCardView(id){
  const c = state.collection.find(x=>x.id===id);
  if(!c) return renderCollection();
  const html = `
  <div class="container">
    <div class="header" style="width:100%">
      <button class="btn" id="back-collection">Voltar</button>
      <div class="h1">${c.title}</div>
      <div style="width:36px"></div>
    </div>
    <div style="margin-top:18px;display:flex;flex-direction:column;align-items:center;gap:14px">
      <div class="collectible rotate-continuous center" style="width:260px;height:360px" role="img" aria-label="${c.title}">
        <img src="${c.frontImage}" alt="${c.title}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\'note\'>Imagem não encontrada</div>')"/>
      </div>
      <div class="note">${c.backText}</div>
    </div>
  </div>`;
  app.innerHTML = html;
  document.getElementById('back-collection').addEventListener('click', ()=>renderCollection());
} 

/* Init */
function init(){
  renderHome();
}

init();
