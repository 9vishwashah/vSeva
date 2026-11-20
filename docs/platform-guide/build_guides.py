# Builds the two role guides from guide.html: captain-guide.html / sevak-guide.html and their PDFs.
#   python build_guides.py
# Pages are taken from guide.html by id (so edits there flow through), with role-specific pages added here.
# Both guides start with installing the Android app from Google Play.
import pathlib, re, shutil, subprocess

here = pathlib.Path(__file__).parent
src = (here / 'guide.html').read_text(encoding='utf-8')
head = src.split('<body>')[0]
pages = {m.group(2): m.group(1) for m in re.finditer(r'(<section class="page" id="([^"]+)".*?</section>)', src, re.S)}

PLAY_URL = 'https://play.google.com/store/apps/details?id=in.vjas.vseva'
PLAY_ICON = ('<svg viewBox="0 0 24 24" style="width:8mm;height:8mm;flex:none" aria-hidden="true">'
             '<path fill="#00A0FF" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z"/>'
             '<path fill="#00D26A" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z"/>'
             '<path fill="#FFC107" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z"/>'
             '<path fill="#F4433A" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></svg>')
FOOT = '<div class="foot"><img class="vjas" src="assets/vjas-wordmark.jpg" alt="VJAS"><span>vSeva · {label}</span><img class="vseva" src="assets/vseva-logo.png" alt="vSeva"></div>'


def install_page(last_step):
    return f'''<section class="page" id="install">
  <div class="run"><span>Start here</span><span class="pg"></span></div>
  <h1>Install the<em>vSeva app.</em></h1>
  <p class="intro">Start with the vSeva app from the <b>Google Play Store</b>.</p>
  <div class="card" style="flex-direction:row; align-items:center; gap:3mm;">
    {PLAY_ICON}
    <div style="flex:1"><p class="small" style="font-family:var(--mono); font-size:6.4pt; letter-spacing:.1em; color:var(--muted)">GET IT ON GOOGLE PLAY</p>
    <h3>vSeva – Vihar Seva Management</h3><p class="small" style="color:var(--muted)">Scan the QR to open it</p></div>
    <img src="assets/qr-play-store.svg" alt="QR code for vSeva on Google Play" style="width:19mm; height:19mm; flex:none">
  </div>
  <div style="display:grid; grid-template-columns: 1fr auto; gap:4mm; align-items:start;">
    <div class="stack" style="gap:2.6mm">
      <div class="step"><span class="dot">1</span><div><h3>Open Play Store</h3><p>On your Android phone, open <b>Google Play Store</b>.</p></div></div>
      <div class="step"><span class="dot">2</span><div><h3>Search “vSeva”</h3><p>Or scan the QR. Look for <b>vSeva – Vihar Seva Management</b>.</p></div></div>
      <div class="step"><span class="dot">3</span><div><h3>Install, then Open</h3><p>Tap <span class="ui">Install</span>, then <span class="ui">Open</span>. Allow notifications.</p></div></div>
      <div class="step"><span class="dot">4</span><div>{last_step}</div></div>
    </div>
    <div class="fig"><div class="android" style="height:72mm"><img src="assets/play-store-listing.png" alt="vSeva on the Google Play Store"></div><p class="cap"><b>vSeva</b> on Google Play</p></div>
  </div>
  <div class="card" style="gap:2mm;">
    <div class="row"><h3>On an iPhone? Use Safari</h3><span class="tag soft">iPhone / iPad</span></div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:2mm 4mm;">
      <div class="step" style="grid-template-columns:5.5mm 1fr; gap:2mm"><span class="dot" style="width:5.5mm;height:5.5mm;font-size:7pt">1</span><p class="small">Open <b>vseva.vjas.in</b> in <b>Safari</b></p></div>
      <div class="step" style="grid-template-columns:5.5mm 1fr; gap:2mm"><span class="dot" style="width:5.5mm;height:5.5mm;font-size:7pt">2</span><p class="small">Tap <b>Share</b> (square with arrow ↑)</p></div>
      <div class="step" style="grid-template-columns:5.5mm 1fr; gap:2mm"><span class="dot" style="width:5.5mm;height:5.5mm;font-size:7pt">3</span><p class="small">Tap <b>Add to Home Screen</b>, then <b>Add</b></p></div>
      <div class="step" style="grid-template-columns:5.5mm 1fr; gap:2mm"><span class="dot" style="width:5.5mm;height:5.5mm;font-size:7pt">4</span><p class="small">Open <b>vSeva</b> from your Home Screen</p></div>
    </div>
  </div>
  <p class="note"><b>Notifications on:</b> they bring Upcoming Vihar alerts, approvals, reminders and birthday wishes.</p>
  {{FOOT}}
</section>'''


