const fs = require('node:fs');
const path = require('node:path');

function enableSignup(contents) {
  const setting = /^\s*(?:export\s+)?ALLOW_PUBLIC_REGISTRATION\s*=.*$/gm;
  return setting.test(contents)
    ? contents.replace(setting, 'ALLOW_PUBLIC_REGISTRATION=true')
    : `${contents}${contents && !contents.endsWith('\n') ? '\n' : ''}ALLOW_PUBLIC_REGISTRATION=true\n`;
}

if (require.main === module) {
  const filename = path.resolve(__dirname, '../.env');
  const current = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
  fs.writeFileSync(filename, enableSignup(current), { encoding: 'utf8', mode: 0o600 });
  console.log('Customer signup enabled in backend/.env. Restart the backend to apply.');
}

module.exports = { enableSignup };
