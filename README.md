# YAMAL 304 — The Lamine Yamal Quiz

A normal, phone-friendly trivia game about **Lamine Yamal**. Ten questions per game, 60 seconds per question, explanations after every answer, best score saved on the device, and a built-in QR code to share the live quiz.

**Live quiz:** https://gopi-gith.github.io/yamal-304-quiz/

**Printable answer key:** https://gopi-gith.github.io/yamal-304-quiz/YAMAL-304-Answer-Key.pdf

The in-game **SHARE / QR** button generates a QR for the current URL. No build step.

## How it works

- 10 questions per game: 4 easy + 4 medium + 2 tough, drawn from a 32-question bank.
- Answer with a tap/click, or keys `1` / `2` / `3` / `4` (also `A`–`D`).
- 60-second timer per question. `Enter` advances after an answer.
- One point per correct answer. Personal best is stored in `localStorage`.
- Results screen with rank, accuracy, best streak, and a full answer review.
- Facts checked **2027**.

## Deploy on GitHub Pages

Everything is static — no build step.

1. Push all files to the `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose **main** and **/ (root)**, then Save.
4. Open the live URL.
5. Tap **SHARE / QR** in the game. The QR points at that live URL. Show it to friends.

The live copy is already deployed at:
**https://gopi-gith.github.io/yamal-304-quiz/**

### QR / sharing

- The **SHARE / QR** button opens a modal with a client-side QR code of the live page (`qrcode.min.js`).
- On the results screen, **SHARE SCORE** uses the native share sheet or copies a score message to the clipboard.
- For a printable poster, scan the in-game QR once the site is live, or generate a QR for `https://YOUR-USERNAME.github.io/YOUR-REPO/` with any QR generator and print it.

## Run locally

A local server is recommended so the browser can load the QR library and handle clipboard features normally:

```sh
cd this-folder
ruby -run -e httpd . -p 8000
# open http://localhost:8000/
```

Opening `index.html` directly also loads the quiz, but clipboard/QR behavior may be limited by browser file:// rules.

## Files

- `index.html` — UI/CSS and screens
- `app.js` — quiz logic, timer, review, QR/share
- `questions.js` — shared 32-question bank (used by the game and the answer key)
- `answers.html` — printable quiz-master answer key with a QR to the live quiz
- `YAMAL-304-Answer-Key.pdf` — ready-to-print PDF of the answer key
- `qrcode.min.js` — QR generator (vendored, works offline)
- `icon.svg`, `manifest.json` — phone install icon / metadata
- `.nojekyll` — static hosting hint

Fan-made quiz. Not affiliated with Lamine Yamal, FC Barcelona, or any league.

## Printable answer key

Open `answers.html` (also linked as **ANSWER KEY** on the start screen) and press **PRINT / SAVE PDF**. It lists every question in the bank with the correct answer and a short explanation, plus a QR code to the live quiz. A ready-made PDF is included as `YAMAL-304-Answer-Key.pdf`.
