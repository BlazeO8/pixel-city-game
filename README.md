# pixel-city-game
An interactive top-down pixel art action game built with vanilla JavaScript and Canvas API


# 🎮 GTA: Pixel City - Enhanced Edition

An interactive top-down pixel art action game built with **vanilla JavaScript** and **HTML5 Canvas API**. Experience GTA-style gameplay with vehicles, weapons, AI cops, and procedurally generated missions!

![Game Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow)
![Canvas API](https://img.shields.io/badge/Graphics-Canvas%20API-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

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
| **Shoot** | Mouse Click or `SPACE` |
| **Enter/Exit Car** | `E` to steal nearest car, `F` to exit |
| **Cycle Weapon** | `Q` |
| **Toggle Mission** | `M` |

### Gameplay Tips
1. 🚗 **Steal Vehicles**: Press `E` near any car to steal it for faster movement
2. 💰 **Earn Cash**: Ram pedestrians, shoot enemies, and complete missions
3. ⭐ **Manage Wanted Level**: More stars = more aggressive cops. Hide when wanted!
4. 🎯 **Complete Missions**: Each mission gives rewards and increases your level
5. 🔫 **Weapon Management**: Cycle through weapons with `Q`, unlimited ammo on Pistol

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
