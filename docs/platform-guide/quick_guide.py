# The Sevak Quick Guide (cover + 7 short pages, no contents page) in English and Hinglish.
# Used by build_guides.py; edit the text in EN / HINGLISH below and run build_guides.py again.

APPLE_ICON = ('<svg viewBox="0 0 24 24" style="width:6mm;height:6mm;flex:none" fill="#1F1A17" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>')
INSTA_ICON = ('<svg viewBox="0 0 24 24" style="width:7mm;height:7mm;flex:none" aria-hidden="true"><defs><radialGradient id="ig" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#fdf497"/><stop offset=".45" stop-color="#fd5949"/><stop offset=".6" stop-color="#d6249f"/><stop offset=".9" stop-color="#285AEB"/></radialGradient></defs>'
              '<rect width="24" height="24" rx="6" fill="url(#ig)"/><rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="16.6" cy="7.4" r="1.1" fill="#fff"/></svg>')

EN = {
    'label': 'Sevak Quick Guide',
    'cover_title': 'SEVAK QUICK GUIDE',
    'cover_sub': 'FOR SEVAKS &amp; SEVIKAS · SIMPLE STEPS',
    'cover_head': 'See Your<br>Seva Stats &amp;<br>Inspire More<span style="color:var(--saffron)">.</span>',
    'cover_lede': 'Install the app, complete your profile, set your Sankalp, submit Vihars and share your Seva.',
    'prepared_for': 'Vihar Sevaks',
    # install
    'p1_run': 'Step 1', 'p1_h1': 'Install &amp;<em>sign in.</em>',
    'android': 'Android phone',
    'a1': 'Open <b>Google Play Store</b>, search <b>vSeva</b>',
    'a2': 'Tap <span class="ui">Install</span>, then <span class="ui">Open</span>',
    'a3': 'Allow notifications when asked',
    'qr_android': 'Scan to install',
    'iphone': 'iPhone / iPad',
    'i1': 'Open <b>vseva.vjas.in</b> in <b>Safari</b>',
    'i2': 'Tap <b>Share ↑</b> → <b>Add to Home Screen</b>',
    'i3': 'Open <b>vSeva</b> from your Home Screen',
    'qr_iphone': 'Scan to open vseva.vjas.in',
    'signin': 'Sign in',
    's1': '<b>Username:</b> sent by your Captain on WhatsApp',
    's2': '<b>Password:</b> your mobile number',
    's3': 'Forgot it? Tap <b>Forgot Password?</b> Your Captain resets it.',
    'login_cap': '<b>Sign in</b> screen',
    'notif_note': '<b>Said “Don’t allow” to notifications?</b> Phone Settings → Apps → vSeva → Notifications → On.',
    # profile + sankalp
    'p2_run': 'Steps 2 &amp; 3', 'p2_h1': 'Profile &amp;<em>Sankalp.</em>',
    'prof_h': '2 · Complete your profile',
    'prof_items': ['<b>Profile photo</b> (tap the camera on your photo)', '<b>Date of birth</b>', '<b>Blood group</b>',
                   '<b>Family emergency contact name</b>', '<b>Family emergency number</b>', '<b>Occupation</b>', '<b>Address</b>'],
    'prof_cap': 'The <b>ring</b> fills to 100%',
    'prof_note': '<b>Why it matters:</b> in an emergency, your group can call your family quickly.',
    'sank_h': '3 · Set your yearly Sankalp',
    'k1': 'Right after you sign in, vSeva asks: <b>Set your Sankalp</b>',
    'k2': 'Enter how many Vihars you pledge this Vihar Year, or tap <b>5, 12, 25</b> or <b>50</b>',
    'k3': 'Tap <span class="ui">Save Sankalp</span>. The ring on Home shows your progress',
    'sank_cap': 'The <b>Sankalp</b> pop-up',
    # vihar entry (screens)
    'p3_run': 'Step 4', 'p3_h1': 'Submit a<em>Vihar entry.</em>',
    'p3_intro': 'After a Vihar, tap <span class="ui">Add Vihar</span> on Home and fill four short steps.',
    'v1': 'Date &amp; type', 'v1t': 'Today by default; Morning or Evening.',
    'v2': 'Vihar of &amp; route', 'v2t': 'Sadhu / Sadhvi count, From and To. Distance fills itself.',
    'v3': 'Sevaks', 'v3t': 'Add every Sevak who walked. Wheelchair / Car Seva if any.',
    'v4': 'Submit', 'v4t': 'Samuday and notes if you like, then <span class="ui">Submit Entry</span>.',
    # after submit
    'p4_run': 'Step 4', 'p4_h1': 'After you<em>submit.</em>',
    'one_h': 'One Vihar = one entry',
    'one_t': 'Only <b>one Sevak</b> submits it, for everyone who walked. Others should not submit it again.',
    'flow': ['Submitted', 'Pending', 'with Captain', 'Approved', 'counts in stats', 'Rejected', 'you are notified'],
    'pend_t': 'Until your Captain approves it, <span class="ui">My Vihars</span> shows <span class="tag amber">Pending captain approval</span>.',
    'pend_cap': '<b>My Vihars</b> with a pending entry',
    'wrong_note': '<b>Wrong entry?</b> Tell your Captain; they can edit it. <b>Pending for long?</b> Remind your Captain.',
    # notifications
    'n_run': 'Notifications', 'n_h1': 'Get updates<em>via notifications.</em>',
    'n_intro': 'vSeva tells you what is happening in your group, right on your phone, even when the app is closed.',
    'n_cap': '<b>A Vihar reminder</b> as it arrives on the phone',
    'n1': 'Upcoming Vihar alerts', 'n1g': 'Instantly', 'n1t': 'Your Captain announces the date, time and route. Tap <b>I\'m Interested</b> to join.',
    'n2': 'Vihar reminders', 'n2g': '9 AM', 'n2t': 'A gentle nudge when you have not done a Vihar for a few days.',
    'n3': 'Birthday wishes', 'n3g': '8 AM', 'n3t': 'Whose birthday it is today in your group, so you can send wishes.',
    'n4': 'Your Vihars and VChat', 'n4g': 'As it happens', 'n4t': 'When your Captain records a Vihar with you in it, a submission is not approved, or a new VChat message arrives.',
    'n_note': '<b>Turn them on:</b> Profile → Push Notifications → Enable, and allow vSeva in your phone settings. Tap a notification to open the right screen.',
    # contacts
    'c_run': 'Contacts', 'c_h1': 'Connect with Sevaks,<em>reach out instantly.</em>',
    'c_cap': '<b>More → Contacts</b>',
    'c1': 'Emergency contacts', 'c1t': 'Added by your Captain, shown to every Sevak.',
    'c2': 'Sevak directory', 'c2t': 'Search a name, then tap <b>WhatsApp</b> or <b>Call</b>.',
    'c3': 'One tap', 'c3t': 'Green <b>WhatsApp</b> on the left, blue <b>Call</b> on the right.',
    # share + support
    'p5_run': 'Step 5', 'p5_h1': 'Share your<em>Seva card.</em>',
    'p5_intro': 'Your Vihars, kilometres and Sankalp on a card: share it and inspire others.',
    'h1s': 'On Home, tap this badge next to <b>Your Stats</b>:',
    'h2s': 'Choose a card: <b>Vihars, Distance, Sankalp</b> or <b>Year</b>',
    'h3s': '<b>Story 9:16</b> for Status, <b>Square 1:1</b> for posts',
    'h4s': 'Tap <span class="ui">Share</span> → <b>WhatsApp</b> → My Status or a group. Or ⬇ to save.',
    'share_cap': '<b>Share your Seva</b>',
    'support': 'Technical Support',
    'play_label': 'Get vSeva on<br><b>Google Play</b>',
    'insta': 'Follow us on Instagram',
    'insta_t': 'Updates, Seva stories and new features.',
}

