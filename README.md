# pixel-city-game
An interactive top-down pixel art action game built with vanilla JavaScript and Canvas API


# 🎮 GTA: Pixel City - Enhanced Edition

An interactive top-down pixel art action game built with **vanilla JavaScript** and **HTML5 Canvas API**. Experience GTA-style gameplay with vehicles, weapons, AI cops, and procedurally generated missions!

![Game Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow)
![Canvas API](https://img.shields.io/badge/Graphics-Canvas%20API-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌐 Multiplayer (no server, no install)

Play with friends anywhere — same room or across the internet — with zero setup:

1. Open `index.html` in your browser (just double-click it, or host it anywhere)
2. Click **PLAY MULTIPLAYER**, enter your name, click **HOST A GAME**
3. You'll get a short 5-character code (like `K7F2Q`) — share it with friends however's easiest (text, Discord, shout across the room)
4. Friends open the same `index.html`, click **PLAY MULTIPLAYER**, enter the code under **JOIN GAME**

That's it — no Node.js, no server to run, no URLs or IP addresses to hunt down. Under the hood this uses **WebRTC**: once two browsers find each other (using PeerJS's free public directory service just for that initial handshake), all game traffic flows directly between browsers, peer-to-peer.

Whoever clicks **HOST** keeps running the actual simulation (cops, pedestrians, missions, weather) and shares it with everyone else in real time; everyone else's browser renders that same shared world and controls their own character in it.

**What's shared:** the city layout, traffic, pedestrians, cop AI, wanted level, weather/day-night, and mission progress — everyone sees the same living city and can shoot/fight in it together, with kills correctly credited to whoever fired the shot.

**Current limitations of this version:**
- Anyone can drive, but claiming a car goes through the host first (a quick round-trip) to make sure two players never end up fighting over the same one
- Mission rewards are tracked for the host; joining players earn their own cash from kills but don't currently bank the mission completion bonus
- Running someone over with a vehicle only registers if the host does it
- If the host closes their tab, the session ends — everyone else needs to reconnect to a new host

### If a connection won't go through

This should work over any normal internet connection (home WiFi, campus WiFi, mobile data) since it doesn't need direct device-to-device LAN access the way a locally-hosted server would — WebRTC connections are brokered over the internet even when both of you are on the same restrictive network. If it still won't connect (rare, usually a very locked-down corporate/campus firewall blocking WebRTC specifically), try having everyone join the same mobile hotspot instead.

## 🖥️ Single-player

Just open `index.html` directly in a browser — no server or install needed.



### Core Gameplay
- **Vehicle System**: Drive cars, trucks, bikes, police cars, and ambulances
- **Weapon Arsenal**: Pistol, Rifle, Shotgun, Minigun with unique mechanics
- **Dynamic AI**: NPC pedestrians and intelligent cop AI with pursuit mechanics
- **Wanted System**: 5-star wanted level that scales with your criminal behavior
- **Mission System**: Dynamic mission types (Elimination, Delivery, Escape, Rampage)
- **Player Skins**: 5 unique character skins to choose from

### Technical Features
- Real-time physics simulation for vehicles
- Collision detection for buildings, vehicles, and pedestrians
- Procedurally generated city with roads and building zones
- Particle effects for bullets, explosions, and impacts
- Screen shake effects during intense moments
- Animated minimap tracking
- HUD with health, cash, wanted level, and mission progress

## 🎮 How to Play

### Controls
| Action | Keys |
|--------|------|
| **Move** | `W` `A` `S` `D` or Arrow Keys |
| **Aim/Look** | Mouse Movement |
| **Shoot / Melee Swing** | Mouse Click or `SPACE` |
| **Enter/Exit Car** | `E` to steal nearest car, `F` to exit |
| **Cycle Weapon** | `Q` |
| **Throw Molotov** | `G` |
| **Radio (while driving)** | `R` to cycle stations / off |
| **Mute Sound** | `V` |
| **Toggle Mission** | `M` |

### Weapons
Pistol (unlimited ammo), Rifle, Shotgun, Minigun, Sniper (high damage, slow fire), and Melee (bat — unlimited, close range). Cycle with `Q`; ammo occasionally regenerates over time.

