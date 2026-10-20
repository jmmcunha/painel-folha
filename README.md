# Painel da Folha

Painel de gestão e acompanhamento da folha de pagamento. É um site estático: lê os arquivos da folha no navegador de quem usa, calcula tudo ali e não envia a folha a nenhum servidor.

## O que o painel faz

| Tela | Para que serve |
|---|---|
| Visão geral | Custo total, remuneração bruta, encargos, líquido, número de colaboradores e custo médio, com variação e evolução mensal |
| Estrutura | Árvore diretoria › coordenação › supervisão › núcleo › colaborador, com total, participação, média e variação em cada nível |
| Evolução | Série por mês, trimestre, semestre ou ano; acumulado no ano; 12 meses móveis; variação sobre o ano anterior; marcos de gestão |
| Variações | Decompõe a diferença entre dois meses em entradas, saídas e rubricas de quem permaneceu |
| Colaboradores | Lista pesquisável e ficha individual, com histórico, alterações cadastrais e lançamentos do mês |
| Movimentação | Admissões, desligamentos por tipo, rotatividade e mudanças de lotação, cargo e salário-base |
| Cargos e salários | Distribuição do salário-base e tabela por cargo |
| Perfil e diversidade | Composição e remuneração por grupo, só em números agregados |
| Rubricas | Ranking, evolução e quem recebe cada rubrica |
| Alertas | Regras explícitas de integridade e de variação, com limites ajustáveis |
| Base e conferência | Arquivos carregados, conciliação por competência, qualidade dos arquivos e dicionário de rubricas |

## Como publicar

### 1. GitHub Pages

1. Crie um repositório no GitHub e envie para a raiz dele todo o conteúdo desta pasta, inclusive os arquivos `.nojekyll` e `.gitignore`.
2. No repositório, abra **Settings › Pages**. Em **Build and deployment**, escolha **Deploy from a branch**, o ramo `main` e a pasta `/ (root)`.
3. Em alguns minutos o painel estará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

No plano gratuito do GitHub, o Pages exige repositório público. Isso torna público o código do painel, não a folha: nenhuma planilha faz parte do repositório, e o `.gitignore` impede o envio acidental de arquivos `.xlsx` e `.csv`.

### 2. Domínio próprio

1. Em **Settings › Pages › Custom domain**, informe o endereço desejado, por exemplo `folha.seudominio.com.br`. O GitHub cria o arquivo `CNAME` no repositório.
2. No provedor do domínio, crie um registro DNS do tipo `CNAME` apontando `folha` para `SEU-USUARIO.github.io`.
3. Quando o certificado estiver emitido, marque **Enforce HTTPS**.

### 3. Login pelo Firebase

1. No console do Firebase, abra o projeto e vá a **Authentication › Sign-in method**. Ative **E-mail/senha**.
2. Em **Authentication › Users**, crie a conta de cada pessoa autorizada.
3. Em **Authentication › Settings › User actions**, desmarque **Enable create (sign-up)**, se a opção estiver disponível no seu projeto. Sem isso, qualquer pessoa que conheça a chave pública do projeto consegue criar uma conta pela API do Firebase.
4. Em **Authentication › Settings › Authorized domains**, acrescente o domínio do painel.
5. Em **Configurações do projeto › Seus aplicativos**, registre um aplicativo Web e copie o objeto de configuração.
6. Cole a configuração em `js/config.js`, no campo `firebase`, e envie o arquivo ao repositório.

Enquanto `firebase` estiver `null`, o painel abre sem login e mostra o aviso "Sem login configurado".

A sessão dura enquanto a aba do navegador estiver aberta. Ao sair, a base carregada é descartada.

## O que o login protege, e o que não protege

O login é verificado no navegador, e o código do painel é público. Ele impede o acesso casual à tela, mas não é a barreira que protege a folha. A proteção efetiva vem de dois fatos:

- **A folha não sai do computador.** Os arquivos são lidos e calculados no navegador. A página declara uma política de segurança de conteúdo que só permite conexão com o serviço de login do Firebase, de modo que o próprio navegador bloqueia qualquer outro envio.
- **Nada fica gravado.** Ao fechar ou recarregar a página, a base é descartada. Ficam guardados no navegador apenas os ajustes do dicionário de rubricas, os limites dos alertas e os marcos de gestão, que não contêm dados de pessoas.

