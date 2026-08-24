const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const pgBin = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const dataDir = path.join(__dirname, 'pgdata');
const port = 5433;

async function setup() {
  console.log('🚀 Setting up dedicated PostgreSQL instance on port ' + port + '...');

  if (!fs.existsSync(dataDir)) {
    console.log('1️⃣ Initializing database cluster at ' + dataDir + '...');
    execSync(`"${path.join(pgBin, 'initdb.exe')}" -D "${dataDir}" -U postgres --auth=trust --no-instructions`, {
      stdio: 'inherit'
    });
  } else {
    console.log('1️⃣ Data directory already exists.');
  }

  console.log('2️⃣ Starting PostgreSQL server on port ' + port + '...');
  try {
    execSync(`"${path.join(pgBin, 'pg_ctl.exe')}" -D "${dataDir}" -o "-p ${port}" start`, {
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('Server might already be running, checking connection...');
  }

  // Wait 2 seconds for server to be ready
  await new Promise(r => setTimeout(r, 2000));

  console.log('3️⃣ Creating "restaurantflow" database...');
  try {
    execSync(`"${path.join(pgBin, 'createdb.exe')}" -p ${port} -U postgres restaurantflow`, {
      stdio: 'inherit'
    });
    console.log('✅ Database "restaurantflow" created.');
  } catch (e) {
    console.log('Database may already exist, continuing.');
  }

  console.log('4️⃣ Updating backend/.env configuration...');
  const envPath = path.join(__dirname, 'restaurantflow', 'backend', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  const targetDbUrl = `DATABASE_URL=postgresql://postgres@localhost:${port}/restaurantflow`;
  envContent = envContent.replace(/DATABASE_URL=.*/g, targetDbUrl);
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ backend/.env updated to use dedicated port ' + port);

  console.log('5️⃣ Running Database Migrations...');
  execSync('npm run migrate', { cwd: __dirname, stdio: 'inherit' });

  console.log('6️⃣ Running Database Seeds...');
  execSync('npm run seed', { cwd: __dirname, stdio: 'inherit' });

  console.log('\n🎉 SUCCESS! Dedicated PostgreSQL is active and fully migrated & seeded!');
}

setup().catch(err => {
  console.error('Fatal error during setup:', err);
  process.exit(1);
});
