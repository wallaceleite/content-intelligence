export interface CarouselTemplate {
  id: string;
  name: string;
  category: string;
  categoryIcon: string;
  funnelStage: "tofu" | "mofu" | "bofu";
  funnelFunction: string;
  cardCount: number;
  structure: string;
  exampleUrl?: string;
}

export const CAROUSEL_CATEGORIES = [
  { id: "analise", name: "Carrosséis de Análise", icon: "🧠", funnelStage: "tofu" as const, function: "Atração — crescimento de público" },
  { id: "comparacao", name: "Carrosséis de Comparação", icon: "👁️‍🗨️", funnelStage: "tofu" as const, function: "Atração — contraste e clareza" },
  { id: "antes-depois", name: "Carrosséis de Antes & Depois", icon: "🪞", funnelStage: "tofu" as const, function: "Atração — transformação visível" },
  { id: "conexao", name: "Carrosséis de Conexão", icon: "💕", funnelStage: "mofu" as const, function: "Conexão — identificação e retenção" },
  { id: "inspiracional", name: "Carrosséis Inspiracionais", icon: "🫀", funnelStage: "mofu" as const, function: "Conexão — vínculo emocional" },
  { id: "autoridade", name: "Carrosséis de Autoridade", icon: "⚓", funnelStage: "bofu" as const, function: "Posicionamento — construção de confiança" },
  { id: "narrativa", name: "Carrosséis com Narrativa", icon: "📜", funnelStage: "bofu" as const, function: "Posicionamento — storytelling estratégico" },
];

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  // === ANÁLISE (TOFU) ===
  {
    id: "analise-contradicao",
    name: "Contradição",
    category: "analise",
    categoryIcon: "🧠",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 10,
    structure: `CARD 1 — HEADLINE: A geração que [DISCURSO FORTE] mas [RESULTADO CONTRADITÓRIO].
CARD 2 — CONTEXTO SOCIAL: Nos últimos anos, [COMPORTAMENTO COLETIVO OBSERVÁVEL] virou quase um consenso.
CARD 3 — CONTEXTO SOCIAL: Todo mundo diz que quer [DESEJO], mas vive como se [COMPORTAMENTO OPOSTO] fosse normal.
CARD 4 — DADO / FATO: Segundo [FONTE / ESTUDO], [DADO OBJETIVO]. Mas o mais importante não é o número.
CARD 5 — INTERPRETAÇÃO: Isso não é sobre [EXPLICAÇÃO SUPERFICIAL]. É sobre [MEDO / STATUS / IDENTIDADE / CONTROLE].
CARD 6 — CONEXÃO COM O MERCADO: É por isso que tanta gente [AÇÃO COMUM] e ainda assim sente [FRUSTRAÇÃO].
CARD 7 — POSICIONAMENTO: O erro não é querer [OBJETIVO]. É tentar chegar lá sustentando [BASE ERRADA].
CARD 8 — ERRO COMUM: Quando todo mundo repete o mesmo discurso, pouca gente para pra analisar se ele faz sentido.
CARD 9 — NOVA LEITURA: Talvez o problema não seja [O QUE SE ACUSA], mas [O QUE ESTÁ SENDO IGNORADO].
CARD 10 — CTA: Quem percebe isso começa a agir diferente. Comenta [PALAVRA] se essa análise te fez pensar.`,
    exampleUrl: "https://www.instagram.com/p/DSKvc0CDexw/",
  },
  {
    id: "analise-problema-nao-e-x",
    name: "O Problema Não É X",
    category: "analise",
    categoryIcon: "🧠",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 10,
    structure: `CARD 1 — HEADLINE: O problema não é [VILÃO POPULAR]. É [CAUSA REAL].
CARD 2 — CONTEXTO SOCIAL: Repare como [VILÃO POPULAR] virou a explicação padrão pra quase tudo que não funciona.
CARD 3 — CONTEXTO SOCIAL: É mais fácil culpar [VILÃO] do que encarar [RESPONSABILIDADE / COMPLEXIDADE].
CARD 4 — DADO / FATO: De acordo com [FONTE / OBSERVAÇÃO], [FATO QUE ENFRAQUECE O VILÃO].
CARD 5 — INTERPRETAÇÃO: Isso revela que o problema não é externo. É estrutural.
CARD 6 — CONEXÃO COM O MERCADO: Enquanto as pessoas brigam com [VILÃO], continuam ignorando [BASE NECESSÁRIA].
CARD 7 — POSICIONAMENTO: Quem cresce não é quem reclama melhor. É quem entende onde realmente ajustar.
CARD 8 — ERRO COMUM: Confundir causa com sintoma é o jeito mais rápido de ficar estagnado.
CARD 9 — NOVA LEITURA: Talvez o desconforto exista porque [MOTIVO REAL].
CARD 10 — CTA: Entender isso muda decisões. Comenta [PALAVRA] se isso fez sentido pra você.`,
    exampleUrl: "https://www.instagram.com/p/DSFqjzaDeAP/",
  },
  {
    id: "analise-ninguem-fala",
    name: "Ninguém Está Falando Sobre Isso",
    category: "analise",
    categoryIcon: "🧠",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 10,
    structure: `CARD 1 — HEADLINE: Ninguém está falando sobre [PONTO CEGO]. E isso muda tudo.
CARD 2 — CONTEXTO SOCIAL: O debate costuma girar em torno de [ASSUNTO ÓBVIO].
CARD 3 — CONTEXTO SOCIAL: Mas quase ninguém olha para [CAMADA INVISÍVEL].
CARD 4 — DADO / FATO: Quando [FATO / COMPORTAMENTO] acontece, o impacto real aparece em [CONSEQUÊNCIA].
CARD 5 — INTERPRETAÇÃO: Isso mostra que o jogo não é sobre [SUPERFÍCIE]. É sobre [ESTRUTURA / SIMBOLISMO / IDENTIDADE].
CARD 6 — CONEXÃO COM O MERCADO: Quem ignora isso sente que está sempre correndo atrás.
CARD 7 — POSICIONAMENTO: Quem entende isso começa a [O QUE ACONTECE].
CARD 8 — ERRO COMUM: A maioria reage ao que aparece. Poucos analisam o que sustenta.
CARD 9 — NOVA LEITURA: [NOVO PONTO DE VISTA].
CARD 10 — CTA: Esse tipo de percepção muda escolhas. Comenta [PALAVRA] se você também sente isso.`,
  },
  {
    id: "analise-comportamento-comum",
    name: "Comportamento Comum",
    category: "analise",
    categoryIcon: "🧠",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 10,
    structure: `CARD 1 — HEADLINE: Por que estamos [COMPORTAMENTO COMUM]?
CARD 2 — CONTEXTO SOCIAL: Repare como [COMPORTAMENTO] deixou de ser exceção e virou quase regra.
CARD 3 — CONTEXTO SOCIAL: Não porque as pessoas querem, mas porque [PRESSÃO / EXPECTATIVA / CONTEXTO] empurra pra isso.
CARD 4 — DADO / FATO: Segundo [FONTE], [DADO OU FATO QUE EXPLICA O PADRÃO].
CARD 5 — INTERPRETAÇÃO: Isso não é falta de [QUALIDADE PESSOAL]. É excesso de [ESTÍMULO / COBRANÇA / COMPARAÇÃO].
CARD 6 — CONEXÃO COM O MERCADO: Nesse cenário, muita gente [AÇÃO AUTOMÁTICA] achando que isso vai resolver.
CARD 7 — POSICIONAMENTO: Mas reagir não é o mesmo que escolher.
CARD 8 — ERRO COMUM: Quando tudo é sobre [ERRO], ninguém mais enxerga [A VERDADE].
CARD 9 — NOVA LEITURA: Talvez o antídoto não seja [O QUE ACHAM QUE É], mas [FAZER DIFERENTE / FAZER COM CRITÉRIO].
CARD 10 — CTA: Entender o contexto muda comportamento. Comenta [PALAVRA] se isso fez sentido pra você.`,
    exampleUrl: "https://www.instagram.com/p/DSh6u5sjRsH/",
  },
  {
    id: "analise-comportamento-antigo",
    name: "Comportamento Antigo",
    category: "analise",
    categoryIcon: "🧠",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 10,
    structure: `CARD 1 — HEADLINE: Ninguém mais acha [COMPORTAMENTO / SÍMBOLO ANTIGO DE STATUS].
CARD 2 — CONTEXTO SOCIAL: Por muito tempo, [COMPORTAMENTO] foi lido como sucesso. [SINAIS VISÍVEIS DO COMPORTAMENTO].
CARD 3 — DADO / FATO: Mas os dados mostram que essa narrativa começou a ruir. Segundo [FONTE], [DADO 1] e [DADO 2].
CARD 4 — DADO + INTERPRETAÇÃO: Um estudo da [FONTE] mostrou: pessoas que vivem [COMPORTAMENTO] são percebidas como [PERCEPÇÃO NEGATIVA]. O mercado não lê mais [SÍMBOLO ANTIGO] como sucesso.
CARD 5 — VIRADA CULTURAL: A [OBSERVAÇÃO DE MERCADO] mostra que hoje são admiradas não as pessoas que [FAZEM MAIS], mas as que [DECIDEM MELHOR].
CARD 6 — INTERPRETAÇÃO PROFUNDA: [COMPORTAMENTO] deixou de ser status. Hoje ele comunica: [LEITURA NEGATIVA 1], [LEITURA NEGATIVA 2], [LEITURA NEGATIVA 3].
CARD 7 — NOVO SÍMBOLO: O novo símbolo de poder é: [NOVO VALOR 1], [NOVO VALOR 2], [NOVO VALOR 3].
CARD 8 — IMPACTO REAL: Quem vive [COMPORTAMENTO] o tempo todo raramente está [OBJETIVO MAIOR].
CARD 9 — DESDOBRAMENTO: [COMPORTAMENTO] pode impressionar quem está começando, mas afasta [CONSEQUÊNCIA 1], [CONSEQUÊNCIA 2].
CARD 10 — CTA: [VALOR ANTIGO] sem [VALOR NOVO] não leva longe. Comenta [PALAVRA] se fez sentido pra você.`,
    exampleUrl: "https://www.instagram.com/p/DSxYIYejQXm/",
  },

  // === COMPARAÇÃO (TOFU) ===
  {
    id: "comparacao-quer-vs-faz",
    name: "O Que Ela Quer vs O Que Ela Faz",
    category: "comparacao",
    categoryIcon: "👁️‍🗨️",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 9,
    structure: `CARD 1 — CAPA: O resultado que ela quer [LISTA DE DESEJOS / IMAGENS DO RESULTADO]
CARD 2 — CONTRASTE: O que ela faz: [COMPORTAMENTOS DE FUGA]. O que deveria fazer: [COMPORTAMENTOS ESTRATÉGICOS].
CARD 3 — CULPA: Quem ela culpa: [ALVOS EXTERNOS]. O que realmente é o problema: [COMPORTAMENTOS INTERNOS / PADRÕES].
CARD 4 — MEDO: Do que ela tem medo: [MEDOS SOCIAIS]. Do que ela deveria ter medo: [CONSEQUÊNCIAS REAIS].
CARD 5 — ENERGIA: Onde ela coloca energia: [DETALHES ESTÉTICOS / ATALHOS]. Onde deveria focar: [BASE / MÉTODO].
CARD 6 — COMPORTAMENTO VISÍVEL: O que ela posta: [CONTEÚDO GENÉRICO]. O que deveria postar: [CONTEÚDO ESTRATÉGICO].
CARD 7 — REALIDADE: Como ela acha que é: [FANTASIA]. Como realmente é: [RESPONSABILIDADE / PROCESSO].
CARD 8 — FECHAMENTO: Diagnóstico do dia: qual desses define você agora?
CARD 9 — CTA: Comenta [PALAVRA] se esse carrossel te deu um choque de realidade.`,
    exampleUrl: "https://www.instagram.com/p/DRnXsQXAZW1/",
  },
  {
    id: "comparacao-contam-vs-eu-conto",
    name: "O Que Contam vs O Que Eu Te Conto",
    category: "comparacao",
    categoryIcon: "👁️‍🗨️",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 9,
    structure: `CARD 1 — CAPA: Coisas que toda [profissão/nicho] te conta (menos eu)
CARD 2 — CONTEXTO: Todo mundo fala de [PROMESSA BONITA]. Mas existe um lado que quase ninguém admite.
CARD 3: O que te contam: [CONSELHO SIMPLISTA]. O que eu te conto: [VERDADE ESTRATÉGICA + CRITÉRIO].
CARD 4: O que te contam: [ROMANTIZAÇÃO]. O que eu te conto: [REALIDADE PRÁTICA].
CARD 5: O que te contam: [MERITOCRACIA RASA]. O que eu te conto: [DIFERENCIAL REAL].
CARD 6: O que te contam: [ESFORÇO CEGO]. O que eu te conto: [MÉTODO / DIREÇÃO].
CARD 7: O que te contam: [CORAGEM SEM ESTRUTURA]. O que eu te conto: [CLAREZA + ESTRATÉGIA].
CARD 8 — FECHAMENTO: Eu sei que dói ouvir isso. Mas crescer exige verdade, não ilusão.
CARD 9 — CTA: Comenta [PALAVRA] se você já caiu em algum desses discursos.`,
    exampleUrl: "https://www.instagram.com/p/DRhYFdrjbpc/",
  },
  {
    id: "comparacao-isso-nao-e-vs-e",
    name: "Isso Não É vs Isso É",
    category: "comparacao",
    categoryIcon: "👁️‍🗨️",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 9,
    structure: `CARD 1 — CAPA: Isso NÃO é [CONCEITO]
CARD 2: Exemplo de NÃO é [COMPORTAMENTO SUPERFICIAL]
CARD 3: Isso É [CONCEITO] [DEFINIÇÃO ESTRATÉGICA]
CARD 4: Isso NÃO é [CONCEITO] [ESTÉTICA / APARÊNCIA]
CARD 5: Isso É [CONCEITO] [INTENCIONALIDADE + ESSÊNCIA]
CARD 6: Isso NÃO é [CONCEITO] [REAGIR A MODA / TREND]
CARD 7: Isso É [CONCEITO] [CRITÉRIO + COERÊNCIA + IMPACTO]
CARD 8 — FECHAMENTO: Cuidar de [CONCEITO] é essencial. Mas ele é só o começo.
CARD 9 — CTA: Comenta [PALAVRA] se isso organizou sua cabeça.`,
    exampleUrl: "https://www.instagram.com/p/DQSbUg6gb77/",
  },
  {
    id: "comparacao-nao-e-dificil",
    name: "Não É Difícil, Difícil É",
    category: "comparacao",
    categoryIcon: "👁️‍🗨️",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 7,
    structure: `CARD 1: [AÇÃO QUE ELA DIZ QUE É DIFÍCIL] não é difícil. Difícil é [CONSEQUÊNCIA REAL DE NÃO FAZER].
CARD 2: [AÇÃO EVITADA] não é difícil. Difícil é [REALIDADE DESCONFORTÁVEL 1].
CARD 3: [OUTRA AÇÃO EVITADA] não é difícil. Difícil é [REALIDADE DESCONFORTÁVEL 2].
CARD 4: [MAIS UMA AÇÃO EVITADA] não é difícil. Difícil é [CENÁRIO QUE ELA QUER EVITAR NO FUTURO].
CARD 5: No fim, o desconforto existe de qualquer forma. A diferença é qual desconforto você escolhe sustentar agora.
CARD 6 — FRASE ÂNCORA: Enquanto você foge de [AÇÃO NECESSÁRIA], o preço de não agir continua crescendo.
CARD 7 — CTA: Qual difícil você escolhe hoje? Comenta [PALAVRA] se esse carrossel te pegou.`,
    exampleUrl: "https://www.instagram.com/p/DPSIbVfDdOg/",
  },
  {
    id: "comparacao-ilusao-vs-realidade",
    name: "Ilusão vs Realidade",
    category: "comparacao",
    categoryIcon: "👁️‍🗨️",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 7,
    structure: `CARD 1 — CAPA: Como as pessoas acham que é [SITUAÇÃO] x Como realmente é
CARD 2 — ILUSÃO: [DESCRIÇÃO DO CENÁRIO FANTASIADO] (liberdade sem estrutura, leveza sem responsabilidade)
CARD 3 — REALIDADE: [PROCESSO, DECISÕES DIFÍCEIS, RESPONSABILIDADES]
CARD 4 — ILUSÃO: [ATALHOS, FACILIDADE, RESULTADO RÁPIDO]
CARD 5 — REALIDADE: [ROTINA, REPETIÇÃO, MÉTODO, CONSISTÊNCIA]
CARD 6 — FRASE ÂNCORA: [ATALHO / FANTASIA] não sustenta [RESULTADO]. [PROCESSO REAL] sustenta.
CARD 7 — CTA: Comenta [PALAVRA] se você cansou da fantasia.`,
  },

  // === ANTES & DEPOIS (TOFU) ===
  {
    id: "antes-depois-faca-isso",
    name: "Faça Isso em Vez Disso",
    category: "antes-depois",
    categoryIcon: "🪞",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 7,
    structure: `CARD 1 — CAPA: FAÇA ISSO em vez de FAZER ISSO (se você quer [RESULTADO])
CARD 2: EM VEZ DE: [AÇÃO comum que parece certa]. FAÇA: [AÇÃO estratégica com intenção].
CARD 3: EM VEZ DE: [COMPORTAMENTO que te deixa genérico]. FAÇA: [COMPORTAMENTO que aumenta percepção de valor].
CARD 4: EM VEZ DE: [AÇÃO reativa / sem critério]. FAÇA: [AÇÃO com critério / padrão / método].
CARD 5: EM VEZ DE: [DICA SOLTA]. FAÇA: [DIREÇÃO + CONTEXTO + AÇÃO].
CARD 6: Esse é o tipo de coisa que acontece com quem [COMPORTAMENTO / DECISÃO / PADRÃO].
CARD 7 — CTA: Salva pra revisar antes de [AÇÃO]. Comenta [PALAVRA] se você faz o "em vez de" sem perceber.`,
    exampleUrl: "https://www.instagram.com/p/DMfqE-Nxbtx/",
  },
  {
    id: "antes-depois-jamais-fale",
    name: "Jamais Fale/Faça Isso",
    category: "antes-depois",
    categoryIcon: "🪞",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 7,
    structure: `CARD 1 — CAPA: JAMAIS FALE / FAÇA ISSO
CARD 2: JAMAIS FALE: "[FRASE que pede permissão]". FAÇA ASSIM: "[FRASE que assume direção]".
CARD 3: JAMAIS FALE: "[FRASE que diminui sua entrega]". FAÇA ASSIM: "[FRASE que sustenta valor]".
CARD 4: JAMAIS FALE: "[FRASE que abre brecha pra objeção]". FAÇA ASSIM: "[FRASE que filtra e posiciona]".
CARD 5: JAMAIS FALE: "[FRASE genérica do mercado]". FAÇA ASSIM: "[FRASE com critério/método]".
CARD 6: Pare de [AÇÃO / ERRO QUE NÃO FUNCIONA]. Comece a [AÇÃO ESTRATÉGICA QUE GERA RESULTADO].
CARD 7 — CTA: Comenta [PALAVRA] se você já falou alguma dessas.`,
    exampleUrl: "https://www.instagram.com/p/DSIPVaBDZPs/",
  },
  {
    id: "antes-depois-troque",
    name: "Troque Isso por Isso",
    category: "antes-depois",
    categoryIcon: "🪞",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 7,
    structure: `CARD 1 — CAPA: TROQUE ISSO POR ISSO
CARD 2: TROQUE: "[FRASE / AÇÃO que te deixa comum]". POR: "[FRASE / AÇÃO que te posiciona com clareza]".
CARD 3: TROQUE: "[FORMA de falar que parece pedido de permissão]". POR: "[FORMA que assume direção / critério]".
CARD 4: TROQUE: "[JEITO genérico de explicar o que faz]". POR: "[JEITO específico orientado para transformação]".
CARD 5: TROQUE: "[HÁBITO de conteúdo que informa mas não conduz]". POR: "[HÁBITO que conduz percepção e decisão]".
CARD 6: A forma como você [AÇÃO DE COMUNICAÇÃO] ensina as pessoas a [COMO TE PERCEBEM].
CARD 7 — CTA: Salve esse post pra revisar antes de [ação]. Comenta [PALAVRA] se você quer a parte 2!`,
    exampleUrl: "https://www.instagram.com/p/DRxtCmQAWdB/",
  },
  {
    id: "antes-depois-eu-era",
    name: "Eu Era a Pessoa Que...",
    category: "antes-depois",
    categoryIcon: "🪞",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 7,
    structure: `CARD 1 — CAPA: Eu era a pessoa que [PADRÃO ANTIGO / CRENÇA] pra hoje ser a pessoa que [NOVO PADRÃO / CRITÉRIO]
CARD 2: Eu era a pessoa que [COMPORTAMENTO ANTIGO], porque acreditava que [CRENÇA DO MERCADO / AUTOENGANO].
CARD 3: Na prática, isso me deixava [CONSEQUÊNCIA 1] e [CONSEQUÊNCIA 2], e entrava no ciclo de [CICLO / LOOP].
CARD 4: Mas eu entendi que não era sobre [COISA SUPERFICIAL], era sobre [PRINCÍPIO REAL].
CARD 5: Hoje eu sou a pessoa que [NOVO PADRÃO] e: [CRITÉRIO 1], [CRITÉRIO 2], [CRITÉRIO 3].
CARD 6: Não é sobre [ESFORÇO / TENTATIVA ALEATÓRIA]. É sobre [MÉTODO / CRITÉRIO].
CARD 7 — CTA: Comenta [PALAVRA] se você está na fase do "eu era a pessoa que..."`,
    exampleUrl: "https://www.instagram.com/p/DRhv0YOjSEN/",
  },
  {
    id: "antes-depois-bom-vs-ruim",
    name: "Bom vs Ruim",
    category: "antes-depois",
    categoryIcon: "🪞",
    funnelStage: "tofu",
    funnelFunction: "Atração",
    cardCount: 7,
    structure: `CARD 1 — CAPA: [X] BOA vs [X] RUIM
CARD 2: Uma [X] ruim é quando você [ERRO 1] e espera que gere [RESULTADO]. BOA: Uma [X] boa é quando você [ACERTO 1], porque cria [EFEITO desejado].
CARD 3: Exemplo ruim x Exemplo bom
CARD 4: Exemplo ruim x Exemplo bom
CARD 5: Exemplo ruim x Exemplo bom
CARD 6: [PRÁTICA ERRADA] não é o segredo do [RESULTADO]. [PRÁTICA CERTA] é.
CARD 7 — CTA: Salva pra revisar antes de criar sua próxima [X]. Comenta [PALAVRA] se você quer a versão sobre [TEMA].`,
    exampleUrl: "https://www.instagram.com/p/DRmme8Vjfh6/",
  },

  // === CONEXÃO (MOFU) ===
  {
    id: "conexao-voce-nunca",
    name: "Você Nunca",
    category: "conexao",
    categoryIcon: "💕",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 10,
    structure: `CARD 1 — HEADLINE: Você nunca vai [SENTIR / VIVER / CONQUISTAR X] se nunca [AÇÃO QUE ESTÁ SENDO EVITADA].
CARD 2 — CONSEQUÊNCIA 1: Se você não [AÇÃO], você continua [ESTADO ATUAL].
CARD 3 — CONSEQUÊNCIA 2: Continua [COMPORTAMENTO REPETIDO], achando que um dia vai ser diferente.
CARD 4 — CONSEQUÊNCIA 3: Mas o tempo passa e [CONSEQUÊNCIA].
CARD 5: Mas também...
CARD 6: Nunca vai [CONQUISTA 1] e nem [CONQUISTA 2].
CARD 7: E você nunca vai [MAIOR DESEJO DA AUDIÊNCIA]. Sabe qual é a verdade?
CARD 8 — FECHAMENTO: Você não precisa se sentir pronta. Precisa só [AÇÃO POSSÍVEL AGORA].
CARD 9: O que você quer não está do outro lado da perfeição. Está do outro lado da [AÇÃO].
CARD 10 — CTA: Comenta [PALAVRA/EMOJI] se você está pronta.`,
    exampleUrl: "https://www.instagram.com/p/DNikR2stac1/",
  },
  {
    id: "conexao-meme",
    name: "Meme de Conexão",
    category: "conexao",
    categoryIcon: "💕",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 8,
    structure: `CARD 1 — FRASE DE IDENTIFICAÇÃO: [Frase curta que poderia estar na cabeça da sua audiência] (leve, verdadeira, cotidiana)
CARD 2 — OBSERVAÇÃO REAL: [Comentário simples sobre algo que todo mundo vive, mas ninguém fala]
CARD 3 — VERDADE IRÔNICA: [Frase com leve ironia ou humor inteligente sobre a rotina / trabalho / vida]
CARD 4 — CONTRASTE: [Comparação implícita entre o que é romantizado e o que é vivido de verdade]
CARD 5 — FRASE DE ALÍVIO: [Algo que normalize sentimentos comuns: cansaço, ambição, contradição]
CARD 6 — IDENTIDADE: [Frase que reforça pertencimento: "somos nós", "quem vive isso entende"]
CARD 7 — FECHAMENTO EMOCIONAL: [Mensagem curta que une leveza + força + realidade]
CARD 8 — CTA: Comenta [PALAVRA] se isso pareceu escrito pra você. Compartilha com alguém que [IDENTIFICAÇÃO].`,
    exampleUrl: "https://www.instagram.com/p/DRanXCyjRrq/",
  },
  {
    id: "conexao-conselhos",
    name: "Conselhos",
    category: "conexao",
    categoryIcon: "💕",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 4,
    structure: `CARD 1 — CONSELHO 1: Durante [FASE DA VIDA / JORNADA], alguém vai te aconselhar [CONSELHO PADRÃO / FRASE COMUM]. É muito importante que você [RESPOSTA HONESTA / POSICIONAMENTO REAL].
CARD 2 — CONSELHO 2: Durante [OUTRA SITUAÇÃO COMUM], alguém vai te dizer que [SUGESTÃO LIMITANTE]. É muito importante que você [DECISÃO ALINHADA COM SEUS OBJETIVOS].
CARD 3 — CONSELHO 3: Durante [MOMENTO ATUAL / CONTEXTO REAL], algo vai te lembrar que [OPORTUNIDADE / CHAMADO / DECISÃO]. É muito importante que você [DECISÃO].
(Repita quantos cards quiser, adaptando os conselhos)`,
    exampleUrl: "https://www.instagram.com/p/DRdDnJ8AUXo/",
  },
  {
    id: "conexao-manifesto",
    name: "Manifesto",
    category: "conexao",
    categoryIcon: "💕",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 8,
    structure: `CARD 1 — ABERTURA: Essa é pra [QUEM É ESSE MOVIMENTO] que [REALIDADE CENTRAL QUE DEFINE O GRUPO].
CARD 2 — ORIGEM: Somos [DESCRIÇÃO DA AUDIÊNCIA]. E ainda assim, [VERBO DE AÇÃO / ESCOLHA].
CARD 3 — CAMINHO: Somos [QUEM APRENDEU NO PROCESSO], no [CONTEXTO DIFÍCIL] transformando [LIMITAÇÃO] em [FORÇA].
CARD 4 — CORAGEM: Somos [QUEM ERRA / RECOMEÇA / CONTINUA]. As que [FAZEM MESMO COM MEDO], porque [VERDADE PROFUNDA].
CARD 5 — CONFLITO REAL: Somos [QUEM EQUILIBRA MUITAS COISAS]. Que cuida de [RESPONSABILIDADES], sem abrir mão de [DESEJO / SONHO / VISÃO].
CARD 6 — HUMANIDADE: Somos as que [CANSAM / SENTEM / CAEM], respiram fundo e voltam pra [AÇÃO DO CAMINHO].
CARD 7 — SIGNIFICADO: Porque [TEMA CENTRAL] não é só [AÇÃO SUPERFICIAL]. É [VALOR 1]. É [VALOR 2]. É escolher [IDENTIDADE PRESENTE E FUTURA].
CARD 8 — CTA: Se você [FAZ PARTE DESSE MOVIMENTO], comenta [PALAVRA / FRASE].`,
    exampleUrl: "https://www.instagram.com/p/DRPXwF0Daoc/",
  },
  {
    id: "conexao-contraintuitivo",
    name: "Contraintuitivo",
    category: "conexao",
    categoryIcon: "💕",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 8,
    structure: `CARD 1 — CRENÇA LIMITANTE: [PESSOAS COM X CARACTERÍSTICA] não fazem sucesso em [RESULTADO DESEJADO].
CARD 2 — QUEBRA DA CRENÇA: Será mesmo? [Imagem ou cena que contradiz diretamente essa crença]
CARD 3 — IDENTIFICAÇÃO REAL: De todas as coisas que eu precisei enfrentar em [CONTEXTO], [CARACTERÍSTICA] foi uma das mais difíceis. [DESCRIÇÃO HONESTA DO COMPORTAMENTO / MEDO].
CARD 4 — VIRADA INTERNA: Mas eu sempre soube que o preço de [CONSEQUÊNCIA DE NÃO AGIR] seria muito maior do que [DESCONFORTO DE ENFRENTAR].
CARD 5 — REENQUADRAMENTO: A boa notícia é que dá pra [RESULTADO DESEJADO] sem precisar se forçar a ser quem você não é. Você não precisa virar [ESTEREÓTIPO] pra crescer.
CARD 6 — CAMINHOS POSSÍVEIS: Aqui vão alguns conselhos/dicas que funcionam pra quem é [CARACTERÍSTICA]: [DICA 1], [DICA 2], [DICA 3].
CARD 7: Sabe qual é o único caminho que não funciona? Deixar que [CARACTERÍSTICA] vire desculpa e te afaste do que você quer construir.
CARD 8 — CTA: Se você também é do time das [PESSOAS COM ESSA CARACTERÍSTICA], deixa um [EMOJI / PALAVRA] aqui.`,
    exampleUrl: "https://www.instagram.com/p/DLU-gdbsxIA/",
  },

  // === INSPIRACIONAL (MOFU) ===
  {
    id: "inspiracional-enquanto-voce",
    name: "Enquanto Você",
    category: "inspiracional",
    categoryIcon: "🫀",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 8,
    structure: `CARD 1: Enquanto você achar que [CRENÇA LIMITANTE PRINCIPAL], você nunca vai [RESULTADO DESEJADO].
CARD 2 — COMPORTAMENTO 1: Enquanto você continuar [COMPORTAMENTO INCONSISTENTE], você nunca vai [RESULTADO].
CARD 3 — COMPORTAMENTO 2: Enquanto você tentar [AGRADAR / EVITAR CONFLITO / SE ESCONDER], você nunca vai [RESULTADO].
CARD 4 — MEDO CENTRAL: Enquanto você não encarar [MEDO REAL DA AUDIÊNCIA], você nunca vai [RESULTADO].
CARD 5: Enquanto você depender de [FATOR INSTÁVEL] e não construir [ESTRUTURA OU PROCESSO], você nunca vai [RESULTADO].
CARD 6: Enquanto você focar só em [AÇÃO DE CURTO PRAZO] e ignorar [CONSTRUÇÃO DE LONGO PRAZO], você nunca vai [RESULTADO].
CARD 7: Enquanto você achar que [IDEIA ROMANTIZADA], você nunca vai [RESULTADO].
CARD 8 — CTA: Chega de [VERBO QUE DIMINUI A JORNADA]. Pra selar esse compromisso, completa aqui nos comentários: [FRASE-BASE COM ESPAÇO EM BRANCO].`,
    exampleUrl: "https://www.instagram.com/p/DRcMGp6DUPk/",
  },
  {
    id: "inspiracional-verdades-dificeis",
    name: "Verdades Difíceis",
    category: "inspiracional",
    categoryIcon: "🫀",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 7,
    structure: `CARD 1: [X] VERDADES DIFÍCEIS DE ENGOLIR, MAS NECESSÁRIAS SOBRE SEU [MERCADO/NICHO/COMPORTAMENTO]
CARD 2 — PRIMEIRA VERDADE: Você não precisa de mais [ALGO QUE A AUDIÊNCIA ACHA QUE FALTA]. Você precisa de [O QUE REALMENTE FALTA].
CARD 3 — COMPARAÇÃO: Enquanto você espera [CONDIÇÃO IDEAL / ESTAR PRONTA], alguém menos [QUALIDADE] já está [OCUPANDO ESPAÇO / AVANÇANDO].
CARD 4 — CONTRADIÇÃO INTERNA: Você diz que quer [DESEJO GRANDE], mas ainda vive presa em [MEDO / OPINIÃO / PADRÃO EXTERNO].
CARD 5: Falta de [RECURSO MAIS CITADO], na maioria das vezes, é na verdade falta de [DECISÃO / PRIORIDADE / LIMITE].
CARD 6: Se você continuar se cercando das mesmas [PESSOAS / IDEIAS / ROTINAS], vai continuar tendo os mesmos [RESULTADOS / PROBLEMAS / LIMITES].
CARD 7 — CTA: Qual dessas verdades você mais precisava ouvir hoje? Comenta [NÚMERO / PALAVRA / EMOJI].`,
    exampleUrl: "https://www.instagram.com/p/DO36-QQjVQw/",
  },
  {
    id: "inspiracional-a-realidade",
    name: "A Realidade",
    category: "inspiracional",
    categoryIcon: "🫀",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 9,
    structure: `CARD 1: [COISA SIMPLES E HUMANA] não deveria ser um privilégio.
CARD 2: [OUTRA EXPERIÊNCIA BÁSICA DE VIDA] não deveria ser algo raro.
CARD 3: Ter [TEMPO / PRESENÇA / TRANQUILIDADE] sem precisar pensar em [PRESSÃO CONSTANTE] não deveria ser anormal.
CARD 4: Viver em [COMPORTAMENTO DE ESGOTAMENTO] não pode ser rotina.
CARD 5: Não é normal [CONSEQUÊNCIA EMOCIONAL / MENTAL] pra no final sentir que [FRUSTRAÇÃO CENTRAL].
CARD 6: O problema não é você. É o jeito como [MEIO / SISTEMA / ROTINA] te ensinou a viver.
CARD 7: E se existisse outro caminho? Um caminho em que [MEIO / FERRAMENTA / TRABALHO] trabalha pra você, e não o contrário.
CARD 8: Você não quer [DESEJO SUPERFICIAL]. Você quer [DESEJO PROFUNDO: tempo, paz, construção, autonomia].
CARD 9 — CTA: Se isso ecoou aí dentro, comenta [PALAVRA-ÂNCORA]. (ou: salva pra lembrar que isso não é exagero, é o mínimo.)`,
    exampleUrl: "https://www.instagram.com/p/DN_ldlqAaN2/",
  },
  {
    id: "inspiracional-o-processo",
    name: "O Processo",
    category: "inspiracional",
    categoryIcon: "🫀",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 8,
    structure: `CARD 1: O processo nunca vai ser [LINEAR / PERFEITO / PREVISÍVEL].
CARD 2 — DIA BOM: Tem dias em que você está [ESTADO POSITIVO 1], [ESTADO POSITIVO 2], com vontade de [OBJETIVO GRANDE].
CARD 3 — DIA DIFÍCIL: E tem dias em que você acorda [ESTADO DIFÍCIL 1], [ESTADO DIFÍCIL 2], questionando [O CAMINHO / VOCÊ MESMA].
CARD 4: Mas é exatamente nesses dias que você não pode desistir. O importante é fazer, nem que seja [POUCO / O MÍNIMO / UM PASSO].
CARD 5: No dia seguinte, algo muda. Você acorda com [ORGULHO / ALÍVIO / FORÇA], porque mesmo sem estar bem, você fez o que combinou com você mesma.
CARD 6: E o processo segue assim: com [ALTOS], [BAIXOS], [TRAVAS] e [RETOMADAS]. E tá tudo bem.
CARD 7: O que importa não é estar 100% todos os dias. É fazer [UM POUCO / O POSSÍVEL] todos os dias.
CARD 8 — CTA: Se isso te lembrou que você está indo bem mesmo nos dias difíceis, comenta [SÍMBOLO ou PALAVRA] e marca alguém que precisa desse lembrete.`,
    exampleUrl: "https://www.instagram.com/p/DKrhwG0RBDd/",
  },
  {
    id: "inspiracional-o-medo",
    name: "O Medo",
    category: "inspiracional",
    categoryIcon: "🫀",
    funnelStage: "mofu",
    funnelFunction: "Conexão",
    cardCount: 8,
    structure: `CARD 1: Você não tem medo de [FALHAR / NÃO DAR CONTA / ERRAR].
CARD 2: Você tem medo de continuar [SUSTENTANDO TUDO SOZINHA / CARREGANDO MAIS UMA COISA].
CARD 3: Você cresceu ouvindo "[FRASE 1]", "[FRASE 2]", "[FRASE 3]". E deu conta. Por [TEMPO / ANOS].
CARD 4: Por isso, quando surge algo novo, seu corpo reage antes da lógica: "isso é demais pra mim." Não porque você não consegue. Mas porque você já vem carregando demais.
CARD 5: Você não acorda [SENSAÇÃO QUE ELA ACHA QUE TEM]. Você acorda [SENSAÇÃO QUE ELA REALMENTE TEM]. De [FUNÇÃO 1]. De [FUNÇÃO 2]. De [EXPECTATIVAS INVISÍVEIS].
CARD 6: O problema não é [PROBLEMA QUE ELA ACHA QUE TEM]. Quando não existe [ESTRUTURA / ORDEM / DIREÇÃO], até o simples parece demais.
CARD 7: Você não está [SENTIMENTO - fracassando/falhando...]. Você está [VERDADE - Sobrecarregada/angustiada...].
CARD 8 — CTA: E isso se resolve com [SEU MÉTODO]. Comenta [PALAVRA/EMOJI] e eu te envio o próximo passo.`,
    exampleUrl: "https://www.instagram.com/p/DRj0PxpDZ4Y/",
  },

  // === AUTORIDADE (BOFU) ===
  {
    id: "autoridade-recorte-resultado",
    name: "Recorte de Resultado",
    category: "autoridade",
    categoryIcon: "⚓",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 7,
    structure: `CARD 1 — CAPA: Esses foram os [O QUE VOCÊ FAZ/VENDE] que mais me deram resultado em [PERÍODO] (e que você deveria aplicar em [PRÓXIMO PERÍODO])
CARD 2: Eu poderia te dizer que foi sorte, timing ou tendência. Mas o que realmente aconteceu foi: eu parei de [ERRO COMUM] e comecei a repetir [DECISÃO EDITORIAL].
CARD 3: Enquanto muita gente gastava energia em [FOCO DO MERCADO], eu foquei em [FOCO ESTRATÉGICO], porque isso constrói [PERCEPÇÃO/RESULTADO].
CARD 4: O efeito foi: [RESULTADO 1], [RESULTADO 2], [RESULTADO 3].
CARD 5: Não é sobre copiar o meu [método/conteúdo]. É sobre copiar o meu critério: o que eu escolho repetir, eu fortaleço.
CARD 6: Resultado vem de critério, não de volume.
CARD 7 — CTA: Comenta [PALAVRA] que eu te digo qual desses [serviço/produtos] você deveria priorizar primeiro.`,
    exampleUrl: "https://www.instagram.com/p/DNx_PqRWrqJ/",
  },
  {
    id: "autoridade-projecao-estrategica",
    name: "Projeção Estratégica",
    category: "autoridade",
    categoryIcon: "⚓",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 7,
    structure: `CARD 1 — CAPA: O que eu faria se quisesse [RESULTADO] (saindo do zero)
CARD 2: A primeira coisa seria parar de [ERRO 1], porque isso só cria [CONSEQUÊNCIA], e começar a focar em [BASE 1].
CARD 3: Em vez de tentar crescer com tudo ao mesmo tempo, eu construiria [ATIVO/PROCESSO] que me dá [PREVISIBILIDADE].
CARD 4: Depois eu escolheria um caminho simples e repetível: [PASSO 1] → [PASSO 2] → [PASSO 3].
CARD 5: E só então faria sentido pensar em [AÇÃO MAIS AVANÇADA]. Porque quando você tenta começar pelo final, você paga caro em frustração.
CARD 6: Se você inverte a ordem, o esforço aumenta e o resultado não vem.
CARD 7 — CTA: Comenta [PALAVRA] se você quer que eu adapte esse plano para o seu cenário.`,
    exampleUrl: "https://www.instagram.com/p/DRLHtuqDSaO/",
  },
  {
    id: "autoridade-narrativa-conquistas",
    name: "Narrativa de Conquistas",
    category: "autoridade",
    categoryIcon: "⚓",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 8,
    structure: `CARD 1 — CAPA: Eu ganhava [R$X] por mês quando comecei. Hoje eu faturo [R$Y] por mês.
CARD 2: E não, não foi porque eu "descobri um truque". Foi porque eu parei de [ERRO QUE COMETIA] e comecei a [DECISÃO PRINCIPAL].
CARD 3: Naquela época eu fazia: [AÇÃO 1 DESORGANIZADA], [AÇÃO 2 SEM MÉTODO], [AÇÃO 3 COM FOCO ERRADO].
CARD 4: Mas tudo mudou quando eu entendi que [RESULTADO] vem de: [BASE 1], [BASE 2], [BASE 3].
CARD 5: Porque não adianta [FAZER O ERRADO] e não [FAZER O CERTO].
CARD 6: Hoje eu faço diferente: eu tenho [PROCESSO / ROTINA / ESTRUTURA]. E é isso que torna o resultado previsível.
CARD 7: Esse é o tipo de coisa que acontece com quem para de depender de [SORTE / INSPIRAÇÃO] e constrói [ESTRUTURA].
CARD 8 — CTA: Comenta [PALAVRA] se você quer [RESULTADO ESPERADO].`,
    exampleUrl: "https://www.instagram.com/p/DRhv0YOjSEN/",
  },
  {
    id: "autoridade-identidade-construida",
    name: "Identidade Construída",
    category: "autoridade",
    categoryIcon: "⚓",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 7,
    structure: `CARD 1 — CAPA: Pra essa [VERSÃO ATUAL] existir...
CARD 2: Essa precisou existir [versão antiga].
CARD 3: Foi preciso escolher [DECISÃO 1] mesmo quando ninguém estava aplaudindo.
CARD 4: Foi preciso abrir mão de [CONFORTO / ATALHO] e sustentar [DECISÃO DIFÍCIL].
CARD 5: O que as pessoas veem é [RESULTADO VISÍVEL]. O que quase ninguém vê é [PROCESSO / ROTINA].
CARD 6: Toda versão forte é construída no invisível, antes de ser reconhecida no visível.
CARD 7 — CTA: Comenta [PALAVRA] se você está nesse processo de construção.`,
    exampleUrl: "https://www.instagram.com/p/DPeF19MDUQT/",
  },
  {
    id: "autoridade-diagnostico-mercado",
    name: "Diagnóstico de Mercado",
    category: "autoridade",
    categoryIcon: "⚓",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 7,
    structure: `CARD 1 — CAPA: Todo mundo fala que você precisa [COISA] mas ninguém te ensina como fazer isso de verdade
CARD 2: O problema não é falta de [o que sua audiência acha que falta]. É falta de [O QUE ELA PRECISA].
CARD 3: Quando você [explique o que ela precisa construir ou ter]
CARD 4: Você para de depender de [SORTE/TENDÊNCIA/INSPIRAÇÃO] e começa a construir [RESULTADO].
CARD 5: Entender isso é o começo. O resto é decisão.
CARD 6: [ATALHO] não é o segredo do [RESULTADO]. [FUNDAMENTO] é.
CARD 7 — CTA: Comenta [PALAVRA] se você quer que eu aprofunde o "como".`,
    exampleUrl: "https://www.instagram.com/p/DO__8gaAeMb/",
  },
  {
    id: "autoridade-experimento",
    name: "Experimento",
    category: "autoridade",
    categoryIcon: "⚓",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 7,
    structure: `CARD 1 — CAPA: Decidi fazer um teste rápido com [AÇÃO] e simplesmente esse foi o resultado
CARD 2: Eu testei [O QUE FOI TESTADO] por um motivo simples: eu queria entender se [HIPÓTESE] era verdade.
CARD 3: O resultado foi [RESULTADO]. E não porque eu "acordei inspirado", mas porque isso ativa [MOTIVO ESTRATÉGICO].
CARD 4: O que eu aprendi com esse teste foi: [INSIGHT 1], [INSIGHT 2].
CARD 5: Se você não testa, você fica preso em achismo. E achismo é caro demais pra quem quer crescer.
CARD 6: Esse é o tipo de coisa que acontece com quem testa [AÇÃO] com critério.
CARD 7 — CTA: Comenta [PALAVRA] que eu te digo um teste simples pra fazer essa semana.`,
    exampleUrl: "https://www.instagram.com/p/DPg0vKAjdhm/",
  },

  // === NARRATIVA (BOFU) ===
  {
    id: "narrativa-processo-invisivel",
    name: "Processo Invisível",
    category: "narrativa",
    categoryIcon: "📜",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 8,
    structure: `CARD 1 — CAPA: Essa é a sua primeira vez [CONTEXTO].
CARD 2: E toda primeira vez é assim: você [AÇÃO INSEGURA] e [ERRO COMUM].
CARD 3: É normal errar onde ninguém ensinou. É normal fazer do jeito errado antes de descobrir o certo. É normal aprender enquanto já precisa [RESPONSABILIDADE / DECISÃO].
CARD 4: A verdade é que [VERDADE DENTRO DO CONTEXTO].
CARD 5: Nada começa [PROCESSO DO COMEÇO].
CARD 6: O que constrói resultado é um ciclo [DESCREVA O CICLO].
CARD 7: Esse é o tipo de coisa que acontece com quem continua mesmo sem segurança total.
CARD 8 — CTA: Comenta [PALAVRA] se você está na sua primeira vez [AÇÃO].`,
    exampleUrl: "https://www.instagram.com/p/DRSzD63ASj1/",
  },
  {
    id: "narrativa-frase-que-marcou",
    name: "Frase Que Marcou",
    category: "narrativa",
    categoryIcon: "📜",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 10,
    structure: `CARD 1 — CAPA: "[FRASE QUE VOCÊ OUVIU]"
CARD 2: Essa frase foi dita quando eu [SITUAÇÃO].
CARD 3: E o problema não era [O QUE PARECIA SER]. Era [VERDADE SOBRE O PROBLEMA].
CARD 4: Ela virou uma dúvida silenciosa: [dúvida real da sua audiência].
CARD 5: Muita gente para aqui tentando provar algo rápido.
CARD 6: Ou muda o caminho pra [EXPECTATIVA DO OUTRO].
CARD 7: Mas quando eu entendi que [O QUE ENTENDEU].
CARD 8: Isso não era sobre mim, era sobre [SIGNIFICADO REAL DA FRASE].
CARD 9: Pare de [ERRO] e comece a [ATITUDE CERTA].
CARD 10 — CTA: Comenta [PALAVRA] se você já carregou uma frase que não era sua.`,
    exampleUrl: "https://www.instagram.com/p/DQprdeijcqi/",
  },
  {
    id: "narrativa-com-promessa",
    name: "Narrativa com Promessa",
    category: "narrativa",
    categoryIcon: "📜",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 10,
    structure: `CARD 1 — CAPA: Essa é a história que vai te fazer [RESULTADO DESEJADO].
CARD 2: Tudo começou quando eu [SITUAÇÃO INICIAL] e achei que o problema era [DIAGNÓSTICO ERRADO].
CARD 3: Eu fazia [AÇÃO 1], [AÇÃO 2] e [AÇÃO 3] acreditando que isso, com o tempo, resolveria.
CARD 4: Mas o tempo passava e [RESULTADO NÃO ACONTECIA].
CARD 5: O que eu não entendia era que [O QUE ESTAVA SENDO IGNORADO].
CARD 6: Quando eu entendi que antes de [OBJETIVO FINAL], eu precisava [BASE / DECISÃO / MUDANÇA].
CARD 7: Quando isso mudou, [EFEITO PRÁTICO / CONSEQUÊNCIA REAL] começou a acontecer.
CARD 8: Não porque ficou fácil, mas porque ficou [CLARO / COERENTE / DIRECIONADO].
CARD 9: Esse é o tipo de coisa que acontece quando você para de [ERRO COMUM] e começa a [AÇÃO CONSCIENTE].
CARD 10 — CTA: Comenta [PALAVRA] se essa história se conecta com o momento que você está vivendo.`,
    exampleUrl: "https://www.instagram.com/p/DQaKQ7kgVND/",
  },
  {
    id: "narrativa-personagem",
    name: "Personagem",
    category: "narrativa",
    categoryIcon: "📜",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 10,
    structure: `CARD 1 — CAPA: Eu precisei [VESTIR UM PERSONAGEM / AJUSTAR MINHA IMAGEM / MUDAR MINHA POSTURA] pra ser levado a sério.
CARD 2: Antes de qualquer coisa, me responde com sinceridade: que percepção você tem ao olhar pra essa versão minha? (imagem da versão "antes")
CARD 3: Por muito tempo, eu fui visto como [RÓTULO: o novato, o discreto, o amador]. E confesso que, no começo, eu achava que isso não importava.
CARD 4: Com o tempo, eu percebi algo incômodo: independente do [RESULTADO / ESFORÇO / ENTREGA], as pessoas continuavam não me levando a sério.
CARD 5: Foi aí que eu precisei mudar. Não quem eu era, mas como eu me [mostrava/pensava/falava/agia].
CARD 6: Então se você não fizer/entender [LIÇÃO], [O QUE CONTINUA ACONTECENDO].
CARD 7: [FRASE COMPLEMENTANDO A LIÇÃO].
CARD 8: E não, isso não é sobre [PERCEPÇÃO COMUM]. É sobre usar [OPINIÕES / CONHECIMENTO / EXPERIÊNCIA / RESULTADOS] a favor dos seus objetivos.
CARD 9: O que não funciona é [ERRO COMETIDO].
CARD 10 — CTA: Me conta: o que você já precisou ajustar pra [objetivo]?`,
    exampleUrl: "https://www.instagram.com/p/DM8DQQiRxdi/",
  },
  {
    id: "narrativa-quebra-expectativa",
    name: "Quebra de Expectativa",
    category: "narrativa",
    categoryIcon: "📜",
    funnelStage: "bofu",
    funnelFunction: "Posicionamento",
    cardCount: 8,
    structure: `CARD 1 — CAPA: Quanto custou a coisa mais cara que eu já [COMPREI / CONQUISTEI / CONSTRUÍ] na vida?
CARD 2: Não, não estou falando de [ITENS COM PREÇO/CARRO, BOLSAS...].
CARD 3: A coisa mais cara que eu comprei foi [CONQUISTA IMENSURÁVEL].
CARD 4: [descreva sua conquista].
CARD 5: E como eu comprei isso? [liste o que fez/passo a passo].
CARD 6: A verdade é que [VERDADE QUE SUA AUDIÊNCIA PRECISA ENTENDER].
CARD 7: Esse é o tipo de coisa que você só entende depois que escolhe [CRESCER / EVOLUIR]. Nem tudo que vale a pena tem preço. Mas tudo que vale a pena tem custo.
CARD 8 — CTA: Me conta: qual foi a coisa mais cara que você já comprou na sua vida?`,
    exampleUrl: "https://www.instagram.com/p/DLdWygyyD15/",
  },
];

