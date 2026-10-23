# THE CROWD — GitHub Pages build

A first-person 3D social-deduction browser game. Host an online room, copy the invite link, and send it to one friend. The room host must keep the game tab open.

## Put it on GitHub Pages

1. Download and unzip `THE_CROWD_GitHub_Pages.zip`.
2. Open your GitHub repository. Upload **`index.html`** and **`.nojekyll`** to the repository's top level (not inside another folder), then commit the changes. `README.md` is optional.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/(root)`, then save.
5. Open the website URL shown on the Pages screen. It is usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/` for a project site.
6. Click **CREATE ONLINE ROOM**, wait for **Room ready**, then click **COPY INVITE LINK** and send it to your friend. Keep your game tab open. Your friend should open that link and wait until the host sees that the friend connected; the host then clicks **START MATCH**.

GitHub Pages serves the static HTML; it is not itself a realtime game server. This build uses PeerJS for signaling and a browser-to-browser WebRTC connection for the match. Both players need an internet connection and a browser/network that permits WebRTC. Some school or managed networks block peer connections; if the room stays on “Connecting” or fails to join, that is a network limitation rather than something GitHub Pages can fix by itself. The free public PeerJS signaling service is a dependency, and room IDs only work while the host page and connection remain active.

## Controls

- **W A S D**: move relative to where you are looking
- **Mouse**: look around (the pointer locks when you enter the match)
- **E**: role action; the sheriff investigates nearby evidence or accuses the selected suspect, while the murderer tries to eliminate a nearby civilian
- **Shift**: sprint
- **Esc**: pause/resume
- Aim at a character and click to select them for an accusation. On touch devices, use the on-screen movement controls.

## What's inside

- Three maps: Neon Atrium, Velvet Hotel, and Night Museum
- 14 wandering AI civilians plus two player characters
- First-person view, three-minute rounds, role reveals, witnesses, evidence and accusation penalties
- Added side-street pavilion buildings and map-specific waist-high cover

The page loads Three.js and PeerJS from public CDNs, so an internet connection is required. The game was syntax-checked locally; online joining must be tested on the actual hosting/network environment because WebRTC may be restricted by that network.
