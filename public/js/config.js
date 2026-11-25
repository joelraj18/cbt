// Site-wide configuration. Edit this file to rebrand the site or switch on Google AdSense.

export const SITE = {
  name: 'CBT Toolkit',
  tagline: 'Evidence-based CBT exercises, explained simply',
  // Shown in the footer; set to your domain once deployed (e.g. 'https://cbt.example.com').
  url: '',
  version: '1.0.0',
};

/* ------------------------------------------------------------------------------------
   Google AdSense
   1. Get approved at https://adsense.google.com and copy your publisher ID (ca-pub-…).
   2. Paste it into `client` below and into public/ads.txt (replace the placeholder line).
   3. Create display ad units in AdSense and paste each unit's slot ID into `slots`.
   4. In AdSense → Privacy & messaging, enable the GDPR/US-states messages (Google-certified
      consent management) if you have visitors in the EEA, UK or Switzerland.
   Ads never load until the visitor agrees in the consent prompt, and they are never shown
   on the pages listed in `adFreeRoutes` (crisis help, exercises, journal, check-ins, reports…).
   ------------------------------------------------------------------------------------ */
export const ADS = {
  enabled: true,               // master switch for ad slots
  client: '',                  // e.g. 'ca-pub-1234567890123456' — empty = no ads load
  slots: {                     // AdSense ad-unit slot IDs (data-ad-slot)
    banner: '',                // wide banner between page sections
    inArticle: '',             // inside long articles / learn pages
    sidebar: '',               // side column on wide screens
    footer: '',                // above the footer
  },
  showPlaceholders: true,      // show labelled empty boxes while `client` is empty (so you can see the space)
  requireConsent: true,        // ask visitors before loading Google's ad script
  adFreeRoutes: ['today', 'programs', 'help', 'exercise', 'toolbox', 'check-in', 'journal', 'reports', 'mood', 'plan', 'settings', 'privacy'],
};
