import { spawn } from 'node:child_process';
const children = [spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit' }), spawn('npm', ['--prefix', 'client', 'run', 'dev'], { stdio: 'inherit' })];
let stopping = false;
function stop(code=0) { if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code; }
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
for(const child of children){child.on('error',()=>{console.error('Could not start the full app. Install both root and client dependencies first.');stop(1);});child.on('exit',code=>stop(code||0));}
