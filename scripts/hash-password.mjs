const password = process.argv[2];

if (!password || password.length < 12) {
  console.error("Usage: npm run auth:hash-password -- \"a-long-password\"");
  process.exit(1);
}

const bcrypt = await import("bcryptjs").catch(() => {
  console.error("bcryptjs is not installed. Run `npm install` in the project root, then retry this command.");
  process.exit(1);
});

const hash = await bcrypt.hash(password, 12);
console.log(hash);
console.log(`STAFF_PASSWORD_HASH_B64=${Buffer.from(hash, "utf8").toString("base64")}`);
