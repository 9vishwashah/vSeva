import React from 'react';
import { ChevronLeft, Phone } from 'lucide-react';
import { BRAND } from '@brand';
import WhatsAppIcon from '../components/WhatsAppIcon';

// Public "Contact us" page (no login): who to reach for a demo/guide and for technical support.
// The people and numbers come from the brand's settings (brands/<id>/meta.ts).
const display = (digits: string) => `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

const ContactUs: React.FC = () => (
  <div className="min-h-screen bg-sunken/60">
    <header className="border-b border-brand-100 bg-surface">
      <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
        <a href="/login" className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-100 bg-sunken/60" aria-label="Back">
          <ChevronLeft size={16} className="text-ink" />
        </a>
        <span className="text-lg font-extrabold text-brand-700">{BRAND.shortName}</span>
      </div>
    </header>

    <main className="mx-auto max-w-md px-5 py-8">
      <h1 className="text-2xl font-extrabold text-ink">Contact us</h1>
      <p className="mt-1 text-sm text-ink-2">We're happy to help — reach out on WhatsApp or call.</p>

      <div className="mt-6 space-y-3">
        {BRAND.supportContacts.map((c) => (
          <div key={c.role} className="rounded-2xl border border-brand-100 bg-surface p-4 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-700">{c.role}</p>
            <p className="mt-1 text-lg font-bold text-ink">{c.name}</p>
            <p className="font-mono text-sm text-ink-2">{display(c.phone)}</p>
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
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-surface text-sm font-bold text-brand-700 transition hover:bg-brand-50"
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
