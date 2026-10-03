import React from 'react';
import { BRAND } from '@brand';
import {
  ArrowRight, Footprints, Landmark, LogIn, Megaphone, ShieldAlert, UserPlus, Users, FileText,
} from 'lucide-react';
import LanguageDropdown from '../../components/LanguageDropdown';
import WhatsAppIcon from '../../components/WhatsAppIcon';
import { useLanguage } from '../../context/LanguageContext';
import guruPhoto from './assets/guru.webp';
import developerLogo from './assets/developer-logo.webp';
import { InstallPWA } from '../../components/InstallPWA';
import Mascot from './Mascot';

// Landing page for the Shraman Seva Group deployment. The look follows the
// festival-site reference the client chose (sunburst sky, bunting, clouds, tall
// colourful photo cards, yellow pill buttons with icon chips, sticky round
// WhatsApp button) — recoloured from that site's blue to the saffron / maroon /
// gold of the SSG logo so the page and the logo belong together.

type Lang = 'en' | 'gu' | 'hi';

const MAROON = '#9E1B1B';
const SAFFRON = '#F28C0F';
const GOLD = '#FDBA21';
const TEAL = '#1F7A6E';
const NAVY = '#27466E';

const COPY: Record<Lang, {
  nav: { home: string; prerna: string; features: string; how: string; login: string };
  heroTitle: string; heroSub: string; ctaLogin: string; ctaRegister: string;
  prernaLabel: string; prernaHeading: string; prernaLines: string[]; prernaPrayer: string; prernaNote: string;
  featuresHeading: string; features: { title: string; desc: string }[];
  howHeading: string; steps: { title: string; desc: string }[];
  joinHeading: string; joinSub: string;
  footerFind: string; footerDirectory: string; footerPrivacy: string; footerDelete: string;
  whatsappText: string; whatsappLabel: string;
}> = {
  en: {
    nav: { home: 'Home', prerna: 'Inspiration', features: 'What we do', how: 'How it works', login: 'Login' },
    heroTitle: 'Shraman Seva Group',
    heroSub: 'The Shraman Seva Group platform to log Vihars, coordinate Sevaks and keep every Seva family connected — from one phone.',
    ctaLogin: 'Login', ctaRegister: 'Create Captain Account',
    prernaLabel: 'Prerna', prernaHeading: 'Our inspiration',
    prernaLines: ['શ્રદ્ધેય ગચ્છાધિપતિ ગુરુદેવ', 'પ.પૂ. આચાર્ય ભગવંત', 'શ્રીમદ્ વિજય યશોવર્મસૂરીશ્વરજી મહારાજા'],
    prernaPrayer: 'મને સેવા શ્રમણની મળજો રે…',
    prernaNote: 'A family of Sevaks walking alongside Jain Shramans — now recording every Vihar with care.',
    featuresHeading: 'What you can do', features: [
      { title: 'Vihar records', desc: 'Log every Vihar with date, route, distance and the Sevaks who walked along.' },
      { title: 'Sevak team', desc: 'Your Captain adds Sevaks. Each one signs in with their name and mobile number.' },
      { title: 'SOS safety', desc: 'One tap alerts your Captain with your location. ID card with emergency QR.' },
      { title: 'Channel', desc: 'Share updates inside the Shraman Seva Group family, and follow other groups.' },
      { title: 'Reports', desc: 'Leaderboards, yearly Sankalp and one-tap PDF or Excel reports.' },
      { title: 'Find Derasar', desc: 'Locate Derasars and tirths near you instantly, with directions.' },
    ],
    howHeading: 'How it works', steps: [
      { title: 'Register your group', desc: 'The Captain fills a short form with the group details.' },
      { title: 'We verify and approve', desc: 'The Shraman Seva Group team checks every request and sends the login on WhatsApp.' },
      { title: 'Add Sevaks, start logging', desc: 'Add your Sevaks and record Vihars. Captains approve entries.' },
    ],
    joinHeading: 'Join Shraman Seva Group', joinSub: 'Register your Vihar group today and bring every step of Seva on record.',
    footerFind: 'Find Derasar', footerDirectory: 'Directory', footerPrivacy: 'Privacy Policy', footerDelete: 'Delete account',
    whatsappText: 'Jai Jinendra! I would like to know more about Shraman Seva Group.', whatsappLabel: 'Chat on WhatsApp',
  },
  gu: {
    nav: { home: 'હોમ', prerna: 'પ્રેરણા', features: 'અમે શું કરીએ', how: 'કેવી રીતે', login: 'લૉગિન' },
    heroTitle: 'શ્રમણ સેવા ગ્રુપ',
    heroSub: 'શ્રમણ સેવા ગ્રુપનું પ્લેટફોર્મ — વિહારની નોંધ, સેવકોનું સંકલન અને દરેક સેવા પરિવારને એક જ ફોનથી જોડે રાખવા માટે.',
    ctaLogin: 'લૉગિન', ctaRegister: 'કૅપ્ટન એકાઉન્ટ બનાવો',
    prernaLabel: 'પ્રેરણા', prernaHeading: 'અમારી પ્રેરણા',
    prernaLines: ['શ્રદ્ધેય ગચ્છાધિપતિ ગુરુદેવ', 'પ.પૂ. આચાર્ય ભગવંત', 'શ્રીમદ્ વિજય યશોવર્મસૂરીશ્વરજી મહારાજા'],
    prernaPrayer: 'મને સેવા શ્રમણની મળજો રે…',
    prernaNote: 'જૈન શ્રમણોની સાથે ચાલતા સેવકોનો પરિવાર — હવે દરેક વિહારની નોંધ સંભાળપૂર્વક.',
    featuresHeading: 'તમે શું કરી શકો', features: [
      { title: 'વિહારની નોંધ', desc: 'તારીખ, રૂટ, અંતર અને સાથે ચાલેલા સેવકો સાથે દરેક વિહાર નોંધો.' },
      { title: 'સેવક ટીમ', desc: 'કૅપ્ટન સેવકો ઉમેરે છે. દરેક સેવક પોતાના નામ અને મોબાઈલ નંબરથી લૉગિન કરે છે.' },
      { title: 'SOS સુરક્ષા', desc: 'એક ટેપથી તમારા કૅપ્ટનને લોકેશન સાથે સૂચના. ઇમર્જન્સી QR સાથે ID કાર્ડ.' },
      { title: 'ચેનલ', desc: 'શ્રમણ સેવા ગ્રુપ પરિવારમાં સમાચાર વહેંચો અને અન્ય ગ્રુપને ફૉલો કરો.' },
      { title: 'રિપોર્ટ', desc: 'લીડરબોર્ડ, વાર્ષિક સંકલ્પ અને એક ટેપમાં PDF કે Excel રિપોર્ટ.' },
      { title: 'નજીકનું દેરાસર', desc: 'તમારી નજીકના દેરાસર અને તીર્થ દિશા સાથે તરત શોધો.' },
    ],
    howHeading: 'કેવી રીતે કામ કરે છે', steps: [
      { title: 'તમારું ગ્રુપ નોંધાવો', desc: 'કૅપ્ટન ગ્રુપની વિગતો સાથે ટૂંકું ફૉર્મ ભરે છે.' },
      { title: 'અમે ચકાસીને મંજૂરી આપીએ', desc: 'શ્રમણ સેવા ગ્રુપની ટીમ દરેક વિનંતી ચકાસે છે અને WhatsApp પર લૉગિન મોકલે છે.' },
      { title: 'સેવકો ઉમેરો, નોંધ શરૂ કરો', desc: 'સેવકો ઉમેરો અને વિહાર નોંધો. કૅપ્ટન એન્ટ્રીને મંજૂર કરે છે.' },
    ],
    joinHeading: 'શ્રમણ સેવા ગ્રુપ સાથે જોડાઓ', joinSub: 'આજે જ તમારું વિહાર ગ્રુપ નોંધાવો અને સેવાના દરેક કદમને નોંધમાં લાવો.',
    footerFind: 'નજીકનું દેરાસર', footerDirectory: 'ડિરેક્ટરી', footerPrivacy: 'પ્રાઇવસી પૉલિસી', footerDelete: 'એકાઉન્ટ ડિલીટ',
    whatsappText: 'જય જિનેન્દ્ર! મને શ્રમણ સેવા ગ્રુપ વિશે વધુ જાણવું છે.', whatsappLabel: 'WhatsApp પર વાત કરો',
  },
  hi: {
    nav: { home: 'होम', prerna: 'प्रेरणा', features: 'हम क्या करते हैं', how: 'कैसे काम करता है', login: 'लॉगिन' },
    heroTitle: 'श्रमण सेवा ग्रुप',
    heroSub: 'श्रमण सेवा ग्रुप का प्लेटफ़ॉर्म — विहार का रिकॉर्ड, सेवकों का समन्वय और हर सेवा परिवार को एक ही फ़ोन से जोड़े रखने के लिए।',
    ctaLogin: 'लॉगिन', ctaRegister: 'कैप्टन अकाउंट बनाएँ',
    prernaLabel: 'प्रेरणा', prernaHeading: 'हमारी प्रेरणा',
    prernaLines: ['શ્રદ્ધેય ગચ્છાધિપતિ ગુરુદેવ', 'પ.પૂ. આચાર્ય ભગવંત', 'શ્રીમદ્ વિજય યશોવર્મસૂરીશ્વરજી મહારાજા'],
    prernaPrayer: 'મને સેવા શ્રમણની મળજો રે…',
    prernaNote: 'जैन श्रमणों के साथ चलने वाले सेवकों का परिवार — अब हर विहार का रिकॉर्ड सँभालकर।',
    featuresHeading: 'आप क्या कर सकते हैं', features: [
      { title: 'विहार रिकॉर्ड', desc: 'तारीख़, रूट, दूरी और साथ चले सेवकों के साथ हर विहार दर्ज करें।' },
      { title: 'सेवक टीम', desc: 'कैप्टन सेवकों को जोड़ते हैं। हर सेवक अपने नाम और मोबाइल नंबर से लॉगिन करता है।' },
      { title: 'SOS सुरक्षा', desc: 'एक टैप में कैप्टन को लोकेशन के साथ अलर्ट। इमरजेंसी QR वाला ID कार्ड।' },
      { title: 'चैनल', desc: 'श्रमण सेवा ग्रुप परिवार में अपडेट साझा करें और दूसरे ग्रुप को फ़ॉलो करें।' },
      { title: 'रिपोर्ट', desc: 'लीडरबोर्ड, वार्षिक संकल्प और एक टैप में PDF या Excel रिपोर्ट।' },
      { title: 'नज़दीकी देरासर', desc: 'अपने पास के देरासर और तीर्थ दिशा-निर्देश के साथ तुरंत खोजें।' },
    ],
    howHeading: 'कैसे काम करता है', steps: [
      { title: 'अपना ग्रुप रजिस्टर करें', desc: 'कैप्टन ग्रुप की जानकारी के साथ छोटा फ़ॉर्म भरते हैं।' },
      { title: 'हम जाँचकर मंज़ूरी देते हैं', desc: 'श्रमण सेवा ग्रुप की टीम हर अनुरोध जाँचती है और WhatsApp पर लॉगिन भेजती है।' },
      { title: 'सेवक जोड़ें, रिकॉर्ड शुरू करें', desc: 'सेवकों को जोड़ें और विहार दर्ज करें। कैप्टन एंट्री मंज़ूर करते हैं।' },
    ],
    joinHeading: 'श्रमण सेवा ग्रुप से जुड़ें', joinSub: 'आज ही अपना विहार ग्रुप रजिस्टर करें और सेवा के हर कदम को रिकॉर्ड में लाएँ।',
    footerFind: 'नज़दीकी देरासर', footerDirectory: 'डायरेक्टरी', footerPrivacy: 'प्राइवेसी पॉलिसी', footerDelete: 'अकाउंट हटाएँ',
    whatsappText: 'जय जिनेन्द्र! मुझे श्रमण सेवा ग्रुप के बारे में और जानना है।', whatsappLabel: 'WhatsApp पर बात करें',
  },
};

