# DebateResearcher

Find **sources** and **copy-ready debate block text** for any topic — in any language.

## What it does

1. **Detects language** from your topic (or you can pick one)
2. **Pulls from authoritative sources:**
   - **Wikipedia** & **Britannica** (encyclopedia entries + Pro/Con pages)
   - **Stanford, Harvard, Yale, Cornell** (academic papers via OpenAlex)
   - **Brookings Institution** & **Pew Research Center** (policy research)
   - Reference abstracts and related topics
3. **Fetches full page content** — not just one-line snippets
4. **Builds rich debate blocks:** overview, 8–12 affirmative points, 8–12 opposition points, statistics, and a full speech block with bibliography

## Quick start

```bash
cd ~/Projects/debateresearcher
pip3 install -r requirements.txt
python3 app.py
```

Open **http://debateresearcher.localhost:5050** in Chrome (or any browser).

Type that exact address in the URL bar — no Google search, just paste and press Enter.

### Quick start (opens browser automatically)

```bash
cd ~/Projects/debateresearcher
chmod +x scripts/start.sh
./scripts/start.sh
```

Or manually:

```bash
pip3 install -r requirements.txt
python3 app.py
```

Then open: **http://debateresearcher.localhost:5050**

> `debateresearcher.localhost` works in Chrome, Safari, and Firefox without any setup — browsers treat `*.localhost` as your computer automatically.

## Example topics

- `Should social media be regulated by governments?`
- `Should universal basic income be implemented?`
- `人工智能是否应该拥有法律人格？`
- `Le nucléaire est-il l'avenir de l'énergie ?`

## Notes

- Sources come from Wikipedia, Britannica, OpenAlex (university research), Pew/Brookings APIs, and reference databases.
- Always verify sources before competition use.
- No API keys required.


## Local setup note

Cloned and verified push access on 2026-10-02.
