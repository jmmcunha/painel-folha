/* Configuração do painel. É o único arquivo que precisa ser editado antes de publicar. */
window.PF_CONFIG = {
  titulo: 'Painel da Folha',
  subtitulo: 'Gestão e acompanhamento da folha de pagamento',

  /* Login pelo Firebase Authentication (e-mail e senha). */
  firebase: {
    apiKey: 'AIzaSyAcDY06uTPWGITASl3Uud4DDVn213RBe90',
    authDomain: 'projeto-folha.firebaseapp.com',
    projectId: 'projeto-folha',
    appId: '1:494657843103:web:5dfc10a0ebe12d5c4797aa',
  },

  /* Tela de perfil e diversidade. Use false para ocultá-la. */
  moduloDiversidade: true,
  /* Grupos menores que este número aparecem sem detalhe na tela de diversidade. */
  grupoMinimo: 3,

  /* Marcos de gestão iniciais (cada usuário pode acrescentar os seus na tela Evolução).
     Exemplo: { nome: 'Início da gestão', competencia: '2026-02' } */
  marcos: [],
};