// The five colours of the Jain flag: red, yellow, white, green, black.
const JAIN_FLAG = ['#FF0000', '#FFCF00', '#FFFFFF', '#009630', '#111111'];

// Inspiration, exactly as supplied (same in every language).
const PRERNA_NAME = [
  'શ્રદ્ધેય ગચ્છાધિપતિ ગુરુદેવ',
  'પ.પૂ. આચાર્ય ભગવંત શ્રીમદ્ વિજય યશોવર્મસૂરીશ્વરજી મહારાજા',
];

// Developer credit in the footer (next to the copyright line).
const DEVELOPER = {
  name: 'Vishwa Alpesh Shah',
  whatsapp: '919594503214',
  whatsappText: 'Jai Jinendra! I saw the Shraman Seva Group platform and would like to get in touch.',
};

const FEATURE_STYLES = [
  { bg: MAROON, icon: Footprints },
  { bg: TEAL, icon: Users },
  { bg: '#C2410C', icon: ShieldAlert },
  { bg: NAVY, icon: Megaphone },
  { bg: '#7A3E9D', icon: FileText },
  { bg: '#B4620A', icon: Landmark },
];

// Hanging string of pennants. Pennants sit on a quadratic curve between anchor
// points so they follow the sag of the string.
const Bunting: React.FC = () => {
  const colors = JAIN_FLAG; // five-colour Jain flag, repeating along the whole string
  const segments = 6;
  const segW = 200;
  const pennants: { x: number; y: number; c: string; key: string }[] = [];
  let path = '';
  for (let s = 0; s < segments; s++) {
    const x0 = s * segW, x1 = x0 + segW, cx = x0 + segW / 2;
    if (s === 0) path += `M${x0},4`;
    path += ` Q${cx},34 ${x1},4`;
    for (let i = 0; i < 5; i++) {
      const t = 0.1 + i * 0.2;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * 34 + t * t * 4;
      pennants.push({ x, y, c: colors[(s * 5 + i) % colors.length], key: `${s}-${i}` });
    }
  }
  return (
    <svg viewBox={`0 0 ${segments * segW} 80`} preserveAspectRatio="xMidYMin slice" className="absolute top-14 md:top-16 left-0 w-full h-16 md:h-20 pointer-events-none" aria-hidden="true">
      <path d={path} fill="none" stroke="#5B2A0B" strokeWidth="2" opacity="0.55" />
      {pennants.map(p => (
        <polygon key={p.key} points={`${p.x - 15},${p.y} ${p.x + 15},${p.y} ${p.x},${p.y + 38}`} fill={p.c} stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      ))}
    </svg>
  );
};

