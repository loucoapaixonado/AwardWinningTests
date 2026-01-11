import { QUESTIONS } from '../data/questions.js';
import { CARDS } from '../data/cards.js';

const app = document.getElementById('app');
const STORAGE_KEY = 'award_cards_collection_v1';
const ASKED_KEY = 'award_cards_asked_v1';
const SELECTED_TOPICS_KEY = 'award_cards_selected_topics_v1';

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
const selectedTopicsStore = {
  load(){
    try{return JSON.parse(localStorage.getItem(SELECTED_TOPICS_KEY) || JSON.stringify(['mlp']))}
    catch(e){return ['mlp']}
  },
  save(list){localStorage.setItem(SELECTED_TOPICS_KEY,JSON.stringify(list))}
}

let state = { collection: store.load(), asked: askedStore.load(), selectedTopics: selectedTopicsStore.load() };
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

// Helpers para download de imagens
function getFileExtension(url){
  try{
    const clean = url.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    const ext = parts[parts.length-1];
    if(!ext || ext.length>5 || ext.includes('/')) return 'png';
    return ext;
  }catch(e){return 'png'}
}
function downloadImage(url, filename){
  try{
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // some browsers require anchor to be in DOM
    document.body.appendChild(a);
    a.click();
    a.remove();
  }catch(e){
    console.error('Falha ao iniciar download', e);
    showSnackbar('Não foi possível iniciar o download');
  }
}

/* --- Views --- */
function renderHome(){
  app.classList.add('scrollable');
  const topics = QUESTIONS.filter(t => state.selectedTopics.includes(t.id));
  const html = `
    <div class="container">
      <div class="header">
        <div class="h1">Escolha um tema</div>
        <button class="btn" id="view-collection">Coleção</button>
      </div>
      <div class="list">${topics.map(t => `
        <div class="topic" data-topic="${t.id}">
          <img src="${t.image}" alt="${t.name}" />
          <div class="meta">
            <div class="title">${t.name}</div>
            <div class="small">${(t.questions.filter(q => !state.asked.includes(q.id)).length)} ${(t.questions.filter(q => !state.asked.includes(q.id)).length === 1) ? 'questão restante' : 'questões restantes'}</div>
          </div>
        </div>`).join('')}</div>
      <button class="btn" id="add-topic" style="margin-top:20px;">Editar</button>
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
  document.getElementById('add-topic').addEventListener('click', ()=>renderTopicSelection());
  // mostrar botão de reset apenas na tela inicial
  removeResetButton();
  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-asked';
  resetBtn.className = 'btn reset-btn';
  resetBtn.textContent = 'Reiniciar Dados';
  resetBtn.addEventListener('click', ()=>{
    const ok = confirm('Tem certeza que deseja reiniciar TODOS os dados (coleção e histórico)? Esta ação não pode ser desfeita.');
    if(!ok) return;
    state.asked = [];
    state.collection = [];
    askedStore.save(state.asked);
    store.save(state.collection);
    showSnackbar('Dados reiniciados');
    renderHome();
  });
  document.body.appendChild(resetBtn);
}

function renderTopicSelection(){
  const html = `
    <div class="container">
      <div class="header">
        <button class="btn" id="back-home">Voltar</button>
        <div class="h1">Selecionar Temas</div>
        <div style="width:36px"></div>
      </div>
      <div class="list">${QUESTIONS.map(t => `
        <div class="topic-selection" data-topic="${t.id}">
          <label>
            <input type="checkbox" ${state.selectedTopics.includes(t.id) ? 'checked' : ''} />
            <img src="${t.image}" alt="${t.name}" />
            <div class="meta">
              <div class="title">${t.name}</div>
              <div class="small">${t.questions.length} perguntas</div>
            </div>
          </label>
        </div>`).join('')}</div>
      <button class="btn" id="save-topics" style="margin-top:20px;">Salvar</button>
    </div>`;
  app.innerHTML = html;
  removeResetButton();
  document.getElementById('back-home').addEventListener('click', ()=>renderHome());
  document.getElementById('save-topics').addEventListener('click', ()=>{
    const selected = Array.from(document.querySelectorAll('.topic-selection input:checked')).map(cb => cb.closest('.topic-selection').dataset.topic);
    state.selectedTopics = selected;
    selectedTopicsStore.save(state.selectedTopics);
    showSnackbar('Temas salvos!');
    renderHome();
  });
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
        <div class="card-inner">
          <div class="card-face front" id="card-front" style="background-image:url('${q.image}')">
            <div class="overlay"></div>
            <div style="z-index:2;width:100%">
              <div class="question">${q.question}</div>
              <div class="options">${q.options.map((o,i)=>`<div class="option" data-index="${i}">${o}</div>`).join('')}</div>
            </div>
          </div>
          <div class="card-face back center" id="card-back">
            <div class="back-content center">
              <div class="note" id="back-msg"></div>
            </div>
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
      <button class="btn" id="back-home">Voltar</button>
      <div class="h1">Parabéns</div>
      <div style="width:36px"></div>
    </div>
    <div style="margin-top:18px;display:flex;flex-direction:column;align-items:center;gap:12px">
      <div class="note">Parabéns! Você concluiu todas as perguntas de <strong>${topic.name}</strong>.</div>
    </div>
  </div>`;
  app.innerHTML = html;
  removeResetButton();
  document.getElementById('back-home').addEventListener('click', ()=>renderHome());
}

