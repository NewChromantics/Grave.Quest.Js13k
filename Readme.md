JS13k 2022 entry
=============
- This repository has a workflow that minifies and zips the output (see below)
- [![Generate Js13k submission zip](https://github.com/NewChromantics/8x8.Js13k/actions/workflows/GenerateJs13kSubmissionZip.yml/badge.svg)](https://github.com/NewChromantics/8x8.Js13k/actions/workflows/GenerateJs13kSubmissionZip.yml)
- Note: The worflow integer size-check doesn't work!

- The goal is to be a vanilla js webxr voxel shooter.
- [https://grave.quest/](https://grave.quest/)

- Update: Whilst this game loops around, I ran out of time for a LOT of features, bug fixes. I hesitate to call this finished...
	- There is an ascii Wave editor in `tools.html`, but there's only 2 enemy waves in use!
	- Enemies dont spawn if you pre-destroyed their gravestones
	- Gravestones should repair so we can play infinitely
	- Various bugs with hits & weapons
	- Needs better sounds
	- Keyboard input, touch input
	- IOS could work, with a small-ish change to rescale pos & velocity calculations to write to integer render targets

- Commit cde6df269dbb17d02add75f8dcfb41297d97cde5 was submitted

Game Description
-------------------
```
Grave Quest is a high intensity, first person, voxel-graveyard wave shooter for Desktop & Oculus Quest.

The instructions are simple; As ghosts rise from the grave, point and shoot!
Just don't let them hit your heart and you should survive the night!

Designed for Oculus Quest; hand-tracking controls also work, just blast away the tormented skulls by pointing your fingers at them!

Also playable at https://grave.quest/
```


13kb notes
--------------
- Not using any gl attributes or buffers and generating cube geometry via shader by abusing `gl_VertexId`

Shrinking Code
----------------
- Minify
	- `npx terser --compress --output Mini.js  -- Grave.js` 
- Road roller 
	- `npx roadroller Mini.js --optimize 2 -o Micro.js`
- zip
	- `zip -9  Grave.zip  ./Micro.js ./Micro.html`
	
Copy&Pasta Shrink
-------------------
	
- Everything
	`npx terser --compress --output Mini.js  -- Grave.js && npx roadroller Mini.js --optimize 2 -o Micro.js && rm -f Grave.zip && zip -9  Grave.zip  ./Micro.js ./Micro.html && ls -l Grave.zip`

- Mini & zip
	`npx terser --compress --output Micro.js  -- Grave.js && rm -f ./Grave.zip && zip -9  Grave.zip  ./Micro.js ./Micro.html && ls -l Grave.zip`
	
- RoadRoller & zip
	`npx roadroller Grave.js --optimize 2 -o Micro.js && rm -f Grave.zip && zip -9  Grave.zip  ./Micro.js ./Micro.html && ls -l Grave.zip`