const Cloud: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 50" className={`absolute pointer-events-none motion-safe:animate-ssg-float ${className}`} aria-hidden="true">
    <path d="M22 44c-11 0-20-7-20-15 0-7 6-13 15-14C19 7 27 2 37 2c9 0 17 5 20 12 3-3 8-5 13-5 11 0 19 7 19 17 0 1 0 3-1 4 12 1 20 6 20 13H22z" fill="#fff" opacity="0.92" />
  </svg>
);

const SectionTitle: React.FC<{ eyebrow?: string; children: React.ReactNode; light?: boolean }> = ({ eyebrow, children, light }) => (
  <div className="text-center mb-8 md:mb-12">
    {eyebrow && (
      <span className={`inline-block px-4 py-1 rounded-full text-xs font-extrabold tracking-[0.2em] uppercase mb-3 ${light ? 'bg-white/20 text-white' : 'bg-[#FFE4B8] text-[#9E1B1B]'}`}>{eyebrow}</span>
    )}
    <h2 className={`ssg-display text-3xl md:text-5xl font-extrabold uppercase tracking-tight ${light ? 'text-white' : 'text-[#7A1414]'}`}>{children}</h2>
  </div>
);

const PillButton: React.FC<{ href?: string; onClick?: () => void; variant: 'gold' | 'white' | 'maroon'; icon: React.ReactNode; children: React.ReactNode }> = ({ href, onClick, variant, icon, children }) => {
  const styles = {
    gold: 'bg-[#FDBA21] text-[#4A1608] hover:bg-[#ffc94d]',
    white: 'bg-white text-[#7A1414] hover:bg-[#FFF6E5]',
    maroon: 'bg-[#9E1B1B] text-white hover:bg-[#B52424]',
  }[variant];
  const chip = variant === 'maroon' ? 'bg-white/20' : 'bg-black/10';
  const cls = `inline-flex items-center gap-3 pl-2 pr-6 py-2 rounded-full font-extrabold text-sm md:text-base shadow-[0_6px_0_rgba(90,30,10,0.25)] active:translate-y-0.5 active:shadow-[0_3px_0_rgba(90,30,10,0.25)] transition-all ${styles}`;
  const inner = (<><span className={`w-9 h-9 rounded-full flex items-center justify-center ${chip}`}>{icon}</span>{children}</>);
  return href ? <a href={href} className={cls}>{inner}</a> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
};