HINGLISH = {
    'label': 'Sevak Quick Guide (Hinglish)',
    'no_tagline': True,  # no "Every Step Counts." line under the cover title
    'cover_title': 'SEVAK QUICK GUIDE',
    'cover_sub': 'SEVAKS AUR SEVIKAS KE LIYE · AASAAN STEPS',
    'cover_head': '<span style="font-size:26pt">Apne Vihar ka<br>Record Dekhein &amp;<br>Sabko Inspire Karein<span style="color:var(--saffron)">.</span></span>',
    'cover_lede': 'App install karein, profile poori karein, Sankalp set karein, Vihar submit karein aur apni Seva share karein.',
    'prepared_for': 'Vihar Sevaks',
    'p1_run': 'Step 1', 'p1_h1': 'Install karein &amp;<em>sign in karein.</em>',
    'android': 'Android phone',
    'a1': '<b>Google Play Store</b> kholein, <b>vSeva</b> search karein',
    'a2': '<span class="ui">Install</span> dabayein, phir <span class="ui">Open</span>',
    'a3': 'Notifications ki permission dein',
    'qr_android': 'Scan karke install karein',
    'iphone': 'iPhone / iPad',
    'i1': '<b>Safari</b> mein <b>vseva.vjas.in</b> kholein',
    'i2': '<b>Share ↑</b> → <b>Add to Home Screen</b> dabayein',
    'i3': 'Home Screen se <b>vSeva</b> kholein',
    'qr_iphone': 'Scan karke vseva.vjas.in kholein',
    'signin': 'Sign in',
    's1': '<b>Username:</b> Captain ne WhatsApp par bheja hai',
    's2': '<b>Password:</b> aapka mobile number',
    's3': 'Bhool gaye? <b>Forgot Password?</b> dabayein. Captain reset kar denge.',
    'login_cap': '<b>Sign in</b> screen',
    'notif_note': '<b>Notifications ko “Don’t allow” kar diya?</b> Phone Settings → Apps → vSeva → Notifications → On karein.',
    'p2_run': 'Steps 2 &amp; 3', 'p2_h1': 'Profile &amp;<em>Sankalp.</em>',
    'prof_h': '2 · Apni profile poori karein',
    'prof_items': ['<b>Profile photo</b> (photo par camera dabayein)', '<b>Date of birth</b> (janam tithi)', '<b>Blood group</b>',
                   '<b>Family emergency contact ka naam</b>', '<b>Family emergency number</b>', '<b>Occupation</b> (vyavsay)', '<b>Address</b>'],
    'prof_cap': '<b>Ring</b> 100% tak bharti hai',
    'prof_note': '<b>Kyun zaroori hai:</b> emergency mein group aapki family ko turant call kar sake.',
    'sank_h': '3 · Apna saal ka Sankalp set karein',
    'k1': 'Sign in karte hi vSeva poochta hai: <b>Set your Sankalp</b>',
    'k2': 'Is Vihar Year mein kitne Vihar karenge, woh likhein, ya <b>5, 12, 25</b> ya <b>50</b> dabayein',
    'k3': '<span class="ui">Save Sankalp</span> dabayein. Home par ring aapki progress dikhati hai',
    'sank_cap': '<b>Sankalp</b> pop-up',
    'p3_run': 'Step 4', 'p3_h1': 'Vihar entry<em>submit karein.</em>',
    'p3_intro': 'Vihar ke baad Home par <span class="ui">Add Vihar</span> dabayein aur 4 chhote steps bharein.',
    'v1': 'Date &amp; type', 'v1t': 'Default aaj ki date; Morning ya Evening.',
    'v2': 'Kiska Vihar &amp; route', 'v2t': 'Sadhu / Sadhvi ki sankhya, From aur To. Distance apne aap aati hai.',
    'v3': 'Sevaks', 'v3t': 'Saath chalne wale har Sevak ko add karein. Wheelchair / Car Seva ho to batayein.',
    'v4': 'Submit', 'v4t': 'Samuday aur notes (optional), phir <span class="ui">Submit Entry</span>.',
    'p4_run': 'Step 4', 'p4_h1': 'Submit ke<em>baad.</em>',
    'one_h': 'Ek Vihar = ek entry',
    'one_t': 'Sirf <b>ek Sevak</b> sabke liye submit kare. Baaki log dobara submit na karein.',
    'flow': ['Submit kiya', 'Pending', 'Captain ke paas', 'Approved', 'stats mein judta hai', 'Rejected', 'aapko notification'],
    'pend_t': 'Captain ke approve karne tak <span class="ui">My Vihars</span> mein <span class="tag amber">Pending captain approval</span> dikhta hai.',
    'pend_cap': 'Pending entry ke saath <b>My Vihars</b>',
    'wrong_note': '<b>Galat entry?</b> Captain ko batayein, woh edit kar sakte hain. <b>Kaafi der se pending?</b> Captain ko yaad dilayein.',
    'n_run': 'Notifications', 'n_h1': 'Notifications se<em>updates paayein.</em>',
    'n_intro': 'vSeva aapke group ki har zaroori baat seedhe aapke phone par batata hai, app band hone par bhi.',
    'n_cap': 'Phone par aaya <b>Vihar reminder</b>',
    'n1': 'Aane wale Vihar ke alerts', 'n1g': 'Turant', 'n1t': 'Captain date, time aur route batate hain. Judne ke liye <b>I\'m Interested</b> dabayein.',
    'n2': 'Vihar reminders', 'n2g': 'Subah 9 baje', 'n2t': 'Kuch dino se Vihar nahi kiya to ek yaad dilane wala message.',
    'n3': 'Birthday wishes', 'n3g': 'Subah 8 baje', 'n3t': 'Aaj group mein kiska birthday hai, taaki aap wishes bhej sakein.',
    'n4': 'Aapke Vihar aur VChat', 'n4g': 'Usi samay', 'n4t': 'Jab Captain aisa Vihar darj karein jisme aap hon, aapki entry approve na ho, ya VChat mein naya message aaye.',
    'n_note': '<b>Chalu karein:</b> Profile → Push Notifications → Enable, aur phone settings mein vSeva ki permission dein. Notification dabane par sahi screen khulti hai.',
    'c_run': 'Contacts', 'c_h1': 'Sevaks Se Judein,<em>Turant Sampark Karein.</em>',
    'c_cap': '<b>More → Contacts</b>',
    'c1': 'Emergency contacts', 'c1t': 'Captain add karte hain, har Sevak ko dikhte hain.',
    'c2': 'Sevak directory', 'c2t': 'Naam search karein, phir <b>WhatsApp</b> ya <b>Call</b> dabayein.',
    'c3': 'Ek tap mein', 'c3t': 'Left mein hara <b>WhatsApp</b>, right mein neela <b>Call</b>.',
    'p5_run': 'Step 5', 'p5_h1': 'Apna Seva card<em>share karein.</em>',
    'p5_intro': 'Aapke Vihar, kilometre aur Sankalp ek card par: share karein aur sabko inspire karein.',
    'h1s': 'Home par <b>Your Stats</b> ke paas yeh badge dabayein:',
    'h2s': 'Card chunein: <b>Vihars, Distance, Sankalp</b> ya <b>Year</b>',
    'h3s': 'Status ke liye <b>Story 9:16</b>, post ke liye <b>Square 1:1</b>',
    'h4s': '<span class="ui">Share</span> → <b>WhatsApp</b> → My Status ya group. Ya ⬇ se save karein.',
    'share_cap': '<b>Share your Seva</b>',
    'support': 'Technical Support',
    'play_label': 'vSeva paayein<br><b>Google Play</b> par',
    'insta': 'Follow karein Instagram par',
    'insta_t': 'Updates, Seva stories aur naye features.',
}


