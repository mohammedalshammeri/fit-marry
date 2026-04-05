const { spawn } = require('child_process');

const p = spawn('node', ['node_modules/prisma/build/index.js', 'migrate', 'dev', '--name', 'contact_exchange_state_machine'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

p.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  if (str.toLowerCase().includes('do you want to continue')) {
    p.stdin.write('y\n');
  }
  if (str.toLowerCase().includes('we need to reset the "public" schema')) {
    p.stdin.write('yes\n');
  }
});

p.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

p.on('close', (code) => {
  console.log('process exited with code', code);
});
