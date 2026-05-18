'use client';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''}
      scriptProps={{ nonce }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
