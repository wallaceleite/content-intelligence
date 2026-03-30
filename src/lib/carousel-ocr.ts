import { anthropic } from "./anthropic";

// Extract text from carousel images using Claude Vision
export async function extractCarouselText(
  imageUrls: string[]
): Promise<string> {
  if (!imageUrls?.length) return "";

  // Take up to 5 images (carousel max is usually 10, but 5 is enough)
  const urls = imageUrls.slice(0, 5);

  const content: any[] = [
    {
      type: "text",
      text: "Extraia TODO o texto visível de cada slide deste carrossel do Instagram. Retorne apenas o texto puro de cada slide separado por '---'. Sem explicações.",
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content }],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("Carousel OCR error:", err);
    return "";
  }
}
