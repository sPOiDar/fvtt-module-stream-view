# Foundry VTT - Stream View

![Release](https://github.com/sPOiDar/fvtt-module-stream-view/workflows/Release/badge.svg)
![Forge Users](https://img.shields.io/badge/dynamic/json?color=blue&label=Forge%20Users&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fstream-view)
![Foundry Version](https://img.shields.io/badge/dynamic/json?color=blue&label=Foundry%20Version&prefix=v&query=%24.compatibleCoreVersion&url=https%3A%2F%2Fgithub.com%2FsPOiDar%2Ffvtt-module-stream-view%2Fraw%2Fmaster%2Fmodule.json)

This module provides a minimal UI view with automated camera work, ideal for streaming or recording games, without all the GM clutter that running a game entails. It works by assigning a non-player user to the module, and when a browser is logged in as that user, Foundry will present a minimal UI, with the following functions:

- Multiple camera tracking modes:
  - _Automatic_ camera mode tracks player character tokens in the scene, adjusting the camera focus to keep them in view.
  - _Directed_ camera mode tracks the GM's view at all times.
- In _Automatic_ mode, during combat, the current combatant's token, targets and measured templates are tracked by the camera.
- Optionally, the view of the current combatant's controlling user can be tracked during combat.
- Specific tokens can be tracked in _Automatic_ mode by the GM using the token HUD, right-clicking a selection of tokens and clicking the camera icon.
- If using in-game voice/video chat, tokens for the currently speaking users can be focussed, and a speaking indicator will be shown above their token (GMs will use their currently selected token, if any).
- Shared popouts (e.g. journal notes/images shown to players) may be auto-closed after a timeout. Alternatively, they may be closed manually from the Stream View toolbar.
- Camera mode may be toggled dynamically from the Stream View toolbar.

## Setup

- Create a dedicated user that will be used to stream your games, we'll call that user `Stream` (this user should not own any actors/tokens).
- Assign the Stream user `Observer` permissions for all player actors, this will ensure that the stream view shares vision with your party's tokens.
- Select the Stream user under Foundry VTT `Settings` -> `Configure Settings` -> `Module Settings` -> `Stream View` -> `Stream User`, and save.
- Log in with your Stream user in a new browser session, for recording.

### OBS Studio

- Add a browser source that points to your Foundry installation's web interface.
- Right-click on the browser source and choose 'Interact', then log in as your Stream user.
- ???
- Profit

__Note__: Windows users, please ensure that you're using OBS Studio >= v27.2 if you want to capture Foundry using the Browser Source.

## TODO

- Record some demonstration videos to show off the features.
- See if there's any sane way to do Discord voice activity detection, unfortunately there's no tidy solution for this, particularly for hosted Foundry.
