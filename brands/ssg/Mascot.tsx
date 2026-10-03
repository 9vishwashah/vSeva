import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import walkA from './assets/mascot/walkA.webp';
import walkB from './assets/mascot/walkB.webp';
import wave from './assets/mascot/wave.webp';
import namaste from './assets/mascot/namaste.webp';

// A small Vihar-journey companion for the SSG landing hero. Purely decorative:
//  * four pre-cut poses of the supplied character, swapped with CSS opacity — no animation
//    library, no canvas, no JS animation loop; only transform/opacity are animated.
//  * entrance (1.4s): walks in from the right (two stride frames, mirrored to face left),
//    leaving a few faint footprints; then loops hands-joined (namaste) <-> raised-hand
//    blessing, every ~1.7s each, with a barely-visible breathing motion.
//  * tap / click / Enter on the character opens a thought-cloud with the next of the supplied
//    quotes (cycles in order, closes by itself after a few seconds, Escape or another tap).
//  * absolutely positioned inside the hero (scrolls away with it) in clear space beside the
//    content, fixed box size so nothing shifts. Only the character itself takes clicks.
//  * prefers-reduced-motion: static namaste pose, no footprints, no motion (quotes still work).
//  * mounted shortly after first paint and only starts animating once its images are loaded,
//    so it never competes with the hero's own content or plays on an empty frame.
//
// Placement: the hero's content column is centred, so on phones/tablets the mascot stands
// beside the logo card (card geometry: top 152px / 224px wide on phones, 176px / 288px from
// md up — keep in sync with Landing.tsx), and from lg up in the free right-hand margin.

