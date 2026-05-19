/**
 * restore.mjs — TRASHit backup restore script
 *
 * Възстановява MySQL базата от JSON backup файл (свален от Telegram).
 *
 * Употреба:
 *   node restore.mjs ./backup-2024-01-15.json
 *
 * Изисква:
 *   DATABASE_URL в .env (или като environment variable)
 *   npm install mysql2 dotenv
 */

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────

const BACKUP_FILE = process.argv[2];

if (!BACKUP_FILE) {
  console.error("❌  Липсва backup файл.\n   Употреба: node restore.mjs ./backup-2024-01-15.json");
  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌  Файлът не съществува: ${BACKUP_FILE}`);
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL не е зададен. Добави го в .env или като environment variable.");
  process.exit(1);
}

// ─── Parse DATABASE_URL ───────────────────────────────────────────────────────

function parseDatabaseUrl(url) {
  // mysql://user:password@host:port/database
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error(`Невалиден DATABASE_URL формат: ${url}`);
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5].split("?")[0], // премахва query params
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function restore() {
  console.log(`\n🔄  TRASHit Restore Script`);
  console.log(`📁  Backup файл: ${path.resolve(BACKUP_FILE)}\n`);

  // Прочитаме JSON backup
  let backup;
  try {
    const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
    backup = JSON.parse(raw);
  } catch (err) {
    console.error("❌  Грешка при четене на JSON файла:", err.message);
    process.exit(1);
  }

  // Очакваме структура: { tableName: [ {...}, {...} ], ... }
  if (typeof backup !== "object" || Array.isArray(backup)) {
    console.error("❌  Невалидна структура на backup файла. Очаква се: { tableName: [ rows... ] }");
    process.exit(1);
  }

  const tables = Object.keys(backup);
  console.log(`📋  Намерени таблици: ${tables.join(", ")}\n`);

  // Свързваме се с MySQL
  let conn;
  try {
    const config = parseDatabaseUrl(DATABASE_URL);
    console.log(`🔌  Свързване с ${config.host}:${config.port}/${config.database} ...`);
    conn = await mysql.createConnection({
      ...config,
      ssl: { rejectUnauthorized: false }, // Railway изисква SSL
      multipleStatements: false,
    });
    console.log("✅  Свързан успешно.\n");
  } catch (err) {
    console.error("❌  Грешка при свързване:", err.message);
    process.exit(1);
  }

  // Потвърждение преди изтриване
  console.log("⚠️   ВНИМАНИЕ: Това ще изтрие и презапише данните в следните таблици:");
  tables.forEach(t => console.log(`     • ${t} (${backup[t].length} реда)`));
  console.log("\n   За да продължиш, напиши: yes");

  const answer = await new Promise(resolve => {
    process.stdin.once("data", d => resolve(d.toString().trim()));
  });

  if (answer.toLowerCase() !== "yes") {
    console.log("\n🚫  Отменено.");
    await conn.end();
    process.exit(0);
  }

  console.log("\n🚀  Започва възстановяване...\n");

  let totalInserted = 0;
  let totalErrors = 0;

  for (const tableName of tables) {
    const rows = backup[tableName];
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`⏭️   ${tableName}: няма редове, пропуснато.`);
      continue;
    }

    console.log(`📥  ${tableName}: изтриване на стари данни...`);
    try {
      await conn.execute(`DELETE FROM \`${tableName}\``);
    } catch (err) {
      console.error(`❌  Грешка при изтриване на ${tableName}: ${err.message}`);
      totalErrors++;
      continue;
    }

    console.log(`📥  ${tableName}: вмъкване на ${rows.length} реда...`);

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${tableName}\` (\`${columns.join("`, `")}\`) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of rows) {
      const values = columns.map(col => {
        const val = row[col];
        // Конвертираме обекти/масиви обратно към JSON string
        if (val !== null && typeof val === "object") return JSON.stringify(val);
        return val ?? null;
      });

      try {
        await conn.execute(sql, values);
        inserted++;
      } catch (err) {
        console.error(`   ⚠️  Ред пропуснат (${tableName}): ${err.message}`);
        totalErrors++;
      }
    }

    console.log(`   ✅  ${inserted}/${rows.length} реда вмъкнати успешно.\n`);
    totalInserted += inserted;
  }

  await conn.end();

  console.log("─".repeat(50));
  console.log(`✅  Готово! Вмъкнати: ${totalInserted} реда | Грешки: ${totalErrors}`);
  if (totalErrors > 0) {
    console.log("⚠️   Имаше грешки — провери логовете по-горе.");
  }
  console.log("─".repeat(50) + "\n");
}

restore().catch(err => {
  console.error("❌  Неочаквана грешка:", err);
  process.exit(1);
});
