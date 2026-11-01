# AI Workshop

A website built with LLM-assisted coding.

## Get the code

Clone the repo once:

```sh
git clone https://github.com/msibley1991/ai-workshop.git
cd ai-workshop
```

## Stay up to date

Pull the latest changes from `main` whenever you want to see updates:

```sh
git checkout main
git pull
```

If you're working on your own branch, bring the latest `main` into it:

```sh
git checkout your-branch-name
git merge main
```

## Run

Open `index.html` in a browser, or serve locally:

```sh
python3 -m http.server 8123
```

Then visit http://localhost:8123.

## Effects lab

`lab/` is a playground for tuning the site's display effects with live sliders. There's nothing to install: dialkit is included in the repo, and three.js and the fonts load from the internet.

```sh
python3 -m http.server 8123
```

Open http://localhost:8123/lab/.

- **Presets → Load preset** loads a saved look (`light`, `dark`, `presenter`, `reader`).
- Slider changes are remembered in your browser only.
- Loading a preset overwrites whichever version (V1, V2…) is selected at the top of the panel. Save a new version first if you want to keep the current one.
- To share a look: **Presets → Export JSON**, save the file into `lab/presets/`, add its name to the `presets.file` list in `lab/js/params.js`, then commit and push.
