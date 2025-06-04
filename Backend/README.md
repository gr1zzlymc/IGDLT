# CtrlV Instagram Proxy

Turns a **public** Instagram post URL into direct CDN image links – now powered by [instaloader](https://github.com/instaloader/instaloader).

## Local test

```bash
npm install
npm start
# open http://localhost:3000/api/ig?link=https://www.instagram.com/p/Cv5tmDXKfTI/
```

Make sure Python and `instaloader` are available. The install script will automatically
run `pip install --user instaloader`.
