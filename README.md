# THE CROWD — GitHub Pages multiplayer build

## Update your GitHub Pages site
1. Extract this ZIP.
2. Upload/replace `index.html` and `.nojekyll` in the repository root, then commit.
3. Open the GitHub Pages website, click **CREATE ONLINE ROOM**, and wait for **Room ready**.
4. Copy the invite link, send it to your friend, and keep the host tab open. The friend opens that exact link.
5. Start the match only after the host page says **Friend connected**.

## Important networking note
GitHub Pages is static hosting; it cannot run the live multiplayer server. This version uses the public PeerJS signalling service plus WebRTC, with explicit HTTPS signalling and multiple STUN servers, clearer timeouts, and better error messages. If it says the signalling service cannot be reached or the direct connection times out, the network is blocking PeerJS/WebRTC or the public service is unavailable. Code on GitHub Pages alone cannot bypass a school firewall; that case needs a hosted relay/server or a different network.

## Controls
- WASD: move; mouse: look; E: role action; Shift: sprint; Esc: pause/resume.
