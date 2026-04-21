import React, { useState } from 'react';
import { UserRole } from '../types';

// WhatsApp inline SVG (replaces Font Awesome dependency for this component)
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface Step {
  emoji: string;
  title: string;
  description: string;
  highlight?: string; // optional bold/colored keyword
  tip?: string;       // optional tip box
}

const CAPTAIN_STEPS: Step[] = [
  {
    emoji: '🎉',
    title: 'Welcome, Captain!',
    description: 'You\'re all set to manage your organization\'s Vihar Seva digitally. Let\'s take a quick tour so you can get started.',
  },
  {
    emoji: '👥',
    title: 'Add Your Sevaks First',
    description: 'Go to the "Add Sevaks" tab to create accounts for each volunteer. After adding, tap the',
    highlight: 'WhatsApp button',
    tip: 'This sends the sevak their login credentials directly on WhatsApp so they can log in to vSeva.',
  },
  {
    emoji: '🗺️',
    title: 'Set Up Vihar Routes',
    description: 'Head to "Manage Routes" to define the paths your group walks. Setting distances ensures accurate km tracking for every entry.',
  },
  {
    emoji: '📋',
    title: 'Log Vihar Entries',
    description: 'Use "New Entry" to record each Vihar your team completes — select the date, route, Sadhus, and participating Sevaks.',
  },
  {
    emoji: '✅',
    title: 'You\'re Ready!',
    description: 'Your dashboard will automatically show live stats, rankings, and activity for your entire organization. Jai Jinendra!',
  },
];

const SEVAK_STEPS: Step[] = [
  {
    emoji: '🙏',
    title: 'Welcome to vSeva!',
    description: 'Your Captain has added you to the team. vSeva helps you track and celebrate your Vihar Seva contributions.',
  },
  {
    emoji: '📱',
    title: 'Get Your Login Details',
    description: 'Ask your Captain to tap the',
    highlight: 'WhatsApp button',
    tip: 'Your Captain will send your Username and Password directly to your WhatsApp, so you can log in anytime.',
  },
  {
    emoji: '🏠',
    title: 'Your Profile',
    description: 'Tap "Home / My Profile" to see your personal stats — total km, vihars, ranking, and more. You can also update your blood group and emergency contact here.',
  },
  {
    emoji: '📊',
    title: 'View Your Analytics',
    description: 'The "Analytics" tab shows your contribution over time with beautiful charts and your organization rank.',
  },
  {
    emoji: '🔄',
    title: 'Vihar Entries Are Managed by Your Captain',
    description: 'You don\'t need to log entries yourself. Your Captain records each Vihar, and it automatically appears in your profile and stats.',
    tip: 'Your Vihar history and km count will grow as your Captain keeps logging — just keep doing Seva! 🚶',
  },
  {
    emoji: '✅',
    title: 'You\'re All Set!',
    description: 'Start exploring the app. Every step you take in seva is captured here. Keep it up — Jai Jinendra!',
  },
];

interface OnboardingWalkthroughProps {
  role: UserRole;
  onDone: () => void;
}

const OnboardingWalkthrough: React.FC<OnboardingWalkthroughProps> = ({ role, onDone }) => {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const steps = role === UserRole.ORG_ADMIN ? CAPTAIN_STEPS : SEVAK_STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleDone = () => {
    setExiting(true);
    setTimeout(() => {
      onDone();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: 'rgba(15, 10, 5, 0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className={`bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[28px] shadow-2xl overflow-hidden transition-transform duration-300 ${exiting ? 'translate-y-full sm:scale-95' : 'translate-y-0 sm:scale-100'}`}
        style={{ maxHeight: '90vh' }}
      >
        {/* Top color band */}
        <div className="h-1.5 bg-gradient-to-r from-saffron-400 via-orange-500 to-amber-400" />

        {/* Step counter pill */}
        <div className="flex justify-center pt-5 pb-1">
          <span className="text-[11px] font-bold text-saffron-600 bg-saffron-50 border border-saffron-100 px-3 py-1 rounded-full tracking-widest uppercase">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-2 text-center">
          {/* Emoji */}
          <div className="text-6xl mb-4 leading-none select-none">{current.emoji}</div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{current.title}</h2>

          {/* Description */}
          <p className="text-sm text-gray-500 leading-relaxed">
            {current.description}
            {current.highlight && (
              <>
                {' '}
                <span className="inline-flex items-center gap-1 font-bold text-[#25D366]">
                  <WhatsAppIcon />
                  {current.highlight}
                </span>
                {' '}on your profile card.
              </>
            )}
          </p>

          {/* Optional tip box */}
          {current.tip && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left">
              <p className="text-[12px] text-amber-800 leading-relaxed">
                💡 {current.tip}
              </p>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 h-2 bg-saffron-500'
                  : i < step
                  ? 'w-2 h-2 bg-saffron-300'
                  : 'w-2 h-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-8 flex gap-3">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex-shrink-0 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
            >
              Back
            </button>
          ) : (
            <button
              onClick={handleDone}
              className="flex-shrink-0 px-5 py-3 text-gray-400 hover:text-gray-600 font-medium rounded-xl transition-colors text-sm"
            >
              Skip
            </button>
          )}

          <button
            onClick={handleNext}
            className={`flex-1 py-3 font-bold rounded-xl text-sm transition-all shadow-md ${
              isLast
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
                : 'bg-saffron-500 hover:bg-saffron-600 text-white shadow-saffron-200'
            }`}
          >
            {isLast ? '🎉 Let\'s Go!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWalkthrough;
