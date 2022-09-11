JS13k 2022 entry
=============
- This repository has a workflow that minifies and zips the output (see below)

[![Generate Js13k submission zip](https://github.com/NewChromantics/8x8.Js13k/actions/workflows/GenerateJs13kSubmissionZip.yml/badge.svg)](https://github.com/NewChromantics/8x8.Js13k/actions/workflows/GenerateJs13kSubmissionZip.yml)


The goal is to be a vanilla js webxr voxel shooter.
[https://grave.quest/](https://grave.quest/)


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

