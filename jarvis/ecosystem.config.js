// pm2 config. Note: Jarvis is an interactive CLI REPL, so under pm2 you'll
// attach to its terminal with `pm2 attach jarvis` rather than tailing logs.
// Run `npm run build` first so this points at the compiled JS.
export default {
  apps: [
    {
      name: "jarvis",
      script: "dist/index.js",
      cwd: import.meta.dirname,
      interpreter: "node",
      autorestart: true,
      max_restarts: 5,
    },
  ],
};