CAPTAIN_APPROVALS = '''<section class="page" id="approvals">
  <div class="run"><span>Approvals</span><span class="pg"></span></div>
  <h1>Approve your<em>Sevaks' Vihars.</em></h1>
  <p class="intro">A Vihar submitted by a Sevak waits for you. It counts in the group's numbers only after you approve it.</p>
  <svg viewBox="0 0 117 40" style="width:117mm; height:40mm" aria-label="Submitted, Pending, Approved or Rejected">
    <g font-family="Schibsted Grotesk, Arial" font-weight="800" font-size="3.6">
      <rect x="0" y="13" width="30" height="13" rx="2.4" fill="#fff" stroke="#1F1A17" stroke-width=".4"/><text x="15" y="21" text-anchor="middle" fill="#1F1A17">Sevak submits</text>
      <line x1="30" y1="19.5" x2="36" y2="19.5" stroke="#DE6B38" stroke-width=".6"/><polygon points="36,18 39,19.5 36,21" fill="#DE6B38"/>
      <rect x="39" y="13" width="38" height="13" rx="2.4" fill="#FFF2D2"/><text x="58" y="18.6" text-anchor="middle" fill="#8A5A00">Pending</text><text x="58" y="22.8" text-anchor="middle" font-family="Instrument Sans, Arial" font-weight="500" font-size="2.6" fill="#8A5A00">waiting for you</text>
      <line x1="77" y1="19.5" x2="83" y2="8" stroke="#DE6B38" stroke-width=".6"/><line x1="77" y1="19.5" x2="83" y2="31" stroke="#DE6B38" stroke-width=".6"/>
      <rect x="83" y="1" width="34" height="13" rx="2.4" fill="#E5F3EA"/><text x="100" y="6.6" text-anchor="middle" fill="#2F7D4F">Approved</text><text x="100" y="10.8" text-anchor="middle" font-family="Instrument Sans, Arial" font-weight="500" font-size="2.6" fill="#2F7D4F">counts everywhere</text>
      <rect x="83" y="25" width="34" height="13" rx="2.4" fill="#FBE7E4"/><text x="100" y="30.6" text-anchor="middle" fill="#A93226">Rejected</text><text x="100" y="34.8" text-anchor="middle" font-family="Instrument Sans, Arial" font-weight="500" font-size="2.6" fill="#A93226">Sevak is notified</text>
    </g>
  </svg>
  <div class="stack" style="gap:3.4mm">
    <div class="step"><span class="dot">1</span><div><h3>Open Pending Approvals</h3><p><span class="ui">More → Pending Approvals</span>. You are also notified when one arrives.</p></div></div>
    <div class="step"><span class="dot">2</span><div><h3>Check the entry</h3><p>Route, date, Sadhu / Sadhvi and the Sevaks on it.</p></div></div>
    <div class="step"><span class="dot">3</span><div><h3>Decide</h3><p><span class="ui">Approve</span>, <span class="ui">Edit Entry</span> to correct it, or <span class="ui">Reject</span>. A rejection notifies the Sevak who submitted it.</p></div></div>
  </div>
  <p class="note"><b>Your own entries</b> (New Entry) count straight away; they need no approval.</p>
  {FOOT}
</section>'''

SEVAK_SUBMIT = '''<section class="page" id="submit">
  <div class="run"><span>Submit for approval</span><span class="pg"></span></div>
  <h1>Submit a Vihar<em>for approval.</em></h1>
  <p class="intro">Every Vihar a Sevak records goes to the Captain first. It counts in your numbers once the Captain approves it.</p>
  <div style="display:grid; grid-template-columns: 1fr 42mm; gap:5mm; align-items:start;">
    <div class="stack" style="gap:3.2mm">
      <div class="step"><span class="dot">1</span><div><h3>Submit Entry</h3><p>Fill the four steps and tap <span class="ui">Submit Entry</span>. One Sevak submits for everyone who walked.</p></div></div>
      <div class="step"><span class="dot">2</span><div><h3>Sent to your Captain</h3><p>In <span class="ui">My Vihars</span> it shows <span class="tag amber">Pending captain approval</span>.</p></div></div>
      <div class="step"><span class="dot">3</span><div><h3>Captain approves</h3><p>It now counts in your <b>Stats</b>, <b>Sankalp</b> and rank, for every Sevak on it.</p></div></div>
      <div class="step"><span class="dot">4</span><div><h3>If it is rejected</h3><p>You get a notification. Check the details with your Captain.</p></div></div>
    </div>
    <div class="fig"><div class="droid" style="width:42mm; height:84mm"><img src="assets/screens/64-my-vihars.jpg" alt="My Vihars with a pending entry"></div><p class="cap"><b>My Vihars</b> with a pending entry</p></div>
  </div>
  <p class="note"><b>Still pending?</b> Remind your Captain. Please don't submit the same Vihar again.</p>
  {FOOT}
</section>'''


