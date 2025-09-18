import fs from "fs/promises";

export async function embed(base, text) {
  const res = await fetch(`${base}/api/embeddings`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text })
  });
  const j = await res.json();
  return j?.embedding || [];
}

export function cosine(a,b){let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]}return s/(Math.sqrt(na)*Math.sqrt(nb)+1e-9)}

export async function buildIndex(ollamaBase, docPath) {
  const raw = await fs.readFile(docPath, "utf8");
  const chunks = chunk(raw, 1200, 200);
  const vecs = [];
  for (const c of chunks) vecs.push({ text: c, vec: await embed(ollamaBase, c) });
  await fs.writeFile("ops/rag-index.json", JSON.stringify(vecs));
}

export async function topK(ollamaBase, query, k=5) {
  const db = JSON.parse(await fs.readFile("ops/rag-index.json","utf8"));
  const q = await embed(ollamaBase, query);
  return db.map(e=>({score: cosine(q,e.vec), text:e.text}))
           .sort((a,b)=>b.score-a.score).slice(0,k);
}

function chunk(s, size, overlap){
  const out=[]; for(let i=0;i<s.length;i+=size-overlap){ out.push(s.slice(i,i+size)); if(i+size>=s.length) break; } return out;
}