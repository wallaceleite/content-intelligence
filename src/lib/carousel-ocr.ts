import { anthropic, MODELS } from "./anthropic";

// Extract text from carousel images using Claude Vision
export async function extractCarouselText(
  imageUrls: string[]
): Promise<string> {
  if (!imageUrls?.length) return "";

  // Carrosséis vão até 10 slides — os templates CQV usam 7-10 cards,
  // então cortar em 5 perdia a aterrissagem de produto e o CTA.
  const urls = imageUrls.slice(0, 10);

  const content: any[] = [
    {
      type: "text",
      text: "Extraia TODO o texto visível de cada slide deste carrossel do Instagram, NA ORDEM. Formato: 'SLIDE 1: <texto>' e assim por diante, separados por '---'. Apenas o texto puro, sem explicações.",
    },
  ];

  for (const url of urls) {
    content.push({
      type: "image",
      source: { type: "url", url },
    });
  }

  try {
    const response = await anthropic.messages.create({
      model: MODELS.classify,
      max_tokens: 4000,
      messages: [{ role: "user", content }],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("Carousel OCR error:", err);
    return "";
  }
}
