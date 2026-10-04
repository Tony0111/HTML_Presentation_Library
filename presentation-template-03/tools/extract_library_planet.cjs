/* Extract only the selected Library model; no computer model or second Three.js runtime. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const library = path.resolve(root, '../references/rebuilds/portfolio-v2-3d/app.bundle.js');
const source = fs.readFileSync(library, 'utf8');
const match = source.match(/PLANET_GLTF = ("[^"\n]+")/);
if (!match) throw new Error('Library PLANET_GLTF was not found');
const uri = JSON.parse(match[1]);
const model = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
if (model.asset.extras.title !== 'Stylized planet') throw new Error('Unexpected Library model');
const out = path.join(root, 'assets/models');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'stylized-planet.js'),
  '/* Stylized planet by cmzw, CC BY 4.0. See LICENSES/planet-license.txt. */\n' +
  'window.LIBRARY_PLANET_GLTF = ' + JSON.stringify(model) + ';\n');
console.log('Extracted original Library planet and embedded textures');
