const password = process.argv[2];
const hashInput = process.argv[3] || process.env.STAFF_PASSWORD_HASH_B64 || process.env.STAFF_PASSWORD_HASH;

if (!password || !hashInput) {
  console.error("Usage: npm run auth:verify-password -- \"your-password\" \"hash-or-STAFF_PASSWORD_HASH_B64-value\"");
  process.exit(1);
}

const bcrypt = await import("bcryptjs").catch(() => {
  console.error("bcryptjs is not installed. Run `npm install` in the project root, then retry this command.");
  process.exit(1);
});

function stripEnvAssignment(value) {
  return value.replace(/^STAFF_PASSWORD_HASH_B64=/, "").replace(/^STAFF_PASSWORD_HASH=/, "").trim();
}

function normalizeHash(value) {
  const stripped = stripEnvAssignment(value);
  if (stripped.startsWith("$2")) {
    return stripped;
  }
  return Buffer.from(stripped, "base64").toString("utf8");
}

const hash = normalizeHash(hashInput);
if (!hash.startsWith("$2")) {
  console.error("The supplied hash does not look like a bcrypt hash after decoding.");
  process.exit(1);
}

const ok = await bcrypt.compare(password, hash);
console.log(ok ? "Password matches hash." : "Password does not match hash.");
process.exit(ok ? 0 : 1);
