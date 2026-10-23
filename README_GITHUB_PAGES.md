# THE CROWD — GitHub Pages multiplayer build (repaired)

## Update your GitHub Pages site
1. Extract this ZIP.
2. Upload/replace `index.html` and `.nojekyll` in your repository root, then commit.
3. Open the published GitHub Pages URL and hard-refresh the page (Ctrl+F5).
4. Click **CREATE ONLINE ROOM** and wait for **Room ready**.
5. Copy the invite link, send it to your friend, and keep the host tab open. The friend opens the link.
6. Start the match only after the host page says **Friend connected**.

## What was repaired
- Restored the missing `setStatus` and `sendNet` networking helper functions.
- Corrected the PeerJS constructor call to pass options as the second argument.

## Networking note
GitHub Pages serves static files; PeerJS provides room signalling and browsers then connect using WebRTC. The public PeerJS service or a school firewall can still prevent connections. If the room does not reach **Room ready**, read the on-screen error message. If it reaches **Room ready** but joining times out, the direct WebRTC path may be blocked.

## Controls
- WASD: move; mouse: look; E: role action; Shift: sprint; Esc: pause/resume.
