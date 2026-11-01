import React from 'react';
import { Phone } from 'lucide-react';

interface ContactActionButtonsProps {
    phone: string;
    name: string;
    size?: 'sm' | 'md';
    /** Plain brand logos (green WhatsApp bubble, blue dialer), WhatsApp first, with no tinted tile behind them.
     *  Used by the Emergency Contacts List and the Sevak Contact Directory. */
    logos?: boolean;
}

const WHATSAPP_GLYPH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

// The two logos used by `logos`: WhatsApp's green bubble with its white glyph, and a blue phone-dialer disc.
const WhatsAppLogo: React.FC<{ className: string }> = ({ className }) => (
    <svg viewBox="-2 -2 28 28" className={className} aria-hidden="true">
        <path d="M12 -1.5a13.5 13.5 0 1 1-6.9 25.1L-1.6 25.6l1.9-6.9A13.5 13.5 0 0 1 12 -1.5z" fill="#25D366" />
        <path d={WHATSAPP_GLYPH} fill="#fff" />
    </svg>
);

const DialerLogo: React.FC<{ className: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#1A73E8" />
        <path transform="translate(4.6 4.6) scale(0.62)" fill="#fff" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
    </svg>
);

// Call + WhatsApp only — no raw phone number shown as text anywhere this is used.
const ContactActionButtons: React.FC<ContactActionButtonsProps> = ({ phone, name, size = 'md', logos = false }) => {
    const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
    const iconSize = size === 'sm' ? 14 : 16;
    const phoneHref = `tel:+91${phone}`;
    const waHref = `https://wa.me/91${phone}`;

    if (logos) {
        const tap = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
        const logo = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
        const linkClass = `flex items-center justify-center ${tap} rounded-full transition-transform duration-150 hover:scale-110 active:scale-95`;
        return (
            <div className="flex items-center gap-1.5 shrink-0">
                <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className={linkClass} title={`WhatsApp ${name}`} aria-label={`WhatsApp ${name}`}>
                    <WhatsAppLogo className={logo} />
                </a>
                <a href={phoneHref} onClick={e => e.stopPropagation()}
                    className={linkClass} title={`Call ${name}`} aria-label={`Call ${name}`}>
                    <DialerLogo className={logo} />
                </a>
            </div>
        );
    }

    const callButton = (
        <a
            key="call"
            href={phoneHref}
            onClick={e => e.stopPropagation()}
            className={`flex items-center justify-center ${dim} rounded-xl bg-green-50 hover:bg-green-500 text-green-600 hover:text-white transition-all duration-150 shadow-sm hover:shadow-md active:scale-95`}
            title={`Call ${name}`}
        >
            <Phone size={iconSize} strokeWidth={2.5} />
        </a>
    );

    const whatsappButton = (
        <a
            key="whatsapp"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className={`flex items-center justify-center ${dim} rounded-xl bg-[#e8fdf0] hover:bg-[#25D366] text-[#25D366] hover:text-white transition-all duration-150 shadow-sm hover:shadow-md active:scale-95`}
            title={`WhatsApp ${name}`}
        >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px] leading-none" aria-hidden="true"><path d={WHATSAPP_GLYPH}/></svg>
        </a>
    );

    return (
        <div className="flex items-center gap-2 shrink-0">
            {callButton}{whatsappButton}
        </div>
    );
};

export default ContactActionButtons;