SEVAK_NOTIFY = """<section class="page" id="notify">
  <div class="run"><span>Notifications</span><span class="pg"></span></div>
  <h1>Get updates<em>via notifications.</em></h1>
  <p class="intro">vSeva tells you what is happening in your group, right on your phone, even when the app is closed.</p>
  <div class="fig"><img src="assets/reminder-preview.jpg" alt="A Vihar reminder notification on an Android phone" style="width:66mm; border-radius:4mm; box-shadow:0 2mm 5mm rgba(60,30,10,.18)"><p class="cap"><b>A Vihar reminder</b> as it arrives on the phone</p></div>
  <div class="stack" style="gap:1.8mm">
    <div class="card"><div class="row"><h3>Upcoming Vihar alerts</h3><span class="tag soft">Instantly</span></div><p class="small">Your Captain announces the date, time and route. Tap <b>I'm Interested</b> to join.</p></div>
    <div class="card"><div class="row"><h3>Vihar reminders</h3><span class="tag soft">9 AM</span></div><p class="small">A gentle nudge when you have not done a Vihar for a few days.</p></div>
    <div class="card"><div class="row"><h3>Birthday wishes</h3><span class="tag soft">8 AM</span></div><p class="small">Whose birthday it is today in your group, so you can send wishes.</p></div>
    <div class="card"><div class="row"><h3>Your Vihars and VChat</h3><span class="tag soft">As it happens</span></div><p class="small">When your Captain records a Vihar with you in it, a submission is not approved, or a new VChat message arrives.</p></div>
  </div>
  <p class="note"><b>Turn them on:</b> Profile → Push Notifications → Enable, and allow vSeva in your phone settings. Tap a notification to open the right screen.</p>
  {FOOT}
</section>"""

# Sevak Guide only: "Record a Vihar" and "Submit for approval" are one flow for a Sevak, so they share one name
SEVAK_FIXES = {
    'record': [('<span>Record a Vihar</span>', '<span>Submit a Vihar</span>'),
               ('Record a Vihar<em>steps 1–2</em>', 'Submit a Vihar<em>steps 1–2</em>'),
               ('Sevaks: <span class="ui">Add Vihar</span> on Home. Captain: <span class="ui">New Entry</span>. The same form for both.',
                'Tap <span class="ui">Add Vihar</span> on Home and fill four short steps. Then it goes to your Captain for approval.')],
    'record-2': [('<span>Record a Vihar</span>', '<span>Submit a Vihar</span>'),
                 ('Record a Vihar<em>steps 3–4</em>', 'Submit a Vihar<em>steps 3–4</em>')],
    'submit': [('<span>Submit for approval</span>', '<span>After you submit</span>'),
               ('Submit a Vihar<em>for approval.</em>', 'After you<em>submit.</em>')],
    'stats': [('<span>Statistics</span>', '<span>See your Seva</span>'),
              ('Reading your<em>numbers.</em>', 'See your<em>Seva.</em>')],
    # the notifications list moved to its own page, so the contacts screenshot gets the room
    'contact': [('grid-template-columns: 44mm 1fr; gap:5mm; align-items:start;">\n    <div class="fig"><div class="droid" style="width:44mm; height:88mm"><img src="assets/screens/69-sevak-contacts.jpg"',
                 'grid-template-columns: 62mm 1fr; gap:5mm; align-items:start;">\n    <div class="fig"><div class="droid" style="height:126mm"><img src="assets/screens/69-sevak-contacts.jpg"'),
                ('\n  <div class="card">\n    <h3>You are notified when</h3>\n    <ul style="margin:1mm 0 0; padding-left:4.5mm; font-size:9pt; color:var(--ink-2); display:flex; flex-direction:column; gap:1mm;">\n      <li>an upcoming Vihar is announced</li>\n      <li>your Captain records a Vihar with you in it</li>\n      <li>a submission is not approved, or one awaits the Captain</li>\n      <li>there is a new VChat message</li>\n      <li>you have had no Vihar for several days</li>\n    </ul>\n  </div>', ''), ('\n  <p class="note"><b>Phone alerts:</b> Profile → Push Notifications, and allow notifications for vSeva in your phone settings.</p>', ''),
                ('<p class="small">The bell shows alerts. Tap one to open the right screen.</p>', '<p class="small">The bell shows alerts. See the previous page for what you are notified about.</p>')],
}
SEVAK_TITLES = {'record': 'Submit a Vihar', 'record-2': 'Submit a Vihar (3–4)', 'submit': 'After you submit',
                'stats': 'See your Seva', 'notify': 'Get updates via notifications'}

