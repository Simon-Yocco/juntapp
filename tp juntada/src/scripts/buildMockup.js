/**
 * Arma el mockup: un solo HTML que funciona sin servidor ni base de datos.
 *
 * Toma el front real (public/index.html, css/styles.css y js/app.js) y reemplaza
 * js/api.js por mockup/mock-api.js, que resuelve todo en memoria.
 * Resultado: mockup/JUNTAPP_mockup.html (se abre con doble clic; necesita internet
 * solo para Tailwind, la fuente y los íconos).
 *
 * Uso: npm run mockup   (volver a correrlo cada vez que cambie el front)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const NOTICE = `
  <!-- Aviso del mockup (lo agrega src/scripts/buildMockup.js) -->
  <div class="bg-amber-100 text-amber-900 text-[11px] text-center px-3 py-1.5 border-b border-amber-200">
    <strong>Mockup sin persistencia:</strong> los datos se reinician al recargar.
    Entrá con <strong>simon</strong> y la contraseña <strong>juntapp123</strong>
    (también lucas, mateo, pedro, salvador o robertino).
  </div>
`;

// Inserta código dentro de <script>/<style> sin que un "</script>" del texto corte la etiqueta
const safeInline = (code) => code.replace(/<\/(script|style)/gi, "<\\/$1");

function replaceOnce(html, search, replacement) {
  if (!html.includes(search)) throw new Error(`No se encontró en index.html: ${search}`);
  return html.replace(search, () => replacement);
}

let html = read("public/index.html");
html = replaceOnce(html, '<link rel="stylesheet" href="css/styles.css">', `<style>\n${safeInline(read("public/css/styles.css"))}\n</style>`);
html = replaceOnce(html, '<script src="js/api.js"></script>', `<script>\n${safeInline(read("mockup/mock-api.js"))}\n</script>`);
html = replaceOnce(html, '<script src="js/app.js"></script>', `<script>\n${safeInline(read("public/js/app.js"))}\n</script>`);
html = html.replace(/<body([^>]*)>/, (tag) => tag + NOTICE);
html = replaceOnce(html, "<title>JUNTAPP</title>", "<title>JUNTAPP (mockup)</title>");

const output = path.join(root, "mockup/JUNTAPP_mockup.html");
fs.writeFileSync(output, html);
console.log(`✅ Mockup generado: ${path.relative(root, output)} (${Math.round(html.length / 1024)} KB)`);
