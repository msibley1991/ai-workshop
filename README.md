# AI Workshop

A website built with LLM-assisted coding.

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

Open `index.html` in a browser, or serve locally:

```sh
python3 serve.py
```

Then visit http://localhost:8123.

## Effects lab

`lab/` is a sandbox for the display layer and the slides in Max's Section, separate from the site. There's nothing to install: dialkit is included in the repo, three.js loads from a CDN, and the fonts are in `assets/fonts/`.

```sh
python3 serve.py
```

Open http://localhost:8123/lab/.

Pages:

- `layout.html`: the site layout and the slides
- `genie.html`: the text genie
- `type.html`: typeface specimen
- `hierarchy.html`: type scale
- `shading.html`: dither vs hatching
- `index.html`: the original effects specimen

### Shared settings (saved to the repo)

Saving needs `serve.py`, and only works from your own machine.

- The **Render** menu loads `lab/presets/render.json` on every page load. **Save render settings** writes that file and **Revert to saved** reloads it. Unsaved tweaks are lost on reload.
- The **Palette** panel edits the active palette. **Save palette** writes it into `lab/presets/palettes.json`.

Commit and push those files to share a look. Both of you can save to these files, so if you each save different values, the merge will conflict. Sync your branch first (see [Working together](#working-together)).

### Kept in your browser only

These are stored in your browser and never saved to the repo:

- the viewer controls (`[c]` on `layout.html`: palette choice, motion, blur, scanlines)
- the Grid toggle
- the genie and shading dials
- the specimen page's sliders

### Keys on `layout.html`

- `←` `→`: step the slides
- `n`: nav
- `g`: grid
- `f`: fullscreen
- `c`: controls