TITLES = {
    'install': 'Install the vSeva app', 'glance': 'What vSeva does', 'roles': 'Roles in a group',
    'setup': 'Getting started', 'setup-screens': 'The first two screens', 'captain': 'Captain guide',
    'approvals': 'Approve Vihars', 'sevak': 'Your first sign-in', 'profile': 'Complete your profile',
    'sevak-nav': 'Finding your way', 'record': 'Record a Vihar', 'record-2': 'Record a Vihar (3–4)',
    'submit': 'Submit for approval', 'stats': 'Your statistics', 'sankalp': 'Sankalp & Vihar Year',
    'tools': 'Captain tools', 'contact': 'Seamless Contact', 'sharing': 'Records & sharing',
    'community': 'Community', 'faq': "FAQ's", 'support': 'Support',
}


def common_fixes(html):
    rep = [
        # Play Store first: no web-app instructions in the steps
        ('<h3>Open vSeva</h3><p>The Android app, or <b>vseva.vjas.in</b> in your browser.</p>',
         '<h3>Open the app</h3><p>Open <b>vSeva</b>, installed from Google Play.</p>'),
        ('<h3>Apply</h3><p>On the sign-in screen tap <span class="ui">Create Captain Account</span>',
         '<h3>Apply in the app</h3><p>Open vSeva and, on the sign-in screen, tap <span class="ui">Create Captain Account</span>'),
        ('Share the login shown, in one tap on WhatsApp.</p>',
         'Share the login on WhatsApp in one tap; they install vSeva from Google Play.</p>'),
        ('In the app, pick where to send the file in the share sheet. On the web, check Downloads.',
         'Pick where to send the file in the share sheet that opens.'),
        ('<h3>Installing on iPhone?</h3>', '<h3>Using an iPhone?</h3>'),
        # profile now asks for date of birth instead of age
        ('Blood group · Age ·', 'Blood group · Date of birth ·'),
        # support page: Play Store QR and the new Instagram
        ('<a href="https://vseva.vjas.in" style="text-decoration:none;', f'<a href="{PLAY_URL}" style="text-decoration:none;'),
        ('<img src="assets/qr-vseva-site.svg" alt="QR code for vseva.vjas.in"', '<img src="assets/qr-play-store.svg" alt="QR code for vSeva on Google Play"'),
        ('Website · vseva.vjas.in</span>', 'Android App · Google Play</span>'),
        ('https://www.instagram.com/the.vseva/', 'https://www.instagram.com/vseva.app'),
        ('<img src="assets/qr-instagram.png" alt="QR code for Instagram @the.vseva"', '<img src="assets/qr-instagram-vseva-app.svg" alt="QR code for Instagram @vseva.app"'),
        ('Instagram · @the.vseva', 'Instagram · @vseva.app'),
        ('October 2026', 'November 2026'),
        ('A practical, step-by-step guide to the vSeva app and website.', 'A practical, step-by-step guide to the vSeva app.'),
    ]
    for a, b in rep:
        html = html.replace(a, b)
    return html