Disso decorre que o controle de acesso real é a posse dos arquivos mensais. Quem os recebe vê tudo. Se for necessário que cada gestor veja apenas a própria unidade, o painel precisa passar a ter servidor e base própria.

## Como usar

1. Abra o painel e entre com a sua conta.
2. Clique em **Atualizar base** ou arraste os arquivos para a página. Podem ser vários de uma vez.
3. Cada arquivo pode trazer um mês ou vários. Com uma base já aberta, o painel pergunta se os arquivos novos **substituem** a base (descarta tudo e usa só os novos) ou se **somam** a ela. No segundo caso, um mês e tipo de folha que já existam são trocados pelos do arquivo novo, e o painel avisa o que foi substituído.
4. Depois da carga, a tela vai para o mês mais recente do que acabou de ser carregado. O resumo no alto da página mostra de quantos arquivos e de que meses a base é composta; clicar nele abre a tela Base e conferência.
5. Confira a tela **Base e conferência** antes de usar os números: a coluna "Diferença" da conciliação deve estar zerada.

Comparações dependem dos meses carregados: o acumulado no ano precisa dos meses desde janeiro, os 12 meses móveis precisam de 12 competências e a comparação com o ano anterior precisa do mesmo período nos dois anos.

## Leiaute do arquivo

Arquivos `.xlsx` ou `.csv`, com uma linha por rubrica de cada colaborador em cada competência, e as colunas do modelo da folha. A lista completa está na tela **Base e conferência**, em "Leiaute esperado".

- Obrigatórias: `MAT`, `COD RUBRICA`, `TIPO CÁLCULO`, `VALOR` e `COMPETENCIA`.
- `IDADE`, `FAIXA ETÁRIA`, `GERAÇÃO`, `TEMPO DE CASA - ANOS` e `FAIXA DE TEMPO DE CASA` são ignoradas. O painel recalcula idade e tempo de casa na data de cada competência, e define a geração pelo ano de nascimento.
- Um mesmo mês e tipo de folha deve vir inteiro em um único arquivo.
- Arquivos `.xls` antigos não são lidos. Salve como `.xlsx`.

## Como as medidas são calculadas

Cada rubrica recebe uma classe no dicionário, e cada medida soma determinadas classes.

| Medida | Composição |
|---|---|
| Custo total | Proventos + encargos patronais + benefícios pagos pela empresa. Não inclui provisões |
| Remuneração bruta | Proventos |
| Líquido | Proventos − descontos |
| Encargos patronais | Rubricas classificadas como encargo patronal |
| Benefícios pagos pela empresa | Rubricas classificadas como benefício pago pela empresa |
| Provisões do período | Provisões de férias e 13º constituídas no mês |

A classe sugerida vem do tipo de cálculo do arquivo (proventos, descontos, transferência) e, para as rubricas marcadas como "Base", da descrição. Essas sugestões precisam ser validadas pela área de pessoal na tela **Base e conferência**. Rubricas de base de cálculo e saldos acumulados de provisão ficam como informativas e não entram em nenhuma medida.

## Configuração

Tudo o que se ajusta está em `js/config.js`: título, configuração do Firebase, exibição da tela de diversidade (`moduloDiversidade`), tamanho mínimo de grupo nessa tela (`grupoMinimo`) e marcos de gestão iniciais.

## Estrutura dos arquivos

```
index.html          página única
css/app.css         estilos
js/config.js        configuração (único arquivo a editar)
js/leitor.js        leitura de .xlsx e .csv
js/dados.js         carga, classificação das rubricas, medidas e consultas
js/ui.js            tabelas, gráficos, indicadores e exportação
js/telas1.js        visão geral, estrutura, evolução, variações
js/telas2.js        colaboradores, movimentação, cargos, rubricas
js/telas3.js        diversidade, alertas, base e conferência
js/auth.js          login
js/app.js           menu, filtros e navegação
vendor/             bibliotecas de terceiros, sem dependência de rede externa
fonts/              fonte Roboto
```

Não há etapa de compilação. Para testar no computador, basta abrir `index.html` no navegador; o login pelo Firebase só funciona quando a página é servida por `http` ou `https`.
