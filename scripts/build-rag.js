import { buildIndex } from "../discord/src/embeddings.js";

const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://ollama:11434";
const DOC_PATH = "ops/index.json";

buildIndex(OLLAMA_BASE, DOC_PATH).then(() => console.log("RAG index built")).catch(console.error);