import bcrypt from "bcryptjs";

export function hashPassword(plain) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(String(plain), salt);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(String(plain), String(hash));
}
