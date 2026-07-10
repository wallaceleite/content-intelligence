// Renderizador único de markdown das análises.
// Escapa HTML ANTES das transformações — a saída do modelo é conteúdo
// não confiável e ia direto pra dangerouslySetInnerHTML (risco de XSS).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function markdownToHtml(md: string): string {
  return escapeHtml(md)
    .replace(/^####\s(.*$)/gm, "<h4>$1</h4>")
    .replace(/^###\s(.*$)/gm, "<h3>$1</h3>")
    .replace(/^##\s(.*$)/gm, "<h2>$1</h2>")
    .replace(/^#\s(.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^-\s(.*$)/gm, "<li>$1</li>")
    .replace(/^\d+\.\s(.*$)/gm, "<li>$1</li>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return "";
      const tag = match.includes("---") ? "th" : "td";
      return "<tr>" + cells.map((c) => `<${tag}>${c}</${tag}>`).join("") + "</tr>";
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, "<table>$&</table>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}
