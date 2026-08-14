const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];

window.addEventListener('load',()=>setTimeout(()=>$('.loader').classList.add('done'),250));

const cursor=$('.cursor');
window.addEventListener('pointermove',e=>{cursor.style.left=`${e.clientX-5}px`;cursor.style.top=`${e.clientY-5}px`});
$$('a,button').forEach(el=>{el.addEventListener('mouseenter',()=>cursor.classList.add('hover'));el.addEventListener('mouseleave',()=>cursor.classList.remove('hover'))});

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
$$('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${(i%4)*65}ms`;observer.observe(el)});

const menuToggle=$('.menu-toggle'), mobileMenu=$('.mobile-menu');
menuToggle.addEventListener('click',()=>{const open=mobileMenu.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));mobileMenu.setAttribute('aria-hidden',String(!open));document.body.style.overflow=open?'hidden':''});
$$('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>{mobileMenu.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');document.body.style.overflow=''}));

$$('[data-day]').forEach(button=>button.addEventListener('click',()=>{$$('[data-day]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false')});$$('.schedule').forEach(s=>s.classList.remove('active'));button.classList.add('active');button.setAttribute('aria-selected','true');$(`#${button.dataset.day}`).classList.add('active')}));

const modals={account:$('#account-modal'),ticket:$('#ticket-modal')};
function openModal(name){const modal=modals[name];if(name==='account')renderAccount();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>$('input',modal)?.focus(),100)}
function closeModal(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=''}
$$('[data-modal]').forEach(btn=>btn.addEventListener('click',()=>openModal(btn.dataset.modal)));
$$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.closest('.modal'))));
$$('.modal').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal)}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal.open').forEach(closeModal)});

$$('[data-ticket]').forEach(btn=>btn.addEventListener('click',()=>{$('#selected-ticket').textContent=btn.dataset.ticket;openModal('ticket')}));
const toast=$('.toast');
function notify(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3000)}
let authMode='login';
function readUser(){const raw=localStorage.getItem('sever-id');if(!raw)return null;try{return JSON.parse(raw)}catch{const migrated={email:raw,id:`SVR-${Math.random().toString(36).slice(2,8).toUpperCase()}`,created:new Date().toISOString()};localStorage.setItem('sever-id',JSON.stringify(migrated));return migrated}}
function setAccountLabels(loggedIn){$$('[data-modal="account"],.login-trigger').forEach(el=>el.textContent=loggedIn?'Мой кабинет':'Личный кабинет')}
function renderAccount(){const user=readUser(),auth=$('#auth-view'),account=$('#account-view');if(!user){auth.hidden=false;account.hidden=true;setAccountLabels(false);return}auth.hidden=true;account.hidden=false;setAccountLabels(true);$('#profile-email').textContent=user.email;$('#profile-id').textContent=user.id||'SVR-GUEST';$('#profile-avatar').textContent=(user.email||'С').charAt(0).toUpperCase();$('#profile-created').textContent=new Date(user.created||Date.now()).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});$('#profile-ticket').textContent=localStorage.getItem('sever-ticket')||'Пока не выбран'}
$('#account-form').addEventListener('submit',e=>{e.preventDefault();const email=new FormData(e.currentTarget).get('email');const user={email,id:`SVR-${Math.random().toString(36).slice(2,8).toUpperCase()}`,created:new Date().toISOString()};localStorage.setItem('sever-id',JSON.stringify(user));renderAccount();notify(authMode==='register'?'СЕВЕР ID создан. Добро пожаловать.':'Вход выполнен. Личный кабинет открыт.')});
$('#register-switch').addEventListener('click',()=>{authMode=authMode==='login'?'register':'login';$('#account-title').innerHTML=authMode==='register'?'Создать<br><em>СЕВЕР ID.</em>':'Личный<br><em>кабинет.</em>';$('#auth-description').textContent=authMode==='register'?'Один ID для билетов, программы и событий СЕВЕРА.':'Билеты и избранные события всегда под рукой.';$('#auth-submit-text').textContent=authMode==='register'?'Создать ID':'Продолжить';$('#register-switch').textContent=authMode==='register'?'У меня уже есть ID':'Создать ID'});
$('#account-logout').addEventListener('click',()=>{localStorage.removeItem('sever-id');authMode='login';renderAccount();notify('Вы вышли из СЕВЕР ID.')});
$('#ticket-form').addEventListener('submit',e=>{e.preventDefault();localStorage.setItem('sever-ticket',$('#selected-ticket').textContent);closeModal(modals.ticket);notify('Бронь создана. Билет появился в личном кабинете.')});
renderAccount();

const target=new Date('2027-06-18T16:00:00+03:00').getTime();
function tick(){const d=Math.max(0,target-Date.now());$('#days').textContent=String(Math.floor(d/864e5)).padStart(3,'0');$('#hours').textContent=String(Math.floor(d/36e5)%24).padStart(2,'0');$('#minutes').textContent=String(Math.floor(d/6e4)%60).padStart(2,'0');$('#seconds').textContent=String(Math.floor(d/1e3)%60).padStart(2,'0')}
tick();setInterval(tick,1000);

window.addEventListener('scroll',()=>{const photo=$('.hero-photo');if(window.scrollY<innerHeight)photo.style.transform=`scale(${1.035-window.scrollY*.00002}) translateY(${window.scrollY*.08}px)`},{passive:true});