const CSS = `
.ssg-mascot{--hw:34px;position:absolute;z-index:2;pointer-events:none;aspect-ratio:316/512;height:110px;
  top:calc(152px + 224px - 110px);right:calc(50% - 112px - 68px);opacity:0}
.ssg-mascot.is-ready{opacity:1}
@media (min-width:768px){.ssg-mascot{--hw:46px;height:150px;top:calc(176px + 288px - 150px);right:calc(50% - 144px - 93px)}}
@media (min-width:1024px){.ssg-mascot{--hw:58px;height:190px;top:auto;bottom:12%;right:4%}}
@media (min-width:1280px){.ssg-mascot{--hw:71px;height:230px;right:8%}}

.ssg-m-slide,.ssg-m-bob,.ssg-m-breathe,.ssg-m-stack{width:100%;height:100%}
.ssg-m-stack{position:relative}
.ssg-m-f{position:absolute;inset:0;width:100%;height:100%;opacity:0;user-select:none;-webkit-user-drag:none}
.ssg-m-flip{transform:scaleX(-1)}

.ssg-mascot.is-ready .ssg-m-slide{animation:ssg-m-slide 1.4s cubic-bezier(.25,.6,.35,1) both}
.ssg-mascot.is-ready .ssg-m-bob{animation:ssg-m-bob .35s ease-in-out 4}
.ssg-mascot.is-ready .ssg-m-wa{animation:ssg-m-wa .7s step-end 2}
.ssg-mascot.is-ready .ssg-m-wb{animation:ssg-m-wb .7s step-end 2}
.ssg-mascot.is-ready .ssg-m-n{animation:ssg-m-n 3.4s step-end 1.4s infinite}
.ssg-mascot.is-ready .ssg-m-w{animation:ssg-m-w 3.4s step-end 1.4s infinite}
.ssg-mascot.is-ready .ssg-m-breathe{transform-origin:50% 100%;animation:ssg-m-breathe 5s ease-in-out 1.4s infinite}

@keyframes ssg-m-slide{from{transform:translate3d(150px,0,0);opacity:0}12%{opacity:1}to{transform:translate3d(0,0,0);opacity:1}}
@keyframes ssg-m-bob{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-4px,0)}}
@keyframes ssg-m-wa{0%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes ssg-m-wb{0%{opacity:0}50%{opacity:1}100%{opacity:1}}
/* hands joined for the first half of each cycle, raised-hand blessing for the second */
@keyframes ssg-m-n{0%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes ssg-m-w{0%{opacity:0}50%{opacity:1}100%{opacity:1}}
@keyframes ssg-m-breathe{0%,100%{transform:scale3d(1,1,1)}50%{transform:scale3d(1.008,1.014,1)}}

.ssg-m-prints{position:absolute;inset:0}
.ssg-m-fp{position:absolute;bottom:3%;width:9px;height:14px;opacity:0;transform:rotate(-90deg)}
.ssg-mascot.is-ready .ssg-m-fp{animation:ssg-m-print 2.6s ease-out both}
.ssg-m-fp:nth-child(1){left:calc(50% + 111px);margin-bottom:3px;animation-delay:.2s!important}
.ssg-m-fp:nth-child(2){left:calc(50% + 70px);margin-bottom:-2px;animation-delay:.45s!important}
.ssg-m-fp:nth-child(3){left:calc(50% + 40px);margin-bottom:3px;animation-delay:.7s!important}
.ssg-m-fp:nth-child(4){left:calc(50% + 18px);margin-bottom:-2px;animation-delay:.95s!important}
@keyframes ssg-m-print{0%{opacity:0}10%{opacity:.8}65%{opacity:.8}100%{opacity:0}}

/* the character is the only part that takes clicks */
.ssg-m-hit{position:absolute;inset:0;z-index:2;pointer-events:auto;cursor:pointer;background:none;border:0;padding:0;border-radius:18px;-webkit-tap-highlight-color:transparent}
.ssg-m-hit:focus-visible{outline:3px solid #7A1414;outline-offset:2px}

/* thought-cloud with the quote, above the head, right-aligned to the character */
.ssg-m-cloud{position:absolute;right:0;bottom:calc(100% + 20px);z-index:3;width:max-content;max-width:min(250px,68vw);
  background:#fff;color:#7A1414;border-radius:26px;padding:12px 18px;text-align:center;
  font-family:'Anek Gujarati','Noto Sans Gujarati','Manrope',sans-serif;font-weight:700;font-size:15px;line-height:1.5;
  box-shadow:0 10px 26px rgba(90,30,10,.28);pointer-events:none;transform-origin:calc(100% - var(--hw)) 100%;animation:ssg-m-pop .28s ease-out both}
.ssg-m-cloud::before,.ssg-m-cloud::after{content:"";position:absolute;background:#fff;border-radius:50%;box-shadow:0 4px 10px rgba(90,30,10,.18)}
.ssg-m-cloud::before{width:15px;height:15px;bottom:-12px;right:calc(var(--hw) - 2px)}
.ssg-m-cloud::after{width:9px;height:9px;bottom:-23px;right:calc(var(--hw) - 8px)}
@media (min-width:1024px){.ssg-m-cloud{font-size:17px;max-width:280px}}
@keyframes ssg-m-pop{from{opacity:0;transform:scale(.85) translate3d(0,6px,0)}to{opacity:1;transform:scale(1) translate3d(0,0,0)}}

/* lighter on phones: two footprints, no idle breathing */
@media (max-width:767px){
  .ssg-m-fp:nth-child(n+3){display:none}
  .ssg-mascot.is-ready .ssg-m-breathe{animation:none}
  .ssg-m-fp:nth-child(1){left:calc(50% + 60px)}
  .ssg-m-fp:nth-child(2){left:calc(50% + 30px)}
}

@media (prefers-reduced-motion:reduce){
  .ssg-mascot .ssg-m-slide,.ssg-mascot .ssg-m-bob,.ssg-mascot .ssg-m-breathe{animation:none!important;transform:none!important}
  .ssg-mascot .ssg-m-wa,.ssg-mascot .ssg-m-wb,.ssg-mascot .ssg-m-w{animation:none!important;opacity:0!important}
  .ssg-mascot .ssg-m-n{animation:none!important;opacity:1!important}
  .ssg-mascot .ssg-m-prints{display:none}
  .ssg-m-cloud{animation:none}
}
`;

const Footprint: React.FC = () => (
  <svg className="ssg-m-fp" viewBox="0 0 10 16" fill="#E8730C" aria-hidden="true">
    <ellipse cx="5" cy="11" rx="3.6" ry="4.8" />
    <circle cx="2" cy="4.6" r="1.3" />
    <circle cx="4.3" cy="2.8" r="1.3" />
    <circle cx="6.6" cy="2.8" r="1.3" />
    <circle cx="8.6" cy="4.8" r="1.1" />
  </svg>
);

