import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const FILE = path.join(process.cwd(), ".data", "smtp-local.json");

export type LocalSmtp = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

export async function readLocalSmtp(): Promise<LocalSmtp | null> {
  try {
    const raw = await readFile(FILE, "utf8");
    const data = JSON.parse(raw) as Partial<LocalSmtp>;
    const user = String(data.user || "").trim();
    const pass = String(data.pass || "").replace(/\s/g, "");
    if (!user || !pass) return null;
    return {
      host: String(data.host || "smtp.gmail.com").trim() || "smtp.gmail.com",
      port: Number(data.port || 587) || 587,
      user,
      pass,
    };
  } catch {
    return null;
  }
}

export async function writeLocalSmtp(smtp: LocalSmtp): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(
    FILE,
    JSON.stringify(
      {
        host: smtp.host,
        port: smtp.port,
        user: smtp.user,
        pass: smtp.pass,
      },
      null,
      2
    ),
    "utf8"
  );
}
