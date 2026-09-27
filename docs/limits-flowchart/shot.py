import os, sys
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'out.png')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': 3840, 'height': 2160})
    pg.goto('file://' + os.path.join(here, 'limits.html'))
    pg.wait_for_timeout(300)
    # report overflowing cards
    print(pg.evaluate('''[...document.querySelectorAll('.card')].map(c=>{const b=c.querySelector('.cb');return [c.querySelector('.ct').textContent, c.clientHeight, b.scrollHeight+c.querySelector('.ch').offsetHeight]}).filter(r=>r[2]>r[1])'''))
    pg.screenshot(path=out)
    b.close()
