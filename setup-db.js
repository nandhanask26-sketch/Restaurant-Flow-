const { Client } = require('./restaurantflow/backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node setup-db.js <your_postgres_password>');
    process.exit(1);
  }

  console.log('📡 Step 1: Testing PostgreSQL connection with provided password...');
  const rootClient = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: password,
    port: 5432,
  });

  try {
    await rootClient.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  console.log('📦 Step 2: Checking if "restaurantflow" database exists...');
  try {
    const res = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = 'restaurantflow'");
    if (res.rows.length === 0) {
      console.log('Creating database "restaurantflow"...');
      await rootClient.query('CREATE DATABASE restaurantflow');
      console.log('✅ Database "restaurantflow" created successfully.');
    } else {
      console.log('✅ Database "restaurantflow" already exists.');
    }
  } catch (err) {
    console.error('❌ Error checking/creating database:', err.message);
    await rootClient.end();
    process.exit(1);
  } finally {
    await rootClient.end();
  }

  console.log('⚙️ Step 3: Updating backend/.env with correct credentials...');
  const envPath = path.join(__dirname, 'restaurantflow', 'backend', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  const encodedPassword = encodeURIComponent(password);
  const newDbUrl = `DATABASE_URL=postgresql://postgres:${encodedPassword}@localhost:5432/restaurantflow`;

  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*/g, newDbUrl);
  } else {
    envContent += `\n${newDbUrl}\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ backend/.env updated successfully.');

  console.log('🔄 Step 4: Running migrations...');
  try {
    execSync('npm run migrate', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migrations failed.');
    process.exit(1);
  }

  console.log('🌱 Step 5: Running database seeds...');
  try {
    execSync('npm run seed', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ Seeding completed successfully.');
  } catch (err) {
    console.error('❌ Seeding failed.');
    process.exit(1);
  }

  console.log('\n🎉 ALL DATABASE SETUP TASKS COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);