// Quotes shown in the thought-cloud, in this order (line breaks as supplied).
const QUOTES: string[][] = [
  ['ભાગ્ય થી ભગવાન મળે,', 'ને ભાવથી ભગવાન ફળે.'],
  ['દિલ પહેલા તૂટે છે', 'પછી સંબંધ તૂટે છે'],
  ['Positive Thinking..', 'પ્રસન્નતાને ટકાવી રાખે છે.'],
  ['માણસ ના ગણિત કેવા હોય છે,', 'વિશ્વાસ પર શંકા છે,', 'ને શંકા પર વિશ્વાસ છે..!'],
  ['જ્યાં પુછાય નહીં કેમ?', 'એનું નામ પ્રેમ', 'એ ઘર કુશળક્ષેમ,', 'એના પર પ્રભુ ની રહેમ.'],
];
const QUOTE_SHOW_MS = 9000;
const TAP_LABEL = { en: 'Tap for a quote', gu: 'સુવિચાર માટે ટૅપ કરો', hi: 'सुविचार के लिए टैप करें' } as const;

const REQUIRED_IMAGES = 3; // walk A, walk B, namaste — the wave pose is a bonus and may arrive late

const Mascot: React.FC = () => {
  const [mounted, setMounted] = React.useState(false);
  const [loaded, setLoaded] = React.useState(0);
  const { lang } = useLanguage();
  const [quote, setQuote] = React.useState<number | null>(null);
  const lastQuote = React.useRef(-1);
  const seen = React.useRef<Set<string>>(new Set());
  const root = React.useRef<HTMLDivElement>(null);

  // Mount just after first paint so the hero's own content is never delayed by the mascot.
  React.useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 350);
    return () => window.clearTimeout(id);
  }, []);

  // Each required image counts once, whether it loads now or was already cached.
  const mark = React.useCallback((name: string) => {
    if (seen.current.has(name)) return;
    seen.current.add(name);
    setLoaded(seen.current.size);
  }, []);

  React.useEffect(() => {
    if (!mounted || !root.current) return;
    root.current.querySelectorAll<HTMLImageElement>('img[data-req]').forEach((img) => {
      if (img.complete && img.naturalWidth > 0) mark(img.dataset.req as string);
    });
  }, [mounted, mark]);

  // Auto-close, and Escape closes.
  React.useEffect(() => {
    if (quote === null) return;
    const t = window.setTimeout(() => setQuote(null), QUOTE_SHOW_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setQuote(null); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [quote]);

  if (!mounted) return null;

  const showNext = () => {
    lastQuote.current = (lastQuote.current + 1) % QUOTES.length;
    setQuote(lastQuote.current);
  };

  const req = (name: string) => ({ 'data-req': name, onLoad: () => mark(name) });
  const img = { decoding: 'async' as const, draggable: false, alt: '', fetchpriority: 'low' } as any;

  return (
    <div ref={root} className={`ssg-mascot${loaded >= REQUIRED_IMAGES ? ' is-ready' : ''}`}>
      <style>{CSS}</style>
      <div className="ssg-m-prints">
        <Footprint /><Footprint /><Footprint /><Footprint />
      </div>
      <div className="ssg-m-slide">
        <div className="ssg-m-bob">
          <div className="ssg-m-breathe">
            <div className="ssg-m-stack">
              <img src={walkA} className="ssg-m-f ssg-m-flip ssg-m-wa" {...img} {...req('walkA')} />
              <img src={walkB} className="ssg-m-f ssg-m-flip ssg-m-wb" {...img} {...req('walkB')} />
              <img src={namaste} className="ssg-m-f ssg-m-n" {...img} {...req('namaste')} />
              <img src={wave} className="ssg-m-f ssg-m-w" {...img} />
            </div>
          </div>
        </div>
      </div>
      <button type="button" className="ssg-m-hit" onClick={showNext} aria-label={TAP_LABEL[lang] ?? TAP_LABEL.en} />
      {quote !== null && (
        <div key={quote} className="ssg-m-cloud" role="status">{QUOTES[quote].map((line, i) => <div key={i}>{line}</div>)}</div>
      )}
    </div>
  );
};

export default Mascot;
