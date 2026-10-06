const fs = require('node:fs');
const path = require('node:path');
const ts = require('../apps/web/node_modules/typescript');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'apps/web/src');
const styleDir = path.join(src, 'styles');
const defined = new Set();
const intentionallyUnstyled = new Set([
  '-', '_', 'CANCELLED', 'all',
  'finance-ledger-card', 'finance-mix-panel', 'finance-operation-card', 'finance-revenue-panel',
  'group', 'navigation', 'notifications-list', 'route-edit-form', 'unread',
]);
for (const name of fs.readdirSync(styleDir).filter((name) => name.endsWith('.css'))) {
  const css = fs.readFileSync(path.join(styleDir, name), 'utf8');
  for (const match of css.matchAll(/(?<!\\)\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g)) defined.add(match[1]);
}

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory() ? files(path.join(dir, item.name)) : item.name.endsWith('.tsx') ? [path.join(dir, item.name)] : []);
}
const missing = new Map();
for (const file of [...files(src), ...files(path.join(root, 'apps/web/app'))]) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      let parent = node.parent;
      let inClass = false;
      while (parent && parent !== ast) {
        if (ts.isJsxAttribute(parent) && parent.name.text === 'className') { inClass = true; break; }
        if (ts.isVariableDeclaration(parent) && /Class$/.test(parent.name.getText(ast))) { inClass = true; break; }
        parent = parent.parent;
      }
      if (inClass) {
        for (const token of node.text.split(/\s+/).filter(Boolean)) {
          if (!/^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(token) || defined.has(token) || intentionallyUnstyled.has(token)) continue;
          const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
          if (!missing.has(token)) missing.set(token, []);
          missing.get(token).push(`${path.relative(root, file)}:${line}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
for (const [name, places] of [...missing].sort()) console.log(`${name}: ${places.slice(0, 3).join(', ')}`);
console.log(`Missing named classes: ${missing.size}`);
process.exitCode = missing.size ? 1 : 0;
