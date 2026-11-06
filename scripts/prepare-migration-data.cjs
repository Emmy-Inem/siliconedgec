// Converts selected COPY data into transactional SQL files for an isolated restore.
// Output contains private records: keep it outside the repository. Does not connect.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const [restoreTool, backup, outputDir, authColumnsFile] = process.argv.slice(2);
if (!restoreTool || !backup || !outputDir || !authColumnsFile) throw new Error('Expected pg_restore path, backup path, private output directory, destination auth columns JSON.');
if (fs.existsSync(outputDir)) throw new Error('Output directory must be new to avoid mixing restore attempts.');
fs.mkdirSync(outputDir, { recursive: true });
const authColumns = JSON.parse(fs.readFileSync(authColumnsFile, 'utf8')).rows;
const allowedAuth = new Map();
for (const column of authColumns) {
  if (column.is_generated !== 'NEVER') continue;
  const table = `${column.table_schema}.${column.table_name}`;
  if (!allowedAuth.has(table)) allowedAuth.set(table, new Set());
  allowedAuth.get(table).add(column.column_name);
}
function decodeCopy(value) {
  if (value === '\\N') return null;
  return value.replace(/\\([0-7]{1,3}|x[0-9a-fA-F]{1,2}|[\s\S])/g, (_, token) => {
    if (/^[0-7]/.test(token)) return String.fromCharCode(parseInt(token, 8));
    if (/^x[0-9a-fA-F]/.test(token)) return String.fromCharCode(parseInt(token.slice(1), 16));
    return ({ b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' })[token] ?? token;
  });
}
const identifier = text => '"' + text.replaceAll('"', '""') + '"';
const literal = text => text === null ? 'NULL' : "'" + text.replaceAll("'", "''") + "'";
let current = null, tuples = [], tupleBytes = 0, sql = '', batch = 0, failed = false;
const counts = {}, batches = [];
function flushBatch() {
  if (!sql) return;
  const filename = `data-${String(++batch).padStart(3, '0')}.sql`;
  fs.writeFileSync(path.join(outputDir, filename), "BEGIN;\nSET LOCAL session_replication_role = replica;\nSET LOCAL standard_conforming_strings = on;\n" + sql + '\nCOMMIT;\n');
  batches.push(filename); sql = '';
}
function flushTuples() {
  if (!tuples.length) return;
  sql += `INSERT INTO ${current.table.split('.').map(identifier).join('.')} (${current.selected.map(i => identifier(current.columns[i])).join(',')}) VALUES\n${tuples.join(',\n')};\n`;
  tuples = []; tupleBytes = 0;
  if (Buffer.byteLength(sql) > 1500000) flushBatch();
}
const child = spawn(restoreTool, ['--file=-', '--data-only', '--schema=public', '--schema=auth', backup]);
const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
lines.on('line', line => {
  if (failed) return;
  try {
    const match = line.match(/^COPY ([\w."]+) \((.+)\) FROM stdin;$/);
    if (match) {
      const table = match[1].replaceAll('"', '');
      const columns = match[2].split(', ').map(c => c.replace(/^"|"$/g, ''));
      const include = table.startsWith('public.') || allowedAuth.has(table);
      const selected = columns.map((_, i) => i).filter(i => table.startsWith('public.') || allowedAuth.get(table)?.has(columns[i]));
      const missing = columns.filter(c => !table.startsWith('public.') && allowedAuth.has(table) && !allowedAuth.get(table).has(c));
      if (missing.length) throw new Error(`Review destination column differences for ${table}: ${missing.join(',')}`);
      current = { table, columns, selected, include };
      if (include) counts[table] = 0;
    } else if (current && line === '\\.') {
      flushTuples(); current = null;
    } else if (current?.include) {
      const cells = line.split('\t');
      if (cells.length !== current.columns.length) throw new Error(`Unexpected COPY column count for ${current.table}`);
      const tuple = '(' + current.selected.map(i => literal(decodeCopy(cells[i]))).join(',') + ')';
      tuples.push(tuple); tupleBytes += Buffer.byteLength(tuple); counts[current.table]++;
      if (tuples.length >= 500 || tupleBytes > 300000) flushTuples();
    }
  } catch (error) { failed = true; child.kill(); console.error(error.message); process.exitCode = 1; }
});
child.stderr.on('data', chunk => process.stderr.write(chunk));
child.on('close', code => {
  if (failed || code !== 0) { process.exitCode = 1; return; }
  if (current) throw new Error('Incomplete COPY stream');
  flushBatch();
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify({ counts, batches }, null, 2));
  console.log(JSON.stringify({ tables: Object.keys(counts).length, batches: batches.length, rows: Object.values(counts).reduce((a, b) => a + b, 0) }));
});
