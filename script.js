const glow = document.querySelector('.cursor-glow');
window.addEventListener('pointermove', (event) => {
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal, .reveal-title').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min((index % 5) * 70, 280)}ms`;
  observer.observe(element);
});

const modal = document.querySelector('#login-modal');
const accountButton = document.querySelector('[data-open-login]');
const closeLogin = () => {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
};
accountButton.addEventListener('click', () => {
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.querySelector('#login-email').focus();
});
document.querySelector('[data-close-login]').addEventListener('click', closeLogin);
modal.addEventListener('click', (event) => { if (event.target === modal) closeLogin(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLogin(); });
document.querySelector('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#login-email').value;
  localStorage.setItem('aura-member', email);
  accountButton.innerHTML = 'В кабинете <span>↗</span>';
  closeLogin();
});
document.querySelector('[data-signup]').addEventListener('click', () => {
  document.querySelector('#login-form').requestSubmit();
});
const member = localStorage.getItem('aura-member');
if (member) accountButton.innerHTML = 'В кабинете <span>↗</span>';
