const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../_locales');
const baseLocale = 'en';
const baseFile = path.join(localesDir, baseLocale, 'messages.json');

if (!fs.existsSync(baseFile)) {
  console.error(`Fichier de référence introuvable : ${baseFile}`);
  process.exit(1);
}

const baseMessages = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
const baseKeys = Object.keys(baseMessages);

const localeDirs = fs.readdirSync(localesDir).filter(dir => dir !== baseLocale);

console.log(`🔍 Vérification des traductions par rapport à '${baseLocale}' :`);

localeDirs.forEach(locale => {
  const filePath = path.join(localesDir, locale, 'messages.json');

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Fichier manquant pour la langue : ${locale}`);
    return;
  }

  const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const keys = Object.keys(messages);

  const missing = baseKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !baseKeys.includes(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${locale} : OK`);
  } else {
    console.log(`❌ ${locale} :`);
    if (missing.length > 0) console.log(`  ❗ Clés manquantes : ${missing.join(', ')}`);
    if (extra.length > 0) console.log(`  ⚠️ Clés en trop : ${extra.join(', ')}`);
  }
});
