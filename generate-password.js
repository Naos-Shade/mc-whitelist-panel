#!/usr/bin/env node
const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node generate-password.js <mot_de_passe>');
  console.log('');
  console.log('Exemple: node generate-password.js MonMotDePasse123');
  console.log('');
  console.log('Copiez ensuite le hash généré dans votre fichier .env');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('');
  console.log('Hash généré pour votre mot de passe:');
  console.log('');
  console.log(hash);
  console.log('');
  console.log('Copiez cette ligne dans votre fichier .env:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('');
});
