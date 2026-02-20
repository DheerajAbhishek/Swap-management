const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lambdaPath = path.join(__dirname, 'lambdas', 'orders');
const deployDir = path.join(lambdaPath, 'deploy_temp');
const zipPath = path.join(lambdaPath, 'supply-orders.zip');

// Clean up
if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Create deploy directory
fs.mkdirSync(deployDir, { recursive: true });

// Copy index.js
fs.copyFileSync(path.join(lambdaPath, 'index.js'), path.join(deployDir, 'index.js'));

// Create package.json
const packageJson = {
  name: 'supply-orders',
  version: '1.0.0',
  dependencies: {
    '@aws-sdk/client-dynamodb': '^3.0.0',
    '@aws-sdk/lib-dynamodb': '^3.0.0'
  }
};
fs.writeFileSync(path.join(deployDir, 'package.json'), JSON.stringify(packageJson, null, 2));

console.log('Installing dependencies...');
execSync('npm install --omit=dev', { cwd: deployDir, stdio: 'inherit' });

console.log('Creating ZIP...');
const archiver = require('archiver');
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`ZIP created: ${archive.pointer()} bytes`);
  
  console.log('Deploying to AWS...');
  const result = execSync(`aws lambda update-function-code --function-name supply-orders --zip-file fileb://supply-orders.zip --region ap-south-1 --output json`, {
    cwd: lambdaPath
  });
  
  const data = JSON.parse(result.toString());
  console.log(`✅ Deployed: ${data.FunctionName} - ${data.CodeSize} bytes`);
  
  // Clean up
  fs.rmSync(deployDir, { recursive: true });
  fs.unlinkSync(zipPath);
  console.log('Cleanup complete');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(deployDir, false);
archive.finalize();