### Gameplay Tips
1. 🚗 **Steal Vehicles**: Press `E` near any car — traffic actually drives around the city now, so not every car is just parked
2. 💰 **Earn Cash**: Ram pedestrians, shoot enemies, and complete missions
3. ⭐ **Manage Wanted Level**: More stars = more aggressive cops. Hide when wanted!
4. 🎯 **Complete Missions**: Each mission gives rewards and increases your level
5. 🔫 **Weapon Management**: Cycle through weapons with `Q`, unlimited ammo on Pistol and Melee
6. 🔥 **Molotovs**: Press `G` to throw one — it's a short-range lob, so get reasonably close first
7. 🔴🔵 **Rival Gangs**: Some pedestrians are armed gang members split into two rival factions (red vs blue bandanas) — they'll fight you, but they'll also fight each other on sight
8. 🚔 **Police Presence**: A couple of patrol cops cruise the city even with zero stars — they won't bother you until you actually cause trouble. At 5 stars, expect dark-colored SWAT units with more health and faster response
9. 😱 **NPCs React**: Pedestrians and traffic panic and flee from nearby gunfire or explosions regardless of your wanted level — not just when cops are already after you
8. 💾 **Progress Saves Automatically**: Your cash, level, and loadout save periodically and on mission complete — a "Continue" option appears on the start screen next time

### Objective
Survive as long as possible, complete missions, earn cash, and dominate the streets of Pixel City!

## 🛠️ Development

### Tech Stack
- **Language**: Vanilla JavaScript (ES6+)
- **Graphics**: HTML5 Canvas API
- **No Dependencies**: Pure JavaScript, zero npm packages required

### File Structure
gta-pixel-city/ ├── index.html # Game HTML entry point ├── game.js # Core game logic (1400+ lines) ├── styles.css # Game styling and UI ├── README.md # This file └── .gitignore # Git ignore file

Code

### Performance
- Optimized rendering with camera culling
- Efficient collision detection
- Smooth 60+ FPS gameplay on modern browsers

## 🚀 Getting Started

### Option 1: Play Online
Visit: `https://blazeo8.github.io/gta-pixel-city/`

### Option 2: Run Locally
```bash
git clone https://github.com/BlazeO8/gta-pixel-city.git
cd gta-pixel-city
python -m http.server 8000
# Visit http://localhost:8000 in your browser
🎨 Game Elements
Vehicles
Car: Balanced speed and handling
Truck: Slow but heavy, great for ramming
Bike: Fastest but fragile
Police Car: Fast pursuit vehicle (AI only)
Ambulance: Slow emergency vehicle (AI only)
Weapons
Pistol: Infinite ammo, steady fire rate
Rifle: More damage, slower fire rate
Shotgun: High damage, spread shots
Minigun: Rapid fire, balanced damage
NPC Types
Pedestrians: Flee when wanted level rises
Cops: Intelligent pursuit with gunfire
Traffic: Civilian vehicles
📊 Game Stats
Map Size: 3200x3200 pixels
Vehicles Spawned: 45+
Pedestrians: 65+
Max Wanted Level: 5 stars
Total Weapon Types: 4
Unique Vehicle Types: 5
Mission Types: 4
🔄 Updates & Roadmap
v3.0 (Current)
✅ Enhanced vehicle physics ✅ Multiple vehicle types with unique designs ✅ Improved NPC behavior ✅ Expanded procedural map ✅ Screen shake effects ✅ Particle system with gravity

Future Ideas
 Sound effects and background music
 Save/load game progress
 Leaderboard system
 More mission variety
 Power-ups and pickups
 Destructible environments
 Multiplayer support
🐛 Known Issues
None at the moment! Report bugs via GitHub Issues.

💡 Tips for Customization
Change Vehicle Colors
Edit VEHICLE_TYPES in game.js:

JavaScript
CAR: { 
    color: ['#e74c3c', '#3498db', '#2ecc71'], // Add more colors here
    ...
}
Adjust Difficulty
Edit spawn rates and speeds:

JavaScript
if (wanted >= 1 && wantedTimer > 3000 / (wanted + 1)) {
    if (cops.length < wanted * 2 + level) spawnCop();
}
Customize Map Size
Change WORLD variable in game.js (default: 3200)

📝 License
This project is open source under the MIT License. Feel free to fork, modify, and distribute!

👨‍💻 Author
Kartik Jindal (@BlazeO8)

🐍 Python Developer
🎮 Game Dev Enthusiast
🤖 AI/ML Learner
🙏 Credits
Built with passion using vanilla JavaScript and HTML5 Canvas. Inspired by classic GTA games!

Give it a ⭐ if you enjoyed the game!