export const WEEKLY_CALENDARS = {
  "3x": {
    label: "3x por semana",
    description: "Ideal para quem está retomando constância ou tem pouco tempo",
    days: [
      { day: "Segunda", format: "Atração", categories: ["analise", "comparacao", "antes-depois"], function: "Ganhar novos seguidores qualificados" },
      { day: "Quarta", format: "Conexão", categories: ["conexao", "inspiracional"], function: "Fazer quem chegou ficar" },
      { day: "Sexta", format: "Autoridade", categories: ["autoridade", "narrativa"], function: "Construir confiança e preparar para venda" },
    ],
  },
  "4x": {
    label: "4x por semana",
    description: "Ideal para quem já tem ritmo e quer acelerar resultado",
    days: [
      { day: "Segunda", format: "Atração", categories: ["analise", "comparacao", "antes-depois"], function: "Alcance e entrada de público novo" },
      { day: "Terça", format: "Conexão", categories: ["conexao", "inspiracional"], function: "Identificação e retenção" },
      { day: "Quinta", format: "Autoridade", categories: ["autoridade", "narrativa"], function: "Mostrar critério, visão e maturidade" },
      { day: "Domingo", format: "Atração/Reforço", categories: ["analise", "comparacao", "antes-depois"], function: "Reforçar mensagem central e crescer" },
    ],
  },
  "5x": {
    label: "5x por semana",
    description: "Ideal para quem quer acelerar crescimento e já consegue sustentar execução",
    days: [
      { day: "Segunda", format: "Atração", categories: ["analise", "comparacao", "antes-depois"], function: "Crescimento de público" },
      { day: "Terça", format: "Conexão", categories: ["conexao", "inspiracional"], function: "Vínculo e identificação" },
      { day: "Quarta", format: "Autoridade", categories: ["autoridade", "narrativa"], function: "Construção de confiança" },
      { day: "Quinta", format: "Atração", categories: ["analise", "comparacao", "antes-depois"], function: "Teste de variação + alcance" },
      { day: "Domingo", format: "Conexão/Narrativa", categories: ["conexao", "inspiracional", "narrativa"], function: "Fechar a semana com vínculo" },
    ],
  },
};
