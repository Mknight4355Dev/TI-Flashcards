'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const android = path.resolve(__dirname, '..', 'android');
const windows = process.platform === 'win32';
const wrapper = path.join(android, windows ? 'gradlew.bat' : 'gradlew');
if (!fs.existsSync(wrapper)) {
  console.error('Android project missing. Run npm run android:add first.');
  process.exitCode = 1;
} else {
  const java = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', windows ? 'java.exe' : 'java')
    : 'java';
  const version = spawnSync(java, ['-version'], { encoding: 'utf8' });
  const output = (version.stderr || '') + (version.stdout || '');
  const match = output.match(/version\s+"(?:1\.)?(\d+)/);
  if (version.error || version.status !== 0 || !match || Number(match[1]) < 21) {
    console.error('Android builds require JDK 21 or newer. Install a compatible Android Studio or JDK 21, then set JAVA_HOME to its JDK directory (not bin).');
    console.error('Current Java: ' + (version.error ? version.error.message : output.trim() || 'version unavailable'));
    process.exit(1);
  }
  const result = spawnSync(windows ? 'cmd.exe' : wrapper,
    windows ? ['/d', '/c', 'gradlew.bat assembleDebug'] : ['assembleDebug'],
    { cwd: android, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status === null ? 1 : result.status;
  if (process.exitCode === 0) console.log('APK: ' + path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'));
}
