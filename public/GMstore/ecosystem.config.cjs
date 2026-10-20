module.exports = {
  apps: [{
    name: 'gmstore',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000 -H 127.0.0.1',
    cwd: __dirname,
    env: { NODE_ENV: 'production' },
  }]
};
