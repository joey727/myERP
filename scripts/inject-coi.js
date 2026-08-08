const fs = require('fs');

const indexPath = process.argv[2];
const html = fs.readFileSync(indexPath, 'utf8');

const version = Date.now().toString(36);
const cOI = `<script src="coi-serviceworker.js?v=${version}"></script>`;
if (html.includes('coi-serviceworker.js')) {
  console.log('coi-serviceworker script tag already present');
  process.exit(0);
}

const replaced = html.replace('<head>', `<head>\n        ${cOI}`);
fs.writeFileSync(indexPath, replaced);
console.log('Injected coi-serviceworker script tag (v=' + version + ')');
