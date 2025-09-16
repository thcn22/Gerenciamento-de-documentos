import { db } from "../services/db";

function listTables() {
  const rows = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
  `).all() as any[];
  console.log("Tabelas:");
  for (const r of rows) console.log("-", r.name);
}

function showSchema() {
  const rows = db.prepare(`
    SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
  `).all() as any[];
  for (const r of rows) {
    console.log(`\n-- ${r.name}\n${r.sql}\n`);
  }
}

function selectTop(table: string, limit = 20) {
  const stmt = db.prepare(`SELECT * FROM ${table} LIMIT ?`);
  const rows = stmt.all(limit);
  console.log(JSON.stringify(rows, null, 2));
}

function runSQL(sql: string) {
  const trimmed = sql.trim();
  const isSelect = /^select/i.test(trimmed);
  if (isSelect) {
    const rows = db.prepare(trimmed).all();
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const info = db.prepare(trimmed).run();
    console.log(info);
  }
}

const [cmd, arg1, arg2] = process.argv.slice(2);

switch (cmd) {
  case "tables":
    listTables();
    break;
  case "schema":
    showSchema();
    break;
  case "select":
    if (!arg1) {
      console.error("Uso: select <tabela> [limite]");
      process.exit(1);
    }
    selectTop(arg1, arg2 ? Number(arg2) : 20);
    break;
  case "sql":
    const sql = process.argv.slice(3).join(" ");
    if (!sql) {
      console.error("Uso: sql <comando SQL>");
      process.exit(1);
    }
    runSQL(sql);
    break;
  default:
    console.log("Comandos disponíveis:");
    console.log("  tables           # lista tabelas");
    console.log("  schema           # mostra DDL das tabelas");
    console.log("  select <t> [n]   # mostra até n linhas de uma tabela");
    console.log("  sql <SQL>        # executa SQL arbitrário");
    process.exit(1);
}