interface SsgLandingProps {
  onGetStarted: () => void;
}

const SsgLanding: React.FC<SsgLandingProps> = ({ onGetStarted }) => {
  const { lang } = useLanguage();
  // The install banner is fixed to the bottom edge; keep the floating buttons above it until it is dismissed.
  const [installDismissed, setInstallDismissed] = React.useState(false);
  const c = COPY[lang] ?? COPY.en;
  const waLink = `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(c.whatsappText)}`;
  const goRegister = () => { window.location.href = '/login?register=1'; };

  return (
    <div className="ssg-landing min-h-screen bg-[#FFF6E5] text-[#3B1A0B] font-sans overflow-x-hidden">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 md:h-16 flex items-center gap-2 sm:gap-3">
          <a href="#home" className="flex items-center gap-2 min-w-0">
            <img src={BRAND.logo} alt="" className="h-9 w-9 object-contain" />
            <span className="ssg-display font-extrabold text-[#7A1414] text-base md:text-lg leading-tight truncate">
              {lang === 'en' ? BRAND.name : 'શ્રમણ સેવા ગ્રુપ'}
            </span>
          </a>
          <nav className="hidden lg:flex items-center gap-7 mx-auto text-xs font-extrabold tracking-wider uppercase text-[#3B1A0B]">
            <a href="#home" className="text-[#E8730C]">{c.nav.home}</a>
            <a href="#prerna" className="hover:text-[#E8730C]">{c.nav.prerna}</a>
            <a href="#features" className="hover:text-[#E8730C]">{c.nav.features}</a>
            <a href="#how" className="hover:text-[#E8730C]">{c.nav.how}</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <LanguageDropdown />
            <button type="button" onClick={onGetStarted} aria-label={c.nav.login} className="inline-flex items-center justify-center gap-1.5 h-9 px-3 min-[400px]:px-4 rounded-full bg-[#9E1B1B] text-white text-xs md:text-sm font-extrabold hover:bg-[#B52424] transition-colors">
              <LogIn size={15} /> <span className="hidden min-[400px]:inline">{c.nav.login}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative pt-14 md:pt-16 pb-24 bg-gradient-to-b from-[#F57F17] via-[#FFA726] to-[#FFE0A3] overflow-hidden">
        {/* rotating sunburst */}
        <div
          className="absolute left-1/2 top-[34%] w-[240vmax] h-[240vmax] -translate-x-1/2 -translate-y-1/2 motion-safe:animate-ssg-rays opacity-60 pointer-events-none"
          style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.28) 0deg 7deg, rgba(255,255,255,0) 7deg 15deg)' }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,236,170,0.75),rgba(255,236,170,0)_55%)] pointer-events-none" aria-hidden="true" />
        <Bunting />
        <Cloud className="w-24 md:w-36 left-[4%] top-40 md:top-48" />
        <Cloud className="w-20 md:w-28 right-[5%] top-72 md:top-64" />

        <Mascot />

        <div className="relative max-w-3xl mx-auto px-4 pt-24 md:pt-28 text-center">
          <div className="mx-auto w-56 md:w-72 rounded-[2rem] bg-white p-2 shadow-[0_18px_40px_rgba(120,40,0,0.35)] ring-4 ring-white/60">
            <img src={BRAND.logoFull} alt={BRAND.name} className="w-full h-auto rounded-[1.5rem]" fetchpriority="high" decoding="async" />
          </div>

          <h1 className="ssg-display mt-8 text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-white [text-shadow:0_3px_0_rgba(122,20,20,0.55)] leading-tight">
            {c.heroTitle}
          </h1>
          <p className="mt-4 text-base md:text-lg text-[#4A1608] font-semibold max-w-xl mx-auto">{c.heroSub}</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton variant="gold" onClick={onGetStarted} icon={<LogIn size={18} />}>{c.ctaLogin}</PillButton>
            <PillButton variant="white" onClick={goRegister} icon={<UserPlus size={18} />}>{c.ctaRegister}</PillButton>
          </div>
        </div>
      </section>

      {/* PRERNA */}
      <section id="prerna" className="relative py-16 md:py-24 bg-[#FFF6E5]">
        <div className="max-w-5xl mx-auto px-4">
          <SectionTitle eyebrow={c.prernaLabel}>{c.prernaHeading}</SectionTitle>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-3 rounded-[2.5rem] bg-[#FDBA21] rotate-3" aria-hidden="true" />
              <div className="relative rounded-[2rem] overflow-hidden bg-[#F9A825] shadow-[0_18px_40px_rgba(120,40,0,0.3)] aspect-[3/4]">
                <img src={guruPhoto} alt="" className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" decoding="async" />
                <div className="absolute inset-x-0 bottom-0 pt-24 pb-5 px-5 bg-gradient-to-t from-[#5A0F0F] via-[#5A0F0F]/80 to-transparent text-center">
                  <p className="ssg-display text-white/80 text-xs font-bold tracking-[0.2em] mb-1">{COPY.gu.prernaLabel}:</p>
                  <p className="ssg-display text-[#FDBA21] text-lg md:text-xl font-extrabold leading-snug">{c.prernaLines[0]}</p>
                  <p className="ssg-display text-white text-base md:text-lg font-bold leading-snug">{c.prernaLines[1]}</p>
                  <p className="ssg-display text-white text-base md:text-lg font-bold leading-snug">{c.prernaLines[2]}</p>
                </div>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="ssg-display text-xl md:text-2xl font-extrabold text-[#7A1414] leading-snug">{PRERNA_NAME[0]}</p>
              <p className="ssg-display mt-1 text-lg md:text-xl font-bold text-[#7A1414] leading-snug">{PRERNA_NAME[1]}</p>
              <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#9BB5C8] to-transparent md:from-[#9BB5C8]" />
              <p className="ssg-display text-3xl md:text-4xl font-extrabold text-[#E8730C] leading-snug">{c.prernaPrayer}</p>
              <div className="my-6 h-px bg-gradient-to-r from-transparent via-[#9BB5C8] to-transparent md:from-[#9BB5C8]" />
              <p className="text-base md:text-lg text-[#5C3A28] font-medium leading-relaxed">{c.prernaNote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-16 md:py-24 bg-gradient-to-b from-[#FFE9C2] to-[#FFF6E5]">
        <div className="max-w-6xl mx-auto px-4">
          <SectionTitle eyebrow={BRAND.shortName}>{c.featuresHeading}</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {c.features.map((f, i) => {
              const { bg, icon: Icon } = FEATURE_STYLES[i];
              return (
                <article key={f.title} className="relative rounded-[1.75rem] md:rounded-[2rem] p-5 md:p-7 text-white shadow-[0_10px_0_rgba(60,20,5,0.18)] flex flex-col min-h-[210px] md:min-h-[260px]" style={{ backgroundColor: bg }}>
                  <span className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                    <Icon size={26} />
                  </span>
                  <h3 className="ssg-display text-lg md:text-2xl font-extrabold text-[#FDBA21] leading-tight">{f.title}</h3>
                  <p className="mt-2 text-xs md:text-sm font-medium text-white/90 leading-relaxed">{f.desc}</p>
                  {i === 5 && (
                    <a href="/nearby-derasar" className="mt-auto pt-4 inline-flex items-center gap-1 text-xs md:text-sm font-extrabold text-white underline underline-offset-4">
                      {c.footerFind} <ArrowRight size={14} />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-16 md:py-24 bg-[#FFF6E5]">
        <div className="max-w-5xl mx-auto px-4">
          <SectionTitle>{c.howHeading}</SectionTitle>
          <ol className="grid md:grid-cols-3 gap-5 md:gap-8">
            {c.steps.map((s, i) => (
              <li key={s.title} className="relative bg-white rounded-[1.75rem] p-6 pt-10 shadow-[0_10px_0_rgba(160,80,10,0.12)] border border-orange-100">
                <span className="absolute -top-5 left-6 w-11 h-11 rounded-full bg-[#9E1B1B] text-[#FDBA21] ssg-display font-extrabold text-xl flex items-center justify-center shadow-lg ring-4 ring-[#FFF6E5]">{i + 1}</span>
                <h3 className="ssg-display text-xl font-extrabold text-[#7A1414]">{s.title}</h3>
                <p className="mt-2 text-sm text-[#5C3A28] leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* JOIN */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-[#E8730C] to-[#C2410C] overflow-hidden text-center">
        <div
          className="absolute left-1/2 top-1/2 w-[200vmax] h-[200vmax] -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
          style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.22) 0deg 7deg, rgba(255,255,255,0) 7deg 15deg)' }}
          aria-hidden="true"
        />
        <div className="relative max-w-2xl mx-auto px-4">
          <h2 className="ssg-display text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-white [text-shadow:0_3px_0_rgba(90,15,15,0.5)]">{c.joinHeading}</h2>
          <p className="mt-4 text-white/95 font-semibold">{c.joinSub}</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton variant="gold" onClick={goRegister} icon={<UserPlus size={18} />}>{c.ctaRegister}</PillButton>
            <PillButton variant="white" onClick={onGetStarted} icon={<LogIn size={18} />}>{c.ctaLogin}</PillButton>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#3B0F0F] text-white/85 py-10 pb-40 md:pb-32">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <img src={BRAND.logo} alt="" className="h-12 w-12 rounded-xl bg-white p-1 object-contain" loading="lazy" decoding="async" />
            <div>
              <p className="ssg-display font-extrabold text-white text-lg">{lang === 'en' ? BRAND.name : 'શ્રમણ સેવા ગ્રુપ'}</p>
              <p className="text-xs text-[#FDBA21] font-semibold">{BRAND.slogan}</p>
            </div>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold">
            <a href="/nearby-derasar" className="hover:text-[#FDBA21]">{c.footerFind}</a>
            <a href="/directory" className="hover:text-[#FDBA21]">{c.footerDirectory}</a>
            <a href="/privacy" className="hover:text-[#FDBA21]">{c.footerPrivacy}</a>
            <a href="/delete-account" className="hover:text-[#FDBA21]">{c.footerDelete}</a>
            {BRAND.instagram && <a href={BRAND.instagram.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#FDBA21]">{BRAND.instagram.handle}</a>}
          </nav>
        </div>
        <div className="mt-8 pt-5 border-t border-white/10 max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-3 text-xs text-white/60">
          <p>© {new Date().getFullYear()} {BRAND.name}</p>
          <span className="hidden sm:inline text-white/20" aria-hidden="true">|</span>
          <div className="flex items-center gap-2.5">
            <span>Developed by <strong className="font-semibold text-white/80">{DEVELOPER.name}</strong></span>
            <span className="inline-flex items-center bg-white rounded-lg px-2 py-1">
              <img src={developerLogo} alt="VJAS" className="h-6 w-auto" loading="lazy" decoding="async" />
            </span>
            <a
              href={`https://wa.me/${DEVELOPER.whatsapp}?text=${encodeURIComponent(DEVELOPER.whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp ${DEVELOPER.name}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] text-white hover:scale-105 transition-transform"
            >
              <WhatsAppIcon size={18} />
            </a>
          </div>
        </div>
      </footer>

      {/* sticky actions */}
      <div className={`fixed right-4 z-40 flex items-center gap-3 ${installDismissed ? 'bottom-4' : 'bottom-24'}`}>
        <button type="button" onClick={onGetStarted} className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#FDBA21] text-[#4A1608] font-extrabold text-sm shadow-lg hover:bg-[#ffc94d] transition-colors">
          <LogIn size={16} /> {c.ctaLogin}
        </button>
        <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label={c.whatsappLabel} className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
          <WhatsAppIcon size={32} />
        </a>
      </div>
      <InstallPWA onDismiss={() => setInstallDismissed(true)} />
    </div>
  );
};

export default SsgLanding;
