import React from 'react';
import { ChevronLeft, Phone } from 'lucide-react';
import { BRAND } from '@brand';
import WhatsAppIcon from '../components/WhatsAppIcon';

// Public "Contact us" page (no login): who to reach for a demo/guide and for technical support.
// The people and numbers come from the brand's settings (brands/<id>/meta.ts).
const display = (digits: string) => `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

const ContactUs: React.FC = () => (
  <div className="min-h-screen bg-[#FDFBF7]">
    <header className="border-b border-orange-100 bg-white">
      <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
        <a href="/login" className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-100 bg-[#FDFBF7]" aria-label="Back">
          <ChevronLeft size={16} className="text-[#241C17]" />
        </a>
        <span className="text-lg font-extrabold text-saffron-600">{BRAND.shortName}</span>
      </div>
    </header>

    <main className="mx-auto max-w-md px-5 py-8">
      <h1 className="text-2xl font-extrabold text-[#241C17]">Contact us</h1>
      <p className="mt-1 text-sm text-[#8A6A57]">We're happy to help — reach out on WhatsApp or call.</p>

      <div className="mt-6 space-y-3">
        {BRAND.supportContacts.map((c) => (
          <div key={c.role} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-saffron-600">{c.role}</p>
            <p className="mt-1 text-lg font-bold text-[#241C17]">{c.name}</p>
            <p className="font-mono text-sm text-[#8A6A57]">{display(c.phone)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/91${c.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white transition hover:brightness-95"
              >
                <WhatsAppIcon size={18} /> WhatsApp
              </a>
              <a
                href={`tel:+91${c.phone}`}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-saffron-200 bg-white text-sm font-bold text-saffron-700 transition hover:bg-saffron-50"
              >
                <Phone size={16} /> Call
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
);

export default ContactUs;
