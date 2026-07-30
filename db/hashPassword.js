
const bcrypt = require('bcryptjs');

const plain = process.argv[2];
if (!plain) {
  console.log('Usage: node db/hashPassword.js <password>');
  process.exit(1);
}

bcrypt.hash(plain, 10).then((hash) => {
  console.log(hash);
});
