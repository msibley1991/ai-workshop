# AI Workshop

A website that holds our workshop talk on designing with coding agents, and doubles as the worked example of what the talk teaches.

## Get the code

Clone the repo once:

```sh
git clone https://github.com/msibley1991/ai-workshop.git
cd ai-workshop
```

## Working together

Everyone works on their own branch, never straight on `main`. Start one with:

```sh
git checkout -b your-name/topic
```

### Sync your branch with `main`

Do this before you push, and whenever `main` has moved.

1. Commit your work on your branch.
2. Download the latest `main`. Your local copy of `main` doesn't update by itself.

   ```sh
   git fetch origin
   ```

3. On your branch, merge it in. (`git pull origin main` does steps 2 and 3 in one go.)

   ```sh
   git merge origin/main
   ```

4. If there are conflicts, Git stops and lists the conflicting files. Fix them, `git add` each one, then:

   ```sh
   git commit
   ```

5. Run and test the site and the lab pages (see below). A merge can be conflict-free and still break something.
6. Push:

   ```sh
   git push
   ```

### Just viewing

To see the latest `main` without working on it:

```sh
git checkout main
git pull
```

## Run

Serve it locally (the modules and presets need a server):

```sh
python3 serve.py
```

Then visit http://localhost:8123.

## Pages

There's nothing to install: dialkit is included in the repo (`vendor/`), three.js loads from a CDN, and the fonts are in `assets/fonts/`.

- `index.html`: the talk and its slides
- `glossary.html`: the talk's terms
- `lab/genie.html`: the text genie
- `lab/hierarchy.html`: type scale
- `lab/shading.html`: dither vs hatching

On localhost the talk and glossary also show the dialkit Display and Palette panels for tuning. Anywhere else (the published site) they don't load.

### Shared settings (saved to the repo)

Saving needs `serve.py`, and only works from your own machine.

- The **Palette** panel edits the active palette's colours and display effects, saved into `presets/palettes.json` by **Save palette**. The **Display** menu holds only the shared pixel size and line weight, from `presets/display.json` on every page load. **Save display settings** writes that file and **Revert to saved** reloads it. Unsaved tweaks are lost on reload.

Commit and push those files to share a look. Both of you can save to these files, so if you each save different values, the merge will conflict. Sync your branch first (see [Working together](#working-together)).

### Kept in your browser only

These are stored in your browser and never saved to the repo:

- the viewer controls (`[c]` on `index.html`: palette choice, motion, blur, lines)
- the Grid toggle
- the genie and shading dials

### Keys on `index.html`

- `←` `→`: step the slides
- `n`: nav
- `g`: grid
- `f`: fullscreen
- `c`: controls
