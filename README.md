# High Noon Hollow

First-person 3D multiplayer murder mystery in a Wild West town. One sheriff hunts 1-3 human murderers who are hiding among 20 AI townsfolk. 2-8 players, runs in any modern browser (desktop and mobile).

Stack: Three.js r128 (CDN) + Node.js + Express + Socket.IO. The server is authoritative for roles, kills, ammo, cooldowns, NPCs and win conditions. Roles are sent privately to each player. Entity ids are shuffled so an id never reveals human vs NPC.

## Run locally
```bash
npm install
npm start          # http://localhost:3000
npm test           # end-to-end smoke test with two real clients
```
Open http://localhost:3000 in two tabs, create a room in one, join with the code in the other.

## Put it on GitHub
```bash
git init && git add . && git commit -m "High Noon Hollow"
git branch -M main
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR-USER/high-noon-hollow.git
git push -u origin main
```

## Deploy (simplest: one service hosts game and server)
Any host that runs a persistent Node process with WebSockets works. Example with Render (check their current free-tier terms; free services may sleep when idle, so the first load can be slow):
1. Render dashboard: New > Web Service > connect your GitHub repo.
2. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
3. Deploy. Your URL (like `https://your-app.onrender.com`) is the game. No config needed, since `public/config.js` is empty and the page connects to the same origin.
4. Share the URL, or use "Copy invite link" in the lobby (`?room=CODE` pre-fills the code).

## Optional: frontend on GitHub Pages, server elsewhere
GitHub Pages only serves static files; it cannot run the Socket.IO server.
1. Deploy the server as above, and set env var `CLIENT_ORIGIN=https://YOUR-USER.github.io` on it.
2. In `public/config.js` set `SERVER_URL: "https://your-app.onrender.com"`, commit, push.
3. Repo Settings > Pages > deploy from the `/public` folder (or publish it with a GitHub Action).

## Environment variables
See `.env.example`: `PORT` (set by the host), `CLIENT_ORIGIN` (allowed frontend origins, `*` by default).

## Rules as implemented
- Murderers: 1 for 2-4 players, 1-2 for 5-6, 2-3 for 7-8 (host sets it in the lobby). 15s kill cooldown, 5s grace at start, kill range 2.6m.
- Sheriff: public gold badge. 6 rounds, 2s reload, 8s gun jam after a wrong shot. Inspect bodies and question NPCs with E. Witness clues give a shirt colour (20% unreliable) and area.
- Deputies: inspect and question, no gun.
- Win: lawmen when all murderers are down; murderers when all NPCs or the sheriff are gone. 8 minute timer (lawmen win if at least half the NPCs survive). Disconnected murderers/sheriff count as gone after 45s.
- Reconnect: refresh or drop and rejoin the same room within a round; identity is a secret token in sessionStorage.

## Troubleshooting
- "Server unreachable": wrong `SERVER_URL`, server asleep (wait ~1 min and retry), or `CLIENT_ORIGIN` does not match the page origin.
- Page loads but Join does nothing: check the browser console for blocked mixed content; use `https` for both.
- "Room not found": rooms are deleted after 5 minutes with nobody connected.
- iPhone: add the page to the home screen or use landscape for a bigger view. No sound until you tap once.
- Mouse not captured: click the page; Esc releases it by design.

## Known limits
Buildings are solid (no interiors), lighting is fixed (no day/night), audio is simple synthesized effects (no ambience loops or footsteps), no animations beyond walk bob, footprints are not implemented. Tested: server logic by script (roles, anti-cheat, kills, snapshots). The browser client was syntax-checked but not played in a real browser here, so expect some tuning.
Third-party assets: none. All geometry is procedural; Three.js (MIT), Socket.IO (MIT), Express (MIT), Google Fonts Rye and Alegreya Sans (OFL).
