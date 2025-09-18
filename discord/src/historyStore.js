import fs from "fs-extra";
import path from "path";

export class HistoryStore {
  constructor(dir) {
    this.dir = dir;
  }
  async init() { await fs.ensureDir(this.dir); }
  fileFor(channelId) { return path.join(this.dir, `${channelId}.json`); }

  async load(channelId) {
    const f = this.fileFor(channelId);
    if (!(await fs.pathExists(f))) return [];
    try { return JSON.parse(await fs.readFile(f, "utf8")); }
    catch { return []; }
  }

  async save(channelId, history) {
    const f = this.fileFor(channelId);
    await fs.outputFile(f, JSON.stringify(history.slice(-50), null, 2)); // keep last 50
  }

  // helpers for slash commands:
  async clear(channelId) { await this.save(channelId, []); }
  async setModel(channelId, model) {
    const metaFile = path.join(this.dir, `${channelId}.meta.json`);
    await fs.outputFile(metaFile, JSON.stringify({ model }, null, 2));
  }
  async getModel(channelId) {
    const metaFile = path.join(this.dir, `${channelId}.meta.json`);
    if (!(await fs.pathExists(metaFile))) return null;
    try { return JSON.parse(await fs.readFile(metaFile, "utf8")).model || null; }
    catch { return null; }
  }
}