function handleAnswer(e,q){
  const idx = Number(e.currentTarget.dataset.index);
  const card = document.getElementById('study-card');
  const front = document.getElementById('card-front');
  const back = document.getElementById('card-back');
  const backMsg = document.getElementById('back-msg');
  // add visual selection
  e.currentTarget.classList.add(idx===q.answerIndex? 'correct':'wrong');
  // start 360 animation and update back content at 50%
  const duration = 800;
  card.classList.add('rotate-180');
  setTimeout(()=>{
    // apenas atualiza a mensagem do verso; a visibilidade é controlada pela rotação 3D
    backMsg.textContent = idx===q.answerIndex? 'Parabéns! Você acertou.' : 'Tente novamente.';
  }, duration/2);
  card.addEventListener('animationend', ()=>{
    card.classList.add('rotated-180');
    card.classList.remove('rotate-180');
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
      <button class="btn" id="to-home">Voltar</button>
      <div class="h1">Recompensa</div>
      <div style="width:36px"></div>
    </div>
    <div style="margin-top:18px;display:flex;flex-direction:column;gap:16px;align-items:center">
      <div class="collectible rotate-continuous center" role="img" aria-label="${card?.title || 'Card'}">
        <div class="collectible-inner">
          <div class="collectible-face front">
            <img src="${card?.frontImage || 'assets/card_math_front.svg'}" alt="${card?.title|| 'Card frente'}" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\'note\'>Imagem não encontrada</div>')"/>
          </div>
          <div class="collectible-face back">
            <img src="${card?.backImage || 'assets/card_math_back.svg'}" alt="${card?.title|| 'Card verso'}" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\'note\'>Imagem não encontrada</div>')"/>
          </div>
        </div>
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
  app.classList.add('scrollable');
  const list = state.collection;
  const html = `
  <div class="container">
    <div class="header">
      <button class="btn" id="back-home">Voltar</button>
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
  // não exibir botão de reset nesta tela (está disponível apenas na Tela Inicial)
  removeResetButton();
}

function renderCardView(id){
  app.classList.remove('scrollable');
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
        <div class="collectible-inner">
          <div class="collectible-face front">
            <img src="${c.frontImage}" alt="${c.title|| 'Card frente'}" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\'note\'>Imagem não encontrada</div>')"/>
          </div>
          <div class="collectible-face back">
            <img src="${c.backImage}" alt="${c.title|| 'Card verso'}" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\'note\'>Imagem não encontrada</div>')"/>
          </div>
        </div>
      </div>
      <div class="note">${c.backText}</div>
      <div style="margin-top:8px">
        <button class="btn" id="download-front">Baixar frente</button>
      </div>
    </div>
  </div>`;
  app.innerHTML = html;
  document.getElementById('back-collection').addEventListener('click', ()=>renderCollection());
  // handler para download da frente do card
  const dl = document.getElementById('download-front');
  if(dl){
    dl.addEventListener('click', ()=>{
      const ext = getFileExtension(c.frontImage || 'image.png');
      const fileName = `${c.id}-front.${ext}`;
      downloadImage(c.frontImage, fileName);
    });
  }
}

/* Init */
function init(){
  renderHome();
}

init();