def build(role, label, order, extra, cover_title, prepared_for, subtitle, headline, fixes=None, titles=None, public_name=None):
    total = len(order)
    titles = {**TITLES, **(titles or {})}
    out = []
    for i, pid in enumerate(order, 1):
        html = extra.get(pid) or pages[pid]
        html = common_fixes(html)
        for a, b in (fixes or {}).get(pid, []):
            html = html.replace(a, b)
        html = html.replace('{FOOT}', FOOT.format(label=label))
        html = re.sub(r'<span class="pg">[^<]*</span>', f'<span class="pg">{i:02d} / {total:02d}</span>', html)
        html = html.replace('<span>vSeva · App Guide</span>', f'<span>vSeva · {label}</span>')
        html = html.replace('vSeva · App Guide · 21 / 21', f'vSeva · {label} · {total} / {total}')
        if pid == 'cover':
            html = html.replace('APP GUIDE &amp; USER MANUAL', cover_title)
            html = html.replace('CAPTAINS · SEVAKS · VIHAR SEVA GROUPS', subtitle)
            html = html.replace('Vihar Seva Groups, Captains &amp; Sevaks', prepared_for)
            # role headline; "Every Step Counts." becomes the saffron line under it
            html = html.replace('font-size:40pt; line-height:.98;', 'font-size:31pt; line-height:1;')
            html = html.replace('Every Step<br>Counts<span style="color:var(--saffron)">.</span>', headline)
            html = html.replace('Your Vihar Seva, in one app.', 'Every Step Counts.')
            if role == 'sevak':
                html = html.replace("Record every Vihar, look after your Sevaks and follow your group's Sankalp, from your phone.",
                                    'Record your Vihars, follow your Sankalp and share your Seva to inspire others, from your phone.')
        if pid == 'welcome':
            toc = ''.join(f'<a href="#{p}"><span>{n:02d}</span><span>{titles[p]}</span><span>{n}</span></a>'
                          for n, p in enumerate(order, 1) if p in titles)
            html = re.sub(r'<div class="toc">.*?</div>', f'<div class="toc">{toc}</div>', html, flags=re.S)
        out.append(html)
    doc = head.replace('<title>vSeva App Guide &amp; User Manual</title>', f'<title>vSeva {label}</title>')
    doc += '<body>\n\n' + '\n\n'.join(out) + '\n\n</body>\n</html>\n'
    html_path = here / f'{role}-guide.html'
    html_path.write_text(doc, encoding='utf-8')
    pdf_path = here / f'vSeva {label}.pdf'
    subprocess.run([r'C:\Program Files\Google\Chrome\Application\chrome.exe', '--headless=new', '--disable-gpu',
                    '--no-pdf-header-footer', '--virtual-time-budget=15000', f'--print-to-pdf={pdf_path}',
                    html_path.as_uri()], check=True, capture_output=True)
    # publish to the website at a fixed address (brands/vseva/site/content.ts GUIDES): the link never changes
    public = here.parent.parent / 'public' / 'vseva-site'
    shutil.copyfile(pdf_path, public / (public_name or f'vSeva-{label.replace(" ", "-")}.pdf'))
    if role == 'captain':  # the old combined-guide address, still in shared links, now serves the Captain Guide
        shutil.copyfile(pdf_path, public / 'vSeva-App-Guide.pdf')
    print(role, total, 'pages ->', pdf_path.name, '+ public/vseva-site/')


build('captain', 'Captain Guide',
      ['cover', 'welcome', 'install', 'glance', 'roles', 'setup', 'setup-screens', 'captain', 'approvals',
       'record', 'record-2', 'stats', 'sankalp', 'tools', 'contact', 'sharing', 'community', 'faq', 'support'],
      {'install': install_page('<h3>Create Captain Account</h3><p>Tap <span class="ui">Create Captain Account</span> and send your group\'s details (next pages).</p>'),
       'approvals': CAPTAIN_APPROVALS},
      'CAPTAIN GUIDE', 'Vihar Captain &amp; Vice Captain', 'FOR CAPTAINS &amp; VICE CAPTAINS',
      'Manage Your<br>Vihar Sevak<br>Records<span style="color:var(--saffron)">.</span>')

# Sevak Quick Guide: cover + 4 pages, no contents page, in English and Hinglish (text in quick_guide.py).
# They keep the website addresses the Sevak guide links already use.
from quick_guide import EN, HINGLISH, ORDER as QUICK_ORDER, pages as quick_pages
TAGLINE = '<em style="font-size:22pt; line-height:1.15; margin-top:2mm;">Your Vihar Seva, in one app.</em>'  # becomes "Every Step Counts."
LONG_LEDE = "Record every Vihar, look after your Sevaks and follow your group's Sankalp, from your phone."
for t, role, public_name in [(EN, 'sevak-quick', 'vSeva-Sevak-Guide.pdf'), (HINGLISH, 'sevak-quick-hinglish', 'vSeva-Sevak-Guide-Hinglish.pdf')]:
    build(role, t['label'], QUICK_ORDER, quick_pages(t, PLAY_ICON),
          t['cover_title'], t['prepared_for'], t['cover_sub'], t['cover_head'],
          fixes={'cover': [(LONG_LEDE, t['cover_lede'])] + ([(TAGLINE, '')] if t.get('no_tagline') else [])}, public_name=public_name)