def _mini(n, html):
    return (f'<div class="step" style="grid-template-columns:5.5mm 1fr; gap:2mm"><span class="dot" style="width:5.5mm;height:5.5mm;font-size:7pt">{n}</span>'
            f'<p class="small">{html}</p></div>')


def _qr(src, alt, size, label):
    return (f'<div style="display:flex; align-items:center; gap:2mm; margin-top:auto;"><img src="{src}" alt="{alt}" style="width:{size};height:{size}">'
            f'<p class="small" style="font-size:7.4pt">{label}</p></div>')


def pages(t, play_icon):
    run = lambda r: f'<div class="run"><span>{r}</span><span class="pg"></span></div>'

    install = f'''<section class="page" id="q-install">
  {run(t['p1_run'])}
  <h1>{t['p1_h1']}</h1>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:3mm;">
    <div class="card" style="border-color:#1F1A17; gap:2mm;">
      <div style="display:flex; align-items:center; gap:2mm;">{play_icon.replace('width:8mm;height:8mm', 'width:6mm;height:6mm')}<h3>{t['android']}</h3></div>
      {_mini(1, t['a1'])}{_mini(2, t['a2'])}{_mini(3, t['a3'])}
      {_qr('assets/qr-play-store.svg', 'QR code for vSeva on Google Play', '17mm', t['qr_android'])}
    </div>
    <div class="card" style="gap:2mm; background:#F6F3EF; border-color:#D9D2C9;">
      <div style="display:flex; align-items:center; gap:2mm;">{APPLE_ICON}<h3>{t['iphone']}</h3></div>
      {_mini(1, t['i1'])}{_mini(2, t['i2'])}{_mini(3, t['i3'])}
      {_qr('assets/qr-vseva-site.svg', 'QR code for vseva.vjas.in', '17mm', t['qr_iphone'])}
    </div>
  </div>
  <div style="display:grid; grid-template-columns:1fr auto; gap:4mm; align-items:center;">
    <div class="card" style="gap:2.2mm;"><h3>{t['signin']}</h3>{_mini(1, t['s1'])}{_mini(2, t['s2'])}{_mini(3, t['s3'])}</div>
    <div class="fig"><div class="droid" style="height:70mm"><img src="assets/screens/01-login.jpg" alt="Sign in screen"></div><p class="cap">{t['login_cap']}</p></div>
  </div>
  <p class="note">{t['notif_note']}</p>
  {{FOOT}}
</section>'''

    items = ''.join(f'<span>☐ {x}</span>' for x in t['prof_items'])
    profile = f'''<section class="page" id="q-profile">
  {run(t['p2_run'])}
  <h1>{t['p2_h1']}</h1>
  <h3 style="color:var(--saffron-deep)">{t['prof_h']}</h3>
  <div style="display:grid; grid-template-columns:1fr auto; gap:4mm; align-items:center;">
    <div class="card"><div style="display:flex; flex-direction:column; gap:1.5mm; font-size:8.6pt; color:var(--ink-2);">{items}</div></div>
    <div class="fig"><div class="droid" style="height:58mm"><img src="assets/screens/43-profile-ring.jpg" alt="Profile with completion ring"></div><p class="cap">{t['prof_cap']}</p></div>
  </div>
  <p class="note">{t['prof_note']}</p>
  <h3 style="color:var(--saffron-deep); margin-top:1mm">{t['sank_h']}</h3>
  <div style="display:grid; grid-template-columns:1fr 50mm; gap:4mm; align-items:center;">
    <div class="stack" style="gap:2.4mm">{_mini(1, t['k1'])}{_mini(2, t['k2'])}{_mini(3, t['k3'])}</div>
    <div class="fig"><img src="assets/sankalp-popup.png" alt="Set your Sankalp pop-up" style="width:50mm; border-radius:3mm; box-shadow:0 1.5mm 4mm rgba(60,30,10,.18)"><p class="cap">{t['sank_cap']}</p></div>
  </div>
  {{FOOT}}
</section>'''

    shots = ['30-entry-step1.jpg', '33-entry-step2-filled.jpg', '35-entry-step3-selected.jpg', '36-entry-step4.jpg']
    cells = ''.join(
        f'<div class="fig" style="gap:0"><div class="droid" style="height:62mm"><img src="assets/screens/{shots[i-1]}" alt="Step {i}"></div>'
        f'<p class="cap" style="margin-top:1.5mm; max-width:52mm"><b><span style="color:var(--saffron)">{i} ·</span> {t[f"v{i}"]}</b><br>{t[f"v{i}t"]}</p></div>'
        for i in range(1, 5))
    vihar = f'''<section class="page" id="q-vihar">
  {run(t['p3_run'])}
  <h1>{t['p3_h1']}</h1>
  <p class="intro">{t['p3_intro']}</p>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:3mm 4mm; justify-items:center;">{cells}</div>
  {{FOOT}}
</section>'''

    f = t['flow']
    flow = f'''<svg viewBox="0 0 117 40" style="width:117mm; height:38mm" aria-label="{f[0]}, {f[1]}, {f[3]} / {f[5]}">
    <g font-family="Schibsted Grotesk, Arial" font-weight="800" font-size="3.6">
      <rect x="0" y="13" width="30" height="13" rx="2.4" fill="#fff" stroke="#1F1A17" stroke-width=".4"/><text x="15" y="21" text-anchor="middle" fill="#1F1A17">{f[0]}</text>
      <line x1="30" y1="19.5" x2="36" y2="19.5" stroke="#DE6B38" stroke-width=".6"/><polygon points="36,18 39,19.5 36,21" fill="#DE6B38"/>
      <rect x="39" y="13" width="38" height="13" rx="2.4" fill="#FFF2D2"/><text x="58" y="18.6" text-anchor="middle" fill="#8A5A00">{f[1]}</text><text x="58" y="22.8" text-anchor="middle" font-family="Instrument Sans, Arial" font-weight="500" font-size="2.6" fill="#8A5A00">{f[2]}</text>
      <line x1="77" y1="19.5" x2="83" y2="8" stroke="#DE6B38" stroke-width=".6"/><line x1="77" y1="19.5" x2="83" y2="31" stroke="#DE6B38" stroke-width=".6"/>
      <rect x="83" y="1" width="34" height="13" rx="2.4" fill="#E5F3EA"/><text x="100" y="6.6" text-anchor="middle" fill="#2F7D4F">{f[3]}</text><text x="100" y="10.8" text-anchor="middle" font-family="Instrument Sans, Arial" font-weight="500" font-size="2.6" fill="#2F7D4F">{f[4]}</text>
      <rect x="83" y="25" width="34" height="13" rx="2.4" fill="#FBE7E4"/><text x="100" y="30.6" text-anchor="middle" fill="#A93226">{f[5]}</text><text x="100" y="34.8" text-anchor="middle" font-family="Instrument Sans, Arial" font-weight="500" font-size="2.6" fill="#A93226">{f[6]}</text>
    </g>
  </svg>'''
    after = f'''<section class="page" id="q-after">
  {run(t['p4_run'])}
  <h1>{t['p4_h1']}</h1>
  <div class="card" style="background:var(--saffron); border-color:var(--saffron);"><h3 style="color:#fff">{t['one_h']}</h3><p class="small" style="color:#fff">{t['one_t']}</p></div>
  {flow}
  <div style="display:grid; grid-template-columns:1fr auto; gap:4mm; align-items:center;">
    <p class="small" style="font-size:9.4pt">{t['pend_t']}</p>
    <div class="fig"><div class="droid" style="height:80mm"><img src="assets/screens/64-my-vihars.jpg" alt="My Vihars with a pending entry"></div><p class="cap">{t['pend_cap']}</p></div>
  </div>
  <p class="note">{t['wrong_note']}</p>
  {{FOOT}}
</section>'''

    cards = ''.join(f'<div class="card"><div class="row"><h3>{t[f"n{i}"]}</h3><span class="tag soft">{t[f"n{i}g"]}</span></div><p class="small">{t[f"n{i}t"]}</p></div>' for i in range(1, 5))
    notify = f'''<section class="page" id="q-notify">
  {run(t['n_run'])}
  <h1>{t['n_h1']}</h1>
  <p class="intro">{t['n_intro']}</p>
  <div class="fig"><img src="assets/reminder-preview.jpg" alt="A Vihar reminder notification on an Android phone" style="width:66mm; border-radius:4mm; box-shadow:0 2mm 5mm rgba(60,30,10,.18)"><p class="cap">{t['n_cap']}</p></div>
  <div class="stack" style="gap:1.8mm">{cards}</div>
  <p class="note">{t['n_note']}</p>
  {{FOOT}}
</section>'''

    contact = f'''<section class="page" id="q-contact">
  {run(t['c_run'])}
  <h1>{t['c_h1']}</h1>
  <div style="display:grid; grid-template-columns:62mm 1fr; gap:5mm; align-items:start;">
    <div class="fig"><div class="droid" style="height:124mm"><img src="assets/screens/69-sevak-contacts.jpg" alt="Contacts: emergency list and Sevak directory"></div><p class="cap">{t['c_cap']}</p></div>
    <div class="stack">
      <div class="card"><h3>{t['c1']}</h3><p class="small">{t['c1t']}</p></div>
      <div class="card"><h3>{t['c2']}</h3><p class="small">{t['c2t']}</p></div>
      <div class="card"><h3>{t['c3']}</h3><p class="small">{t['c3t']}</p></div>
    </div>
  </div>
  {{FOOT}}
</section>'''

    share = f'''<section class="page" id="q-share">
  {run(t['p5_run'])}
  <h1>{t['p5_h1']}</h1>
  <p class="intro">{t['p5_intro']}</p>
  <div style="display:grid; grid-template-columns:auto 1fr; gap:4mm; align-items:start;">
    <div class="fig"><div class="droid" style="height:84mm"><img src="assets/screens/share-sheet-new.png" alt="Share your Seva sheet" style="padding-top:0"></div><p class="cap">{t['share_cap']}</p></div>
    <div class="stack" style="gap:2.8mm">
      <div class="step"><span class="dot">1</span><div><p class="small">{t['h1s']}</p><img src="assets/share-badge.png" alt="Share badge with WhatsApp and Instagram icons" style="height:8mm; margin-top:1.2mm"></div></div>
      <div class="step"><span class="dot">2</span><div><p class="small">{t['h2s']}</p></div></div>
      <div class="step"><span class="dot">3</span><div><p class="small">{t['h3s']}</p></div></div>
      <div class="step"><span class="dot">4</span><div><p class="small">{t['h4s']}</p></div></div>
    </div>
  </div>
  <div class="card" style="background:#1F1A17; border-color:#1F1A17; flex-direction:row; align-items:center; gap:4mm;">
    <div style="flex:1">
      <p style="color:#fff; font-family:var(--display); font-weight:800; font-size:11pt;">{t['support']}</p>
      <p style="color:#25D366; font-family:var(--display); font-weight:800; font-size:14pt; margin-top:1mm;">+91 93245 03214</p>
      <p style="color:#E8DFD5; font-size:8pt; margin-top:.8mm;">WhatsApp · Call · contact@vjas.in</p>
    </div>
    <div style="text-align:center; flex:none;"><div style="background:#fff; border-radius:2mm; padding:1.5mm; width:21mm; height:21mm;"><img src="assets/qr-play-store.svg" alt="QR code for vSeva on Google Play" style="width:100%;height:100%"></div><p style="color:#E8DFD5; font-size:6.8pt; margin-top:1mm; line-height:1.3">{t['play_label']}</p></div>
  </div>
  <div class="card" style="flex-direction:row; align-items:center; gap:3.5mm;">
    {INSTA_ICON}
    <div style="flex:1"><h3>{t['insta']}</h3><p class="small"><b>@vseva.app</b> · {t['insta_t']}</p></div>
    <img src="assets/qr-instagram-vseva-app.svg" alt="QR code for Instagram @vseva.app" style="width:17mm;height:17mm">
  </div>
  {{FOOT}}
</section>'''

    return {'q-install': install, 'q-profile': profile, 'q-vihar': vihar, 'q-after': after,
            'q-notify': notify, 'q-contact': contact, 'q-share': share}


ORDER = ['cover', 'q-install', 'q-profile', 'q-vihar', 'q-after', 'q-notify', 'q-contact', 'q-share']
