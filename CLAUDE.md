# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BaB_remix** is an articulated puppet animation creation application. The goal is to enable users to create and animate articulated puppets (pantins articulés) with a desktop interface.

This is a Tauri v2 desktop application with a React + Vite frontend. It combines Rust (Tauri backend) with TypeScript/Vite (frontend) to create a cross-platform desktop app featuring SVG-based graphics and animations in the DOM.

### Key Features (Target)
- Create and manipulate articulated puppets with joints and rigging
- Animate puppets with timeline-based controls
- Import/export puppet assets (SVG-based for scalability)
- Real-time preview of animations in the PixiJS canvas

## Architecture

### Frontend (React + TypeScript + Vite)
- **Entry Point**: `src/main.tsx` — mounts React app into `#app`
- **Build Tool**: Vite configured on port 8080 (`vite.config.ts`)
- **Assets**: Located in `public/assets/` with subdirectories for `decors/`, `objets/`, and `pantins/`
- **Rendering**: Inline SVG in the DOM (drag & drop assets, inline SVG pantins)

### Backend (Rust + Tauri v2)
- **Entry Point**: `src-tauri/src/main.rs` calls `app_lib::run()`
- **Library**: `src-tauri/src/lib.rs` contains main Tauri setup and plugin configuration
- **Logging**: Uses `tauri-plugin-log` at Info level (debug builds only)
- **Configuration**: `src-tauri/tauri.conf.json` defines app metadata, window settings, and build commands

### Build Pipeline Integration
The Tauri config integrates with the frontend build:
- `beforeDevCommand`: Runs `pnpm dev` to start Vite dev server
- `beforeBuildCommand`: Runs `pnpm build` to create production frontend bundle
- `frontendDist`: Points to `../dist` where Vite outputs the built frontend

## Development Commands

### Running Development Server
```bash
# Frontend only (Vite dev server on port 8080)
pnpm dev

# Tauri desktop app (runs pnpm dev automatically via beforeDevCommand)
pnpm tauri dev
```

### Building
```bash
# Build frontend (TypeScript check + Vite build)
pnpm build

# Build Tauri desktop application (includes frontend build via beforeBuildCommand)
pnpm tauri build
```

## Package Manager

This project uses **pnpm** with a workspace configuration (`pnpm-workspace.yaml`). Always use `pnpm` commands, not `npm` or `yarn`.

## TypeScript Configuration

Strict mode enabled with:
- No unused locals or parameters
- No unchecked side effect imports
- No fallthrough cases in switch statements
- Module resolution: bundler mode
- Target: ES2020

## Asset Structure

Assets are organized by type:
- `public/assets/decors/` — Background/environment graphics (PNG)
- `public/assets/objets/` — Interactive objects (SVG)
- `public/assets/pantins/` — Character sprites (SVG pantins)
- Mixed formats: PNG for raster graphics, SVG for vector graphics
