npx npm-check-updates --dep prod,dev --upgrade --workspaces --root --reject zod
cd epicshop && npx npm-check-updates --dep prod,dev --upgrade --root --reject zod
cd epic-me && npx npm-check-updates --dep prod,dev --upgrade --root --reject zod
cd ../..
rm -rf node_modules package-lock.json ./epicshop/package-lock.json ./epicshop/node_modules ./exercises/**/node_modules ./epicshop/epic-me/package-lock.json ./epicshop/epic-me/node_modules
npm install
npm run setup
npm run typecheck
npm run lint -- --fix
