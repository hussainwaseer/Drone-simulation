# 🛡️ AI Tracker 3D: Multi-Site Interception Simulation

**AI Tracker 3D** is a high-fidelity, real-time 3D simulation of a sophisticated multi-site missile defense system. Developed with **Three.js**, the project simulates the tracking, engagement, and neutralization of high-velocity aerial threats against critical infrastructure in a procedurally generated urban environment.

---

## 📖 Project Overview
AI Tracker 3D provides an immersive tactical experience where players oversee the defense of three critical sites: **Air HQ**, **Parliament House**, and the **Supreme Court**. The system must manage a limited budget, deploy specialized interceptors, and maintain site integrity against a diverse array of incoming threats from multiple nations.

---

## 🌟 Core Features

### 📡 High-Fidelity 3D Simulation
- **Procedural Metropolitan Area**: A sprawling 8000x8000 unit world featuring hundreds of unique buildings with randomized heights and textures.
- **Dynamic Environment**: A full day/night cycle that transitions skybox colors and activates emissive "night lights" on buildings as the sun sets.
- **Integrated Weather System**: Real-time storm effects including moving rain particles and atmospheric lightning flashes that illuminate the 3D scene.

### 🎯 Comprehensive Threat Ecosystem
The simulation tracks threats from five distinct nations: **Pakistan 🇵🇰**, **China 🇨🇳**, **North Korea 🇰🇵**, **Iran 🇮🇷**, and **Russia 🇷🇺**. Each nation has unique deployment capabilities.

#### Threat Profiles:
- **Attack Drones (UAV)**: Low-altitude, slow-moving quadcopters designed for swarm attacks.
- **Cruise Missiles (ALCM)**: Terrain-hugging, medium-speed guided projectiles.
- **Short-Range Ballistic (SRBM)**: Fast, high-arc missiles with predictable but high-velocity descent.
- **Medium-Range Ballistic (MRBM)**: Extremely fast ICBM-style threats with steep entry trajectories.
- **Hypersonic Glide Vehicles (HGV)**: Mach 10+ threats that challenge even the most advanced interceptors.
- **B-2 Spirit (Stealth Bomber)**: A high-altitude, radar-evading threat that is invisible to standard sensors unless Thermal/Satellite view is active. It is capable of dropping multiple gravity bombs on targets.

### 🚀 Strategic Interception Systems
The defense network utilizes specialized interceptors tailored to different threat classifications:
- **Iron Dome (TAMIR)**: Specialized for low-altitude, low-speed threats like drones.
- **Patriot (PAC-3)**: Mid-range reliability for cruise missile interception.
- **S-400 Triumf (48N6)**: A powerful multi-role interceptor for diverse engagement scenarios.
- **THAAD**: High-altitude terminal defense for medium-range ballistic threats.
- **Arrow-3**: Advanced interceptor for hypersonic and exo-atmospheric threats.

### 📡 Advanced Tactical UI
- **Satellite / Thermal View**: A sensor override mode that applies a thermal filter to the simulation, revealing heat signatures (including stealth units).
- **Tactical Minimap**: A 2D radar-style overlay showing real-time positions of all threats, interceptors, and geofence perimeters.
- **Live Intelligence Feed**: Real-time tracking of statistics, including accuracy, budget, active threat count, and engagement logs.
- **Kill-Cam System**: Cinematic, predictive camera tracking that follows interceptors or threats during their final approach, featuring specialized FPV cockpit views for bomber sorties.

---

## ⚙️ Technical Architecture

### 🛠️ Engine & Graphics
- **Three.js (r128)**: Utilized for the core 3D engine, rendering complex geometries, shadows, and atmospheric fog.
- **Custom Shaders**: Employed for the dynamic skybox and atmospheric effects.
- **Entity System**: A class-based architecture manages `ThreatEntity` and `InterceptorEntity` objects, handling their physics, visuals, and lifecycle independently.

### 🧠 Logic & Physics
- **Predictive Interception**: Interceptors use Time-of-Arrival (ToA) calculations based on target velocity and position to calculate precise intercept vectors.
- **Ballistic Simulation**: SRBM and MRBM threats utilize high-arc gravitational physics for realistic descent profiles.
- **Collision Detection**: High-performance distance-based collision detection manages interactions between interceptors, threats, and site domes.

### 🔊 Audio Engineering
- **Synthesized Soundscape**: Uses the **Web Audio API** to generate real-time launch and explosion sound effects procedurally, ensuring a lightweight yet immersive experience without external audio files.

---

## 🕹️ Simulation Dynamics

### ⚖️ Economic System
- **Budget Management**: Start with a set number of credits.
- **Costs**: Every interceptor launch and site repair consumes credits.
- **Rewards**: Successful interceptions grant credit rewards to sustain the defense network.

### 🔧 Repair & Recovery
- **Autonomous Repair Drones**: If a site is damaged, players can deploy repair drones that fly to the location and restore site health over time.

### 🏁 Mission Objective
- **Survival**: Defend all critical sites for the mission duration (3 minutes) to achieve victory.
- **Failure Condition**: If all three critical infrastructure sites are destroyed, the mission fails.

---

## 👨‍💻 Authors

This simulation was designed with a focus on technical depth, visual excellence, and realistic tactical engagement.

- **Muhammad Hussain Waseer**
- **Muhammad Mehdi Mangi**

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
