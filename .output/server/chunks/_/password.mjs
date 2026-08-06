import { verify, hash } from 'argon2';

function hashPassword(password) {
  return hash(password);
}
function verifyPassword(passwordHash, password) {
  return verify(passwordHash, password);
}

export { hashPassword as h, verifyPassword as v };
//# sourceMappingURL=password.mjs.map
