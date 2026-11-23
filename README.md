# AWS Certified Machine Learning Engineer - Associate (MLA-C01) Practice Quiz

A static, dependency-free quiz web app for studying for the AWS Certified Machine Learning Engineer - Associate exam.

## Features

- Overview of the certification and its exam domains (with weights)
- **Mode 1 – 30-question quiz:** random questions, weighted like the real exam domains
- **Mode 2 – Practice by topic:** choose one or more domains (10, 20 or all questions)
- **Mode 3 – All questions:** the whole bank in random order
- Immediate feedback with an explanation after every answer
- Results with per-domain breakdown, review of missed questions and "retry missed"
- Keyboard shortcuts (`1`–`4` to answer, `Enter` for next), light/dark mode, mobile friendly
- 100+ questions in `js/questions.js`

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Host on GitHub Pages

1. Push this folder to a GitHub repository (either as the repo root or as a subfolder).
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select your branch and the `/ (root)` folder, and save.
4. The app is served at `https://<user>.github.io/<repo>/` (append `aws-certified-machine-learning-engineer-associate/` if it lives in a subfolder).

All paths are relative, so it works from any subpath. `.nojekyll` disables Jekyll processing.

## Adding questions

Append objects to `QUESTIONS` in `js/questions.js`:

```js
{ d: "security", q: "Question text?", o: ["Correct", "Wrong", "Wrong", "Wrong"], a: 0, e: "Explanation." }
```

`d` is one of the domain ids defined in `DOMAINS`; `a` is the index of the correct option (options are shuffled when displayed).

> Unofficial study aid, not affiliated with or endorsed by Amazon Web Services.
