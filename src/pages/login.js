import { supabase, configured } from '../supabase.js';
import { store, signOut, whenUser } from '../state.js';
import { esc, toast } from '../ui.js';

const ERR = [
  [/Invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않아요.'],
  [/User already registered/i, '이미 가입된 이메일이에요. 로그인해 주세요.'],
  [/Email not confirmed/i, '이메일 인증이 아직이에요. 메일함의 인증 링크를 눌러 주세요.'],
  [/at least 6 characters/i, '비밀번호는 6자 이상이어야 해요.'],
  [/valid email|invalid format|Unable to validate email/i, '이메일 형식이 올바르지 않아요.'],
  [/rate limit|too many/i, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'],
  [/Signups not allowed/i, '현재 회원가입이 막혀 있어요. Supabase 설정을 확인해 주세요.'],
];
const korean = (m) => (ERR.find(([re]) => re.test(m)) || [null, m])[1];

export function renderLogin(root, query) {
  if (!configured) {
    root.innerHTML = `<section class="section narrow"><div class="notice error"><b>Supabase 환경변수가 아직 없어요</b>
      <p><code>VITE_SUPABASE_URL</code> 과 <code>VITE_SUPABASE_ANON_KEY</code> 를 설정해야 로그인할 수 있어요.</p>
      <p class="small">README의 “환경변수 설정” 절차를 따라 주세요.</p></div></section>`;
    return;
  }
  if (store.user) {
    root.innerHTML = `<section class="section narrow"><div class="auth-card">
      <h2>이미 로그인되어 있어요 🍊</h2><p class="muted">${esc(store.user.email)}</p>
      <div class="row"><a class="btn primary" href="#/favorites">내 즐겨찾기</a><button class="btn ghost dark" id="out">로그아웃</button></div></div></section>`;
    root.querySelector('#out').onclick = async () => { await signOut(); toast('로그아웃했어요. 또 만나요!', 'ok'); location.hash = '#/'; };
    return;
  }

  let tab = query.get('tab') === 'signup' ? 'signup' : 'login';
  const draw = () => {
    const su = tab === 'signup';
    root.innerHTML = `<section class="section narrow"><div class="auth-card">
      <div class="tabs"><button data-t="login" class="${su ? '' : 'on'}">로그인</button><button data-t="signup" class="${su ? 'on' : ''}">회원가입</button></div>
      <h2>${su ? '제주 스토리에 오신 걸 환영해요' : '다시 만나서 반가워요'}</h2>
      <form id="f" novalidate>
        <label>이메일<input type="email" name="email" autocomplete="email" placeholder="you@example.com" required /></label>
        <label>비밀번호<input type="password" name="pw" autocomplete="${su ? 'new-password' : 'current-password'}" placeholder="6자 이상" required /></label>
        ${su ? '<label>비밀번호 확인<input type="password" name="pw2" autocomplete="new-password" placeholder="한 번 더 입력" required /></label>' : ''}
        <p class="form-msg" id="msg" role="alert"></p>
        <button class="btn primary block" id="submit" type="submit">${su ? '가입하기' : '로그인'}</button>
      </form></div></section>`;
    root.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => { tab = b.dataset.t; draw(); });
    root.querySelector('#f').onsubmit = submit;
  };

  async function submit(e) {
    e.preventDefault();
    const f = e.target, msg = root.querySelector('#msg'), btn = root.querySelector('#submit');
    const email = f.email.value.trim(), pw = f.pw.value;
    msg.className = 'form-msg'; msg.textContent = '';
    if (!email || !pw) { msg.textContent = '이메일과 비밀번호를 입력해 주세요.'; return; }
    if (tab === 'signup' && pw !== f.pw2.value) { msg.textContent = '비밀번호가 서로 달라요.'; return; }
    btn.disabled = true; btn.textContent = '잠시만요…';
    try {
      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin } });
        if (error) throw error;
        if (data.session) { await whenUser(); toast('가입 완료! 환영해요 🍊', 'ok'); location.hash = '#/'; }
        else if (data.user && data.user.identities && data.user.identities.length === 0) { msg.textContent = '이미 가입된 이메일이에요. 로그인해 주세요.'; }
        else { msg.className = 'form-msg ok'; msg.textContent = `📧 ${email} 로 인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 완료돼요.`; f.reset(); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        await whenUser();
        toast('로그인했어요. 반가워요! 🍊', 'ok'); location.hash = '#/favorites';
      }
    } catch (err) {
      msg.textContent = korean(err.message || String(err));
    } finally {
      btn.disabled = false; btn.textContent = tab === 'signup' ? '가입하기' : '로그인';
    }
  }
  draw();
}
