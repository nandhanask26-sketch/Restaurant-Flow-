/**
 * RestaurantFlow - Automated Android APK Builder & Syncer
 * 
 * Features:
 *  - Bundles the latest web app into Capacitor assets
 *  - Compiles the Android APK via Gradle
 *  - Copies the APK to root /RestaurantFlow.apk
 *  - Supports --install to auto-install on connected Android device via ADB
 *  - Supports --live-reload to point APK to local WiFi IP for real-time HMR
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'restaurantflow', 'frontend');
const androidDir = path.join(frontendDir, 'android');
const capConfigFile = path.join(frontendDir, 'capacitor.config.json');
const targetApk = path.join(rootDir, 'RestaurantFlow.apk');
const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

const args = process.argv.slice(2);
const isLiveReload = args.includes('--live-reload') || args.includes('-l');
const isInstall = args.includes('--install') || args.includes('-i');
const isSyncOnly = args.includes('--sync-only') || args.includes('-s');

// Get primary local IPv4 address
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('127.')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function ensureLocalProperties() {
  const localPropPath = path.join(androidDir, 'local.properties');
  const defaultSdk = path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');
  if (!fs.existsSync(localPropPath) && fs.existsSync(defaultSdk)) {
    const escaped = defaultSdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
    fs.writeFileSync(localPropPath, `sdk.dir=${escaped}\n`, 'utf8');
    console.log('📱 Created android/local.properties pointing to Android SDK.');
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 RestaurantFlow Android APK Build & Sync');
  console.log('====================================================');

  ensureLocalProperties();

  // 1. Configure Capacitor config (Bundled vs Live Reload)
  let capConfig = JSON.parse(fs.readFileSync(capConfigFile, 'utf8'));

  if (isLiveReload) {
    const localIp = getLocalIp();
    const liveUrl = `http://${localIp}:5173`;
    console.log(`⚡ Configuring Live-Reload pointing to ${liveUrl}...`);
    capConfig.server = {
      url: liveUrl,
      cleartext: true
    };
  } else {
    console.log('📦 Configuring Standalone Embedded Web App mode (offline & standalone)...');
    capConfig.server = {
      androidScheme: 'https',
      cleartext: true
    };
  }
  fs.writeFileSync(capConfigFile, JSON.stringify(capConfig, null, 2), 'utf8');

  // 2. Build Frontend Web App
  console.log('\n📦 Step 1: Building Web Application (Vite + TypeScript)...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  // 3. Sync Web Assets & Native Plugins with Android Platform
  console.log('\n🔄 Step 2: Syncing web assets and native plugins to Android via Capacitor...');
  const capCmd = process.platform === 'win32'
    ? path.join(frontendDir, 'node_modules', '.bin', 'cap.cmd')
    : 'npx cap';
  execSync(`"${capCmd}" sync android`, { cwd: frontendDir, stdio: 'inherit' });

  if (isSyncOnly) {
    console.log('\n✅ Sync complete! Android assets updated with latest web build.');
    return;
  }

  // 4. Assemble Android Debug APK
  console.log('\n🔨 Step 3: Compiling APK with Gradle...');
  execSync(`${gradlewCmd} assembleDebug`, { cwd: androidDir, stdio: 'inherit' });

  // 5. Copy Output APK to Root
  const builtApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(builtApk)) {
    throw new Error(`Expected APK not found at: ${builtApk}`);
  }

  fs.copyFileSync(builtApk, targetApk);
  const stats = fs.statSync(targetApk);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n====================================================');
  console.log('🎉 SUCCESS! Android APK updated with latest web changes!');
  console.log(`📁 File: ${targetApk}`);
  console.log(`📊 Size: ${sizeMb} MB`);
  console.log(`⏱️ Built: ${new Date().toLocaleTimeString()}`);
  console.log('====================================================');

  // 6. Optional ADB Auto-Install
  if (isInstall) {
    console.log('\n📲 Installing APK to connected Android device...');
    try {
      execSync(`adb install -r "${targetApk}"`, { stdio: 'inherit' });
      console.log('✅ App successfully installed on your Android device!');
    } catch (e) {
      console.warn('⚠️ ADB install failed. Make sure USB debugging is enabled on your phone.');
    }
  } else {
    console.log('\n💡 To install on your Android device via USB, run:');
    console.log('   npm run install:apk');
    console.log('   or: adb install -r RestaurantFlow.apk');
  }
}

main().catch(err => {
  console.error('\n❌ Build Error:', err.message);
  process.exit(1);
});
