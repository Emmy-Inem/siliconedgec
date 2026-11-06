// Local source inspection only: no credentials are read and no network calls are made.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  });
}
const relative = name => path.relative(root, name).replaceAll('\\', '/');
const functions = files(path.join(root, 'supabase/functions')).filter(name => name.endsWith('/index.ts') || name.endsWith('\\index.ts'));
const config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
const functionConfig = Object.fromEntries([...config.matchAll(/\[functions\.([^\]]+)\]\s*verify_jwt\s*=\s*(true|false)/g)].map(match => [match[1], match[2] === 'true']));
const sourceFiles = ['src', 'supabase', 'drizzle', 'scripts'].flatMap(dir => files(path.join(root, dir))).filter(name => /\.(ts|tsx|sql|cjs|toml)$/.test(name) && name !== __filename);
const oldReference = 'sdddxnjlgjjaoayyraxn';
const report = {
  sourceProject: oldReference,
  destinationProject: 'jhrytvbpxftwpasqdybk',
  note: 'Source inventory only. This is not a database backup or proof of live configuration. Secret values are intentionally excluded.',
  migrations: ['supabase/migrations', 'drizzle/migrations'].map(dir => ({ directory: dir, files: files(path.join(root, dir)).filter(name => name.endsWith('.sql')).sort().map(relative) })),
  functions: functions.sort().map(name => {
    const source = fs.readFileSync(name, 'utf8');
    const functionName = path.basename(path.dirname(name));
    return { name: functionName, verifyJwt: functionConfig[functionName] ?? 'platform default; review before deployment', environmentVariableNames: [...new Set([...source.matchAll(/Deno\.env\.get\(["']([^"']+)["']\)/g)].map(match => match[1]))].sort() };
  }),
  sharedEnvironmentVariableNames: [...new Set(files(path.join(root, 'supabase/functions/_shared')).flatMap(name => [...fs.readFileSync(name, 'utf8').matchAll(/Deno\.env\.get\(["']([^"']+)["']\)/g)].map(match => match[1])))].sort(),
  filesReferencingOldProject: sourceFiles.filter(name => fs.readFileSync(name, 'utf8').includes(oldReference)).map(relative).sort(),
  filesUsingLovableServices: sourceFiles.filter(name => /LOVABLE_API_KEY|createLovableAuth|ai\.gateway\.lovable|connector.*lovable/.test(fs.readFileSync(name, 'utf8'))).map(relative).sort(),
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
