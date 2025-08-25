import fs from "fs";
import admin from "firebase-admin";

const creds = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

const APPROVED_LIMIT = 200;
const STANDINGS_LIMIT = 100;

function asLevel(x) {
  return {
    name: x.name || "",
    nameLower: x.nameLower || "",
    code: x.code || "",
    functions: Array.isArray(x.functions) ? x.functions.map(f => ({
      latex: (f?.latex ?? "").toString(),
      minX: Number(f?.minX ?? 0),
      maxX: Number(f?.maxX ?? 0)
    })) : [],
    difficulty: Number(x.difficulty ?? 1),
    authorId: x.authorId || "",
    createdAtTicks: x.createdAt ? x.createdAt.toDate().getTime() * 10000 + 621355968000000000 : 0
  };
}

async function getApproved() {
  const snap = await db.collection("submissions").orderBy("createdAt", "desc").limit(APPROVED_LIMIT * 2).get();
  const list = [];
  snap.forEach(d => {
    const x = d.data();
    if (x && x.status === true) list.push(asLevel(x));
  });
  return list.slice(0, APPROVED_LIMIT);
}

async function getStandings() {
  const snap = await db.collection("standings").orderBy("score", "desc").limit(STANDINGS_LIMIT).get();
  const rows = [];
  snap.forEach(d => {
    const x = d.data();
    rows.push({
      name: x?.name || "",
      score: Number(x?.score ?? 0),
      uid: d.id,
      nameLower: (x?.nameLower || "").toString()
    });
  });
  rows.sort((A,B) => (B.score - A.score) || A.nameLower.localeCompare(B.nameLower));
  rows.forEach(r => delete r.nameLower);
  return rows.slice(0, STANDINGS_LIMIT);
}

const payload = {
  updatedAt: new Date().toISOString(),
  approved: await getApproved(),
  standings: await getStandings()
};

fs.writeFileSync("snapshot.json", JSON.stringify(payload));
console.log("snapshot.json generated", new Date().toISOString());
