'use strict';
const $ = (s) => document.querySelector(s);
const email = $('#email'), password = $('#password');
// Store only a per-tab demo marker; never transmit or store the entered credentials.
if (window.RRDemoSession.hasSession()) window.RRDemoSession.enter();
window.addEventListener('pageshow', () => {
  if (window.RRDemoSession.hasSession()) window.RRDemoSession.enter();
});
$('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const validEmail = email.validity.valid, validPassword = password.value.length > 0;
  $('#email-error').textContent = validEmail ? '' : '請輸入有效的 Email。';
  $('#password-error').textContent = validPassword ? '' : '請輸入密碼。';
  email.setAttribute('aria-invalid', String(!validEmail));
  password.setAttribute('aria-invalid', String(!validPassword));
  if (!validEmail || !validPassword) { (validEmail ? password : email).focus(); return; }
  password.value = ''; password.type = 'password';
  $('#reveal').setAttribute('aria-pressed', 'false'); $('#reveal').setAttribute('aria-label', '顯示密碼');
  email.value = '';
  if (!window.RRDemoSession.start()) {
    $('#login-result').textContent = '無法保存此分頁的登入狀態，請允許網站儲存後再試。';
    return;
  }
  $('#login-result').textContent = '正在進入 CMS…';
  window.RRDemoSession.enter();
});
$('#reveal').addEventListener('click', () => {
  const showing = password.type === 'password'; password.type = showing ? 'text' : 'password';
  $('#reveal').setAttribute('aria-pressed', String(showing));
  $('#reveal').setAttribute('aria-label', showing ? '隱藏密碼' : '顯示密碼');
});
const modal = $('#modal'); let opener; let chosenLocale = '繁體中文';
const titles = {forgot:'忘記密碼', language:'選擇語系', support:'支援中心'};
function openDialog(name, trigger) {
  if (!modal.open) opener = trigger || document.activeElement;
  $('#modal-title').textContent = titles[name];
  $('#modal-content').replaceChildren($('#' + name).content.cloneNode(true));
  if (!modal.open) modal.showModal();
  if (name === 'forgot') {
    $('#reset-form').addEventListener('submit', (event) => {
      event.preventDefault(); const field = $('#reset-email');
      field.setAttribute('aria-invalid', String(!field.validity.valid));
      $('#reset-result').textContent = field.validity.valid ? '示範完成：未寄出郵件，也未傳輸或保存 Email。' : '請輸入有效的 Email。';
      if (!field.validity.valid) field.focus(); else field.value = '';
    });
  }
  if (name === 'language') document.querySelectorAll('[data-locale]').forEach(button => {
    const selected = button.dataset.locale === chosenLocale;
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = button.dataset.locale + (selected ? ' ✓' : '');
    button.addEventListener('click', () => { chosenLocale = button.dataset.locale; $('#locale-label').textContent = chosenLocale; $('#locale-button').setAttribute('aria-label', '語系，' + chosenLocale); $('#locale-button').title = '語系，' + chosenLocale; modal.close(); });
  });
  if (name === 'support') $('#support-reset').addEventListener('click', () => openDialog('forgot'));
  (name === 'forgot' ? $('#reset-email') : $('#close-modal')).focus();
}
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.dialog, button)));
$('#close-modal').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => { $('#modal-content').replaceChildren(); opener?.focus(); });
modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); } });
modal.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const items = [...modal.querySelectorAll('button,input')]; const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.addEventListener('pagehide', () => { password.value = ''; email.value = ''; });
