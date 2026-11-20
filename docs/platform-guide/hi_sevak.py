# Hindi text for the Sevak Guide (used by build_guides.py to make "vSeva Sevak Guide (Hindi).pdf").
# Each key is the exact inner HTML of one element in the English Sevak Guide; the value replaces it.
# Names of app screens and buttons (spans with class "ui", "My Vihars", "Submit Entry" ...) stay in English
# because the screenshots show the English app. Fix a translation here and run build_guides.py again.

HI = {
    # cover
    'VSEVA · SEVAK GUIDE': 'VSEVA · सेवक गाइड',
    'FOR SEVAKS &amp; SEVIKAS': 'सेवक और सेविकाओं के लिए',
    'See Your<br>Seva Stats &amp;<br>Inspire More<span style="color:var(--saffron)">.</span><em style="font-size:22pt; line-height:1.15; margin-top:2mm;">Every Step Counts.</em>':
        'अपनी सेवा के<br>आँकड़े देखें और<br>प्रेरणा बनें<span style="color:var(--saffron)">।</span><em style="font-size:21pt; line-height:1.35; margin-top:2mm;">हर कदम मायने रखता है।</em>',
    'Record your Vihars, follow your Sankalp and share your Seva to inspire others, from your phone.':
        'अपने फ़ोन से विहार दर्ज करें, अपना संकल्प पूरा करें और अपनी सेवा साझा करके दूसरों को प्रेरित करें।',
    'PREPARED FOR': 'किसके लिए',
    'Vihar Sevaks': 'विहार सेवक',
    'PREPARED BY': 'प्रस्तुतकर्ता',
    'November 2026': 'नवंबर 2026',
    'RECORD <span style="color:var(--saffron)">✱</span> TRACK <span style="color:var(--saffron)">✱</span> SERVE <span style="color:var(--saffron)">✱</span> SHARE':
        'दर्ज करें <span style="color:var(--saffron)">✱</span> देखें <span style="color:var(--saffron)">✱</span> सेवा करें <span style="color:var(--saffron)">✱</span> साझा करें',
    'ANDROID APP ON GOOGLE PLAY · VSEVA.VJAS.IN': 'GOOGLE PLAY पर ANDROID ऐप · VSEVA.VJAS.IN',

    # welcome
    'One record of<em>every Vihar.</em>': 'हर विहार का<em>एक रिकॉर्ड।</em>',
    'vSeva is an app for Jain Vihar Seva groups. Sevaks record each Vihar in a minute; the Captain sees the whole group: who served, which routes, how many kilometres, and how the year is going.':
        'vSeva जैन विहार सेवा ग्रुप के लिए ऐप है। सेवक हर विहार एक मिनट में दर्ज करते हैं; कैप्टन पूरा ग्रुप देखते हैं: किसने सेवा की, कौन-से रूट, कितने किलोमीटर, और साल कैसा चल रहा है।',
    'Names and phone numbers in every screenshot are anonymised.': 'हर स्क्रीनशॉट में नाम और फ़ोन नंबर छिपाए गए हैं।',
    'Welcome': 'स्वागत',

    # install
    'Install the<em>vSeva app.</em>': 'vSeva ऐप<em>इंस्टॉल करें।</em>',
    'Start with the vSeva app from the <b>Google Play Store</b>.': 'शुरुआत <b>Google Play Store</b> से vSeva ऐप इंस्टॉल करके करें।',
    'GET IT ON GOOGLE PLAY': 'GOOGLE PLAY पर उपलब्ध',
    'Scan the QR to open it': 'खोलने के लिए QR स्कैन करें',
    'Open Play Store': 'Play Store खोलें',
    'On your Android phone, open <b>Google Play Store</b>.': 'अपने Android फ़ोन में <b>Google Play Store</b> खोलें।',
    'Search “vSeva”': '“vSeva” खोजें',
    'Or scan the QR. Look for <b>vSeva – Vihar Seva Management</b>.': 'या QR स्कैन करें। <b>vSeva – Vihar Seva Management</b> चुनें।',
    'Install, then Open': 'Install करें, फिर Open',
    'Tap <span class="ui">Install</span>, then <span class="ui">Open</span>. Allow notifications.': '<span class="ui">Install</span> दबाएँ, फिर <span class="ui">Open</span>। नोटिफ़िकेशन की अनुमति दें।',
    'Sign in': 'साइन इन करें',
    'Use the <b>username</b> your Captain shared on WhatsApp and your <b>mobile number</b> as password.':
        'कैप्टन द्वारा WhatsApp पर भेजा गया <b>यूज़रनेम</b> डालें, और पासवर्ड में अपना <b>मोबाइल नंबर</b>।',
    '<b>vSeva</b> on Google Play': 'Google Play पर <b>vSeva</b>',
    'On an iPhone? Use Safari': 'iPhone है? Safari से',
    'Open <b>vseva.vjas.in</b> in <b>Safari</b>': '<b>Safari</b> में <b>vseva.vjas.in</b> खोलें',
    'Tap <b>Share</b> (square with arrow ↑)': '<b>Share</b> (तीर ↑ वाला चौकोर) दबाएँ',
    'Tap <b>Add to Home Screen</b>, then <b>Add</b>': '<b>Add to Home Screen</b> दबाएँ, फिर <b>Add</b>',
    'Open <b>vSeva</b> from your Home Screen': 'होम स्क्रीन से <b>vSeva</b> खोलें',
    '<b>Notifications on:</b> they bring Upcoming Vihar alerts, approvals, reminders and birthday wishes.':
        '<b>नोटिफ़िकेशन चालू रखें:</b> आने वाले विहार, अप्रूवल, रिमाइंडर और जन्मदिन की शुभकामनाएँ इन्हीं से मिलती हैं।',
    'Start here': 'यहाँ से शुरू करें',

    # what vSeva does
    'What vSeva<em>does.</em>': 'vSeva क्या<em>करता है।</em>',
    'The platform': 'प्लेटफ़ॉर्म',
    'Record Vihars': 'विहार दर्ज करें',
    'A four-step form. Distance comes from your group\'s routes.': 'चार चरणों का फ़ॉर्म। दूरी ग्रुप के रूट से अपने-आप आती है।',
    'Captain approval': 'कैप्टन अप्रूवल',
    'Sevaks\' Vihars wait for the Captain to approve them.': 'सेवकों के विहार कैप्टन के अप्रूवल का इंतज़ार करते हैं।',
    'Stats and Sankalp': 'आँकड़े और संकल्प',
    'Kilometres, streaks, rank, leaderboards and a yearly target.': 'किलोमीटर, लगातार दिन, रैंक, लीडरबोर्ड और सालाना लक्ष्य।',
    'Members and routes': 'सदस्य और रूट',
    'The Captain creates logins and keeps the route list.': 'कैप्टन लॉगिन बनाते हैं और रूट की सूची रखते हैं।',
    'Alerts, VChat, contacts': 'अलर्ट, VChat, संपर्क',
    'Upcoming Vihar alerts, group chat, Call and WhatsApp.': 'आने वाले विहार के अलर्ट, ग्रुप चैट, कॉल और WhatsApp।',
    'Reports and sharing': 'रिपोर्ट और शेयरिंग',
    'PDF / Excel exports, Seva cards and a Vihar Seva ID card.': 'PDF / Excel रिपोर्ट, सेवा कार्ड और विहार सेवा ID कार्ड।',
    'Directory and Derasars': 'डायरेक्टरी और देरासर',
    'A public directory and a finder for Derasars near you.': 'सार्वजनिक डायरेक्टरी और पास के देरासर खोजने की सुविधा।',
    'In English, ગુજરાતી and हिंदी: tap EN at the top of any screen.': 'English, ગુજરાતી और हिंदी में: किसी भी स्क्रीन पर ऊपर EN दबाकर भाषा बदलें।',

    # first sign-in
    'Your first<em>sign-in.</em>': 'आपका पहला<em>साइन-इन।</em>',
    'Sevak guide': 'सेवक गाइड',
    'Open the app': 'ऐप खोलें',
    'Open <b>vSeva</b>, installed from Google Play.': 'Google Play से इंस्टॉल किया <b>vSeva</b> खोलें।',
    '<b>Username</b> from your Captain, <b>mobile number</b> as password.': 'कैप्टन से मिला <b>यूज़रनेम</b>, और पासवर्ड में <b>मोबाइल नंबर</b>।',
    'Set your Vihar Sankalp first': 'सबसे पहले अपना विहार संकल्प सेट करें',
    'Tap your photo → <span class="ui">My Sankalp</span> → <span class="ui">Edit</span>. Enter how many Vihars you will do this Vihar Year and save. The ring on Home tracks it.':
        'अपनी फ़ोटो → <span class="ui">My Sankalp</span> → <span class="ui">Edit</span> दबाएँ। इस विहार वर्ष में कितने विहार करेंगे, वह लिखकर सेव करें। Home पर रिंग आपकी प्रगति दिखाती है।',
    'Complete your profile': 'अपनी प्रोफ़ाइल पूरी करें',
    'Add your photo and your details (next page).': 'अपनी फ़ोटो और जानकारी भरें (अगला पेज)।',
    '<b>Sign in</b>': '<b>साइन इन</b>',
    '<b>Forgot your password?</b> Tap <b>Forgot Password?</b> and enter your username. Your Captain is notified and resets it to your mobile number.':
        '<b>पासवर्ड भूल गए?</b> <b>Forgot Password?</b> दबाकर यूज़रनेम डालें। कैप्टन को सूचना जाती है और वे पासवर्ड फिर से आपका मोबाइल नंबर कर देते हैं।',

    # profile
    'Complete your<em>profile to 100%.</em>': 'प्रोफ़ाइल<em>100% पूरी करें।</em>',
    'After you sign in, vSeva asks you to <b>complete your profile</b> until every detail is filled. Tap <span class="ui">Complete Now</span>, or <b>Later</b> to be reminded on your next visit.':
        'साइन इन के बाद, जब तक हर जानकारी न भरी जाए, vSeva आपसे <b>प्रोफ़ाइल पूरी करने</b> को कहता है। <span class="ui">Complete Now</span> दबाएँ, या <b>Later</b> दबाएँ तो अगली बार फिर याद दिलाया जाएगा।',
    '<b>The ring</b> around your photo shows how complete you are': 'फ़ोटो के चारों ओर की <b>रिंग</b> बताती है कि प्रोफ़ाइल कितनी पूरी है',
    'Fill <b>Your Details</b>, then <b>Save Changes</b>': '<b>Your Details</b> भरें, फिर <b>Save Changes</b>',
    'Fill in all of these': 'ये सब भरें',
    '☐ <b>Profile photo</b> (tap the camera on your photo)': '☐ <b>प्रोफ़ाइल फ़ोटो</b> (फ़ोटो पर कैमरा दबाएँ)',
    '☐ <b>Date of birth</b> (day, month, year)': '☐ <b>जन्म तिथि</b> (दिन, महीना, वर्ष)',
    '☐ <b>Blood group</b>': '☐ <b>ब्लड ग्रुप</b>',
    '☐ <b>Family emergency contact name</b>': '☐ <b>परिवार के इमरजेंसी संपर्क का नाम</b>',
    '☐ <b>Family emergency number</b>': '☐ <b>परिवार का इमरजेंसी नंबर</b>',
    '☐ <b>Occupation</b> (details if <b>Other</b>)': '☐ <b>व्यवसाय</b> (<b>Other</b> हो तो विवरण)',
    '☐ <b>Address</b>': '☐ <b>पता</b>',
    '<b>Why it matters:</b> in an incident your group can reach your family and help you quickly. Your Captain sees what is <b>still to fill</b> for each Sevak.':
        '<b>क्यों ज़रूरी है:</b> किसी घटना के समय ग्रुप आपके परिवार तक जल्दी पहुँचकर मदद कर सके। कैप्टन हर सेवक की <b>बाकी जानकारी</b> देख सकते हैं।',

    # navigation
    'Finding<em>your way.</em>': 'ऐप में<em>कहाँ क्या है।</em>',
    '<b>Home</b>: your Sankalp and stats': '<b>Home</b>: आपका संकल्प और आँकड़े',
    '<b>More</b>: the rest of your tools': '<b>More</b>: बाकी सभी सुविधाएँ',
    'Stats, Sankalp, recent activity': 'आँकड़े, संकल्प, हाल की गतिविधि',
    'Every Vihar you were part of': 'वे सभी विहार जिनमें आप शामिल थे',
    'Add Vihar, Group Analytics, VChat, Contacts, Notifications, Incidents': 'Add Vihar, Group Analytics, VChat, Contacts, Notifications, Incidents',
    'Your photo': 'आपकी फ़ोटो',
    'Profile, Sankalp, ID card': 'प्रोफ़ाइल, संकल्प, ID कार्ड',

    # record a vihar
    'Record a Vihar<em>steps 1–2</em>': 'विहार दर्ज करें<em>चरण 1–2</em>',
    'Record a Vihar<em>steps 3–4</em>': 'विहार दर्ज करें<em>चरण 3–4</em>',
    'Record a Vihar': 'विहार दर्ज करें',
    'Sevaks: <span class="ui">Add Vihar</span> on Home. Captain: <span class="ui">New Entry</span>. The same form for both.':
        'सेवक: Home पर <span class="ui">Add Vihar</span>। कैप्टन: <span class="ui">New Entry</span>। दोनों के लिए एक ही फ़ॉर्म।',
    '<b>1 · Date &amp; Type</b>': '<b>1 · तारीख और प्रकार</b>',
    '<b>2 · Vihar Of &amp; Route</b>': '<b>2 · किसका विहार और रूट</b>',
    '1 · Date &amp; Type': '1 · तारीख और प्रकार',
    '<b>Date</b> (today by default) and <b>Vihar Session</b>: Morning or Evening.': '<b>तारीख</b> (पहले से आज की) और <b>विहार का समय</b>: सुबह (Morning) या शाम (Evening)।',
    '2 · Vihar Of &amp; Route': '2 · किसका विहार और रूट',
    'Tap <b>Sadhubhagwan</b> and/or <b>Sadhvijibhagwan</b> and enter how many. Pick <b>From</b> and <b>To</b>; the distance appears.':
        '<b>Sadhubhagwan</b> और/या <b>Sadhvijibhagwan</b> दबाकर संख्या लिखें। <b>From</b> और <b>To</b> चुनें; दूरी अपने-आप आ जाती है।',
    '<b>3 · Seva Requirements</b>': '<b>3 · सेवा की ज़रूरतें</b>',
    '<b>4 · Instructions &amp; Review</b>': '<b>4 · निर्देश और जाँच</b>',
    '3 · Seva Requirements': '3 · सेवा की ज़रूरतें',
    'Add <b>every Sevak</b> who walked (at least one). Answer <b>Wheelchair</b> and <b>Car Seva (Updhi)</b>; if Yes, choose who.':
        'साथ चले <b>हर सेवक</b> को जोड़ें (कम से कम एक)। <b>Wheelchair</b> और <b>Car Seva (Updhi)</b> का जवाब दें; Yes हो तो किसने की, वह चुनें।',
    '4 · Instructions &amp; Review': '4 · निर्देश और जाँच',
    'Optional <b>Samuday</b> and <b>Notes</b>, then <span class="ui">Submit Entry</span>.': '<b>समुदाय</b> और <b>नोट्स</b> (वैकल्पिक), फिर <span class="ui">Submit Entry</span>।',
    '<b>One Sevak submits each Vihar</b> for everyone on it. Others should not submit it again.':
        '<b>हर विहार एक ही सेवक दर्ज करता है</b>, सभी साथियों के लिए। बाकी लोग उसे दोबारा न भरें।',

    # submit for approval
    'Submit a Vihar<em>for approval.</em>': 'विहार अप्रूवल के लिए<em>भेजें।</em>',
    'Submit for approval': 'अप्रूवल के लिए भेजें',
    'Every Vihar a Sevak records goes to the Captain first. It counts in your numbers once the Captain approves it.':
        'सेवक का दर्ज किया हर विहार पहले कैप्टन के पास जाता है। कैप्टन के अप्रूव करने पर ही वह आपके आँकड़ों में जुड़ता है।',
    'Fill the four steps and tap <span class="ui">Submit Entry</span>. One Sevak submits for everyone who walked.':
        'चारों चरण भरें और <span class="ui">Submit Entry</span> दबाएँ। साथ चलने वाले सभी के लिए एक ही सेवक भेजता है।',
    'Sent to your Captain': 'कैप्टन के पास पहुँचा',
    'In <span class="ui">My Vihars</span> it shows <span class="tag amber">Pending captain approval</span>.': '<span class="ui">My Vihars</span> में यह <span class="tag amber">Pending captain approval</span> दिखता है।',
    'Captain approves': 'कैप्टन ने अप्रूव किया',
    'It now counts in your <b>Stats</b>, <b>Sankalp</b> and rank, for every Sevak on it.': 'अब यह उसमें शामिल हर सेवक के <b>आँकड़ों</b>, <b>संकल्प</b> और रैंक में जुड़ जाता है।',
    'If it is rejected': 'अगर रिजेक्ट हो जाए',
    'You get a notification. Check the details with your Captain.': 'आपको सूचना मिलती है। कैप्टन से जानकारी की पुष्टि करें।',
    '<b>My Vihars</b> with a pending entry': 'पेंडिंग एंट्री के साथ <b>My Vihars</b>',
    '<b>Still pending?</b> Remind your Captain. Please don\'t submit the same Vihar again.': '<b>अभी भी पेंडिंग?</b> कैप्टन को याद दिलाएँ। कृपया वही विहार दोबारा न भेजें।',

    # statistics
    'Reading your<em>numbers.</em>': 'अपने आँकड़े<em>समझें।</em>',
    'Statistics': 'आँकड़े',
    'Your statistics': 'आपके आँकड़े',
    'Counted from approved Vihars in the selected Vihar Year. Change the year with the <span class="ui">VY</span> menu.':
        'चुने गए विहार वर्ष के अप्रूव हुए विहारों से गिने जाते हैं। वर्ष बदलने के लिए <span class="ui">VY</span> मेनू।',
    'Kilometres walked': 'चले हुए किलोमीटर',
    'Number of Vihars': 'विहारों की संख्या',
    'Bhagwant served': 'जिन भगवंत की सेवा की',
    'Who you walk with most': 'जिनके साथ सबसे ज़्यादा चले',
    'By Vihars, then km': 'विहारों से, फिर किलोमीटर से',
    'Days in a row': 'लगातार दिन',
    'Members, M / F': 'सदस्य, पुरुष / महिला',
    'Did a Vihar this year': 'इस साल विहार किया',
    'This week, day by day': 'इस हफ़्ते, दिन-ब-दिन',
    '<span class="ui">More → Group Analytics</span>: totals, longest Vihar, Top Sevaks and Sevikas, last 7 days and a monthly calendar.':
        '<span class="ui">More → Group Analytics</span>: कुल आँकड़े, सबसे लंबा विहार, टॉप सेवक-सेविकाएँ, पिछले 7 दिन और मासिक कैलेंडर।',

    # sankalp
    'Your year,<em>your Sankalp.</em>': 'आपका वर्ष,<em>आपका संकल्प।</em>',
    'Sankalp &amp; Vihar Year': 'संकल्प और विहार वर्ष',
    'Sankalp & Vihar Year': 'संकल्प और विहार वर्ष',
    'A <b>Vihar Year</b> runs <b>14 October – 13 July</b>. The months between are Chaturmas.': '<b>विहार वर्ष</b> <b>14 अक्टूबर – 13 जुलाई</b> तक चलता है। बीच के महीने चातुर्मास हैं।',
    'Your Vihar target for the year. It starts at <b>5</b>. Change it in <span class="ui">Profile → My Sankalp → Edit</span>. The ring on Home shows progress, like <b>1/5 · 20% complete</b>.':
        'साल भर का आपका विहार लक्ष्य, जो <b>5</b> से शुरू होता है। <span class="ui">Profile → My Sankalp → Edit</span> में बदलें। Home पर रिंग प्रगति दिखाती है, जैसे <b>1/5 · 20% complete</b>।',
    'Set by the Captain for the whole group. The Captain can turn off <span class="ui">Allow Sevaks to edit their Sankalp</span> to lock everyone\'s target.':
        'कैप्टन पूरे ग्रुप के लिए सेट करते हैं। कैप्टन <span class="ui">Allow Sevaks to edit their Sankalp</span> बंद करके सबका लक्ष्य लॉक कर सकते हैं।',

    # contact
    'Seamless<em>Contact.</em>': 'आसान<em>संपर्क।</em>',
    'Seamless Contact': 'आसान संपर्क',
    'Emergency contacts': 'इमरजेंसी संपर्क',
    'Added by the Captain, shown to every Sevak.': 'कैप्टन जोड़ते हैं, हर सेवक को दिखते हैं।',
    'Sevak directory': 'सेवक डायरेक्टरी',
    'Search a name, then tap <b>Call</b> or <b>WhatsApp</b>.': 'नाम खोजें, फिर <b>Call</b> या <b>WhatsApp</b> दबाएँ।',
    'Notifications': 'नोटिफ़िकेशन',
    'The bell shows alerts. Tap one to open the right screen.': 'घंटी में अलर्ट दिखते हैं। किसी पर दबाने से सही स्क्रीन खुलती है।',
    'You are notified when': 'आपको सूचना मिलती है जब',
    'an upcoming Vihar is announced': 'आने वाले विहार की घोषणा होती है',
    'your Captain records a Vihar with you in it': 'कैप्टन ऐसा विहार दर्ज करते हैं जिसमें आप हैं',
    'a submission is not approved, or one awaits the Captain': 'आपकी एंट्री अप्रूव नहीं होती, या कैप्टन के पास पेंडिंग है',
    'there is a new VChat message': 'VChat में नया संदेश आता है',
    'you have had no Vihar for several days': 'कई दिनों से आपका कोई विहार नहीं हुआ',
    '<b>Phone alerts:</b> Profile → Push Notifications, and allow notifications for vSeva in your phone settings.':
        '<b>फ़ोन पर अलर्ट:</b> Profile → Push Notifications, और फ़ोन की सेटिंग में vSeva के नोटिफ़िकेशन चालू करें।',

    # sharing
    'Your Seva,<em>worth sharing.</em>': 'आपकी सेवा,<em>साझा करने लायक।</em>',
    'Records &amp; sharing': 'रिकॉर्ड और शेयरिंग',
    'Records & sharing': 'रिकॉर्ड और शेयरिंग',
    '<b>Vihar Seva ID Card</b> (QR blurred)': '<b>विहार सेवा ID कार्ड</b> (QR धुंधला किया गया)',
    'Past Vihars': 'पिछले विहार',
    '<span class="ui">My Vihars</span> or <span class="ui">View Entries</span>. Each card has <b>Save</b> and <b>WhatsApp</b>.': '<span class="ui">My Vihars</span> या <span class="ui">View Entries</span>। हर कार्ड पर <b>Save</b> और <b>WhatsApp</b> है।',
    'Seva cards': 'सेवा कार्ड',
    'The share button by Your Stats: pick a card, Story or Square, then save or share to WhatsApp or Instagram.':
        'Your Stats के पास शेयर बटन: कार्ड चुनें, Story या Square, फिर सेव करें या WhatsApp / Instagram पर शेयर करें।',
    'ID card': 'ID कार्ड',
    'Profile → <b>Vihar Seva ID Card</b>. Its QR opens your verification page with emergency details.': 'Profile → <b>Vihar Seva ID Card</b>। इसका QR इमरजेंसी जानकारी के साथ आपका वेरिफ़िकेशन पेज खोलता है।',

    # community
    'Beyond your<em>own group.</em>': 'अपने ग्रुप<em>से आगे।</em>',
    'Community': 'कम्युनिटी',
    'Your group\'s chat. The Captain can follow other groups so members can read their updates. Messages stay 30 days.':
        'आपके ग्रुप की चैट। कैप्टन दूसरे ग्रुप को फ़ॉलो कर सकते हैं ताकि सदस्य उनकी अपडेट पढ़ सकें। संदेश 30 दिन रहते हैं।',
    'Directory &amp; Find Derasar': 'डायरेक्टरी और देरासर खोजें',
    'A public list of groups, temples and Upashrays; anyone can add a listing (reviewed first). <b>Find Derasar</b> lists temples near you, up to 100 km.':
        'ग्रुप, मंदिर और उपाश्रय की सार्वजनिक सूची; कोई भी नई लिस्टिंग जोड़ सकता है (पहले जाँच होती है)। <b>Find Derasar</b> 100 किमी तक के पास के मंदिर दिखाता है।',

    # faq
    'FAQ\'s': 'अक्सर पूछे जाने वाले सवाल',
    'I can\'t sign in.': 'साइन इन नहीं हो रहा।',
    'Use the username from your Captain and your mobile number. Still stuck? Tap <b>Forgot Password?</b>': 'कैप्टन से मिला यूज़रनेम और अपना मोबाइल नंबर डालें। फिर भी दिक्कत? <b>Forgot Password?</b> दबाएँ।',
    '"Your session has ended."': '"Your session has ended."',
    'Sign in again. Nothing you saved is lost.': 'फिर से साइन इन करें। आपका सेव किया कुछ भी नहीं खोता।',
    'My Vihar isn\'t in my stats.': 'मेरा विहार आँकड़ों में नहीं है।',
    'It\'s probably pending. Check My Vihars, and remind your Captain.': 'शायद पेंडिंग है। My Vihars देखें और कैप्टन को याद दिलाएँ।',
    'A route is missing.': 'कोई रूट नहीं मिल रहा।',
    'Ask your Captain to add it in Manage Routes.': 'कैप्टन से Manage Routes में जोड़ने को कहें।',
    'My numbers changed.': 'मेरे आँकड़े बदल गए।',
    'Check the Vihar Year in the VY menu.': 'VY मेनू में विहार वर्ष देखें।',
    'Save or Export does nothing.': 'Save या Export से कुछ नहीं होता।',
    'Pick where to send the file in the share sheet that opens.': 'जो शेयर विंडो खुलती है, उसमें चुनें कि फ़ाइल कहाँ भेजनी है।',
    'No notifications.': 'नोटिफ़िकेशन नहीं आ रहे।',
    'Profile → Push Notifications → Enable, and allow vSeva in phone settings.': 'Profile → Push Notifications → Enable करें, और फ़ोन सेटिंग में vSeva की अनुमति दें।',
    'Using an iPhone?': 'iPhone है?',
    'Open vseva.vjas.in in <b>Safari</b> → Share → Add to Home Screen.': '<b>Safari</b> में vseva.vjas.in खोलें → Share → Add to Home Screen।',

    # support
    'Your Seva journey,<em>better organized.</em>': 'आपकी सेवा यात्रा,<em>और व्यवस्थित।</em>',
    'Support': 'सहायता',
    'Questions, onboarding help, or bringing your group onto vSeva? We\'re here to help.': 'कोई सवाल, शुरुआत में मदद, या अपना ग्रुप vSeva पर लाना है? हम मदद के लिए हैं।',
    'Guide &amp; demo': 'गाइड और डेमो',
    'Technical support': 'टेक्निकल सहायता',
    'Email': 'ईमेल',
    'Android App · Google Play': 'Android ऐप · Google Play',


    # renamed Sevak pages and the notifications page
    'Submit a Vihar<em>steps 1–2</em>': 'विहार भेजें<em>चरण 1–2</em>',
    'Submit a Vihar<em>steps 3–4</em>': 'विहार भेजें<em>चरण 3–4</em>',
    'Submit a Vihar': 'विहार भेजें',
    'Submit a Vihar (3–4)': 'विहार भेजें (3–4)',
    'Tap <span class="ui">Add Vihar</span> on Home and fill four short steps. Then it goes to your Captain for approval.':
        'Home पर <span class="ui">Add Vihar</span> दबाएँ और चार छोटे चरण भरें। फिर यह अप्रूवल के लिए कैप्टन के पास जाता है।',
    'After you<em>submit.</em>': 'भेजने के<em>बाद।</em>',
    'After you submit': 'भेजने के बाद',
    'See your<em>Seva.</em>': 'अपनी सेवा<em>देखें।</em>',
    'See your Seva': 'अपनी सेवा देखें',
    'The bell shows alerts. See the previous page for what you are notified about.': 'घंटी में अलर्ट दिखते हैं। किन बातों की सूचना मिलती है, यह पिछले पेज पर है।',
    'Get updates via notifications': 'नोटिफ़िकेशन से अपडेट पाएँ',
    'Get updates<em>via notifications.</em>': 'नोटिफ़िकेशन से<em>अपडेट पाएँ।</em>',
    'vSeva tells you what is happening in your group, right on your phone, even when the app is closed.': 'vSeva आपके ग्रुप की हर ज़रूरी बात सीधे आपके फ़ोन पर बताता है, ऐप बंद होने पर भी।',
    '<b>A Vihar reminder</b> as it arrives on the phone': 'फ़ोन पर आया <b>विहार रिमाइंडर</b>',
    'Upcoming Vihar alerts': 'आने वाले विहार के अलर्ट',
    'Instantly': 'तुरंत',
    "Your Captain announces the date, time and route. Tap <b>I'm Interested</b> to join.": "कैप्टन तारीख, समय और रूट बताते हैं। जुड़ने के लिए <b>I'm Interested</b> दबाएँ।",
    'Vihar reminders': 'विहार रिमाइंडर',
    '9 AM': 'सुबह 9 बजे',
    '8 AM': 'सुबह 8 बजे',
    'A gentle nudge when you have not done a Vihar for a few days.': 'कुछ दिनों से विहार न किया हो तो एक याद दिलाने वाला संदेश।',
    'Birthday wishes': 'जन्मदिन की शुभकामनाएँ',
    'Whose birthday it is today in your group, so you can send wishes.': 'आज ग्रुप में किसका जन्मदिन है, ताकि आप शुभकामनाएँ भेज सकें।',
    'Your Vihars and VChat': 'आपके विहार और VChat',
    'As it happens': 'उसी समय',
    'When your Captain records a Vihar with you in it, a submission is not approved, or a new VChat message arrives.':
        'जब कैप्टन ऐसा विहार दर्ज करें जिसमें आप हों, आपकी एंट्री अप्रूव न हो, या VChat में नया संदेश आए।',
    '<b>Turn them on:</b> Profile → Push Notifications → Enable, and allow vSeva in your phone settings. Tap a notification to open the right screen.':
        '<b>चालू करें:</b> Profile → Push Notifications → Enable, और फ़ोन सेटिंग में vSeva की अनुमति दें। नोटिफ़िकेशन दबाने पर सही स्क्रीन खुलती है।',
    # contents and running heads
    'Install the vSeva app': 'vSeva ऐप इंस्टॉल करें',
    'What vSeva does': 'vSeva क्या करता है',
    'Your first sign-in': 'आपका पहला साइन-इन',
    'Finding your way': 'ऐप में कहाँ क्या है',
    'Record a Vihar (3–4)': 'विहार दर्ज करें (3–4)',
    'vSeva · Sevak Guide': 'vSeva · सेवक गाइड',
    'iPhone / iPad': 'iPhone / iPad',
    'CHATURMAS': 'चातुर्मास',
}

# Exact replacements where the same words also appear as an English button name elsewhere
RAW = {
    '<h3>Submit Entry</h3>': '<h3>Submit Entry दबाएँ</h3>',
}
