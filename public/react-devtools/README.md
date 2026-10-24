# React DevTools vendored build

This folder is populated by the React monorepo build, not by hand.

```bash
npm run react-devtools:vendor -- --download
```

On Windows, prefer WSL if the experimental React build fails. If `yarn install` omits packages like `tmp`, ensure `NODE_ENV` is not `production` during vendoring (the vendor script forces development for its steps).

After a successful run you should have `build/*.js`, `REVISION.json`, and `LICENSE`.
