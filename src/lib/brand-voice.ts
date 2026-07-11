import { supabaseAdmin } from "./supabase-admin";

// Compila o DNA de Marca (Método Vinci) armazenado em business_config
// num bloco de prompt injetado em TODA geração de conteúdo.
// É o artefato que faltava: o sistema sabia clonar a voz dos concorrentes
// mas não tinha a voz do Wallace codificada.
export async function getBrandVoice(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("business_config")
    .select("section, data")
    .in("section", [
      "dna_posicionamento", "dna_promessa", "dna_duas_palavras",
      "dna_atributos", "dna_narrativa", "dna_verbal", "voz_wallace",
      "produto", "avatar", "posicionamento", "metas",
    ]);

  const dna: Record<string, any> = {};
  for (const row of data || []) dna[row.section] = row.data;

  const pos = dna.dna_posicionamento || {};
  const verbal = dna.dna_verbal || {};
  const narrativa = dna.dna_narrativa || {};

  return `## VOZ E POSICIONAMENTO DO @owallaceleite (obrigatório — todo conteúdo sai NESTA voz)

POSICIONAMENTO: ${pos.solucao_diferenciada || "Estrategista digital, marketing e infoprodutos"}
PÚBLICO: ${pos.publico || "empreendedores digitais"}
PROBLEMA CENTRAL QUE RESOLVE: ${pos.core_problem || ""}
PROMESSA: ${dna.dna_promessa?.promessa || ""}
MARCA DE DUAS PALAVRAS: ${dna.dna_duas_palavras?.marca || ""} (${dna.dna_duas_palavras?.paradoxo || ""})

NARRATIVA (posição de MENTOR, nunca herói — o herói é o seguidor):
- Dor vivida: ${narrativa.dor || ""}
- Descoberta: ${narrativa.descoberta || ""}
- Vilão narrativo: ${narrativa.vilao || ""}

TOM: ${verbal.tom || "direto, de igual pra igual"}. Ritmo: ${verbal.ritmo || "frases curtas"}.
SEMPRE: ${(verbal.faz || []).join("; ")}
NUNCA: ${(verbal.nao_faz || []).join("; ")}
LINHA EDITORIAL: ${verbal.linha_editorial || ""}

${dna.voz_wallace ? `## VOZ REAL EXTRAÍDA DOS POSTS DELE (fonte primária — imite ISTO)
Léxico que ele usa: ${(dna.voz_wallace.lexico || []).join(", ")}
Construções dele: ${(dna.voz_wallace.construcoes_frase || []).map((c: string) => `\n- ${c}`).join("")}
Cadência: ${dna.voz_wallace.cadencia || ""}
Soaria FALSO na boca dele: ${(dna.voz_wallace.evitar || []).map((c: string) => `\n- ${c}`).join("")}` : ""}

${dna.produto ? `PRODUTO/OFERTA ATUAL: ${JSON.stringify(dna.produto)}` : ""}
${dna.metas ? `METAS: ${JSON.stringify(dna.metas)}` : ""}`;
}
