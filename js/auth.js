/* Login pelo Firebase Authentication. Só controla o acesso à tela: a folha nunca é enviada ao Firebase. */
(function () {
  'use strict';
  const PF = window.PF, CFG = window.PF_CONFIG || {};
  const fb = CFG.firebase;
  PF.auth = { ativo: !!(fb && fb.apiKey && fb.apiKey !== 'COLE_AQUI'), usuario: null };

  const ERROS = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.', 'auth/invalid-email': 'E-mail em formato inválido.',
    'auth/missing-password': 'Informe a senha.', 'auth/user-disabled': 'Esta conta está desativada.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com o serviço de login. Verifique a internet.',
  };

  PF.iniciarAuth = function (aoEntrar) {
    const carregando = document.getElementById('carregando'), login = document.getElementById('login');
    if (!PF.auth.ativo) { carregando.hidden = true; aoEntrar(null); return; }
    const msg = document.getElementById('login-msg');
    const diz = (t, erro) => { msg.textContent = t; msg.className = 'aviso ' + (erro ? 'erro' : 'nota'); msg.hidden = !t; };
    let auth;
    try {
      window.firebase.initializeApp(fb);
      auth = window.firebase.auth();
    } catch (e) {
      carregando.hidden = true; login.hidden = false;
      diz('A configuração do Firebase em js/config.js está incompleta ou inválida: ' + e.message, true);
      return;
    }
    let dentro = false;
    auth.onAuthStateChanged(u => {
      carregando.hidden = true;
      if (u) { PF.auth.usuario = u; login.hidden = true; if (!dentro) { dentro = true; aoEntrar(u); } }
      else if (dentro) location.reload();
      else login.hidden = false;
    });
    const form = document.getElementById('login-form'), btn = document.getElementById('login-entrar');
    form.addEventListener('submit', e => {
      e.preventDefault();
      diz('');
      btn.disabled = true;
      const email = document.getElementById('login-email').value.trim(), senha = document.getElementById('login-senha').value;
      auth.setPersistence(window.firebase.auth.Auth.Persistence.SESSION)
        .then(() => auth.signInWithEmailAndPassword(email, senha))
        .catch(er => diz(ERROS[er.code] || 'Não foi possível entrar (' + (er.code || er.message) + ').', true))
        .then(() => { btn.disabled = false; });
    });
    document.getElementById('login-esqueci').addEventListener('click', () => {
      const email = document.getElementById('login-email').value.trim();
      if (!email) { diz('Informe o e-mail acima e clique de novo em "Esqueci a senha".', true); return; }
      auth.sendPasswordResetEmail(email)
        .then(() => diz('Se houver conta para ' + email + ', a mensagem de redefinição de senha foi enviada.'))
        .catch(er => diz(er.code === 'auth/user-not-found' ? 'Se houver conta para ' + email + ', a mensagem de redefinição de senha foi enviada.' : (ERROS[er.code] || 'Não foi possível enviar a mensagem (' + er.code + ').'), er.code !== 'auth/user-not-found'));
    });
    PF.sair = () => auth.signOut();
  };
})();
