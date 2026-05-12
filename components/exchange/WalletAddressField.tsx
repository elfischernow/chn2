'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

const compileRegex = (raw: string | null | undefined): RegExp | null => {
  if (!raw) return null;
  try {
    return new RegExp(raw);
  } catch {
    return null;
  }
};

const noopSubscribe = () => () => {};
const noopServerSnapshot = () => false;
const getQrSupported = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window;
const getWalletAvailable = () =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { ethereum?: unknown }).ethereum);

const stripAddressUri = (raw: string): string => {
  const trimmed = raw.trim();
  const stripped = trimmed.replace(
    /^(bitcoin|ethereum|tron|ripple|solana|litecoin|monero|bitcoincash|dogecoin|dash):\/?\/?/i,
    '',
  );
  return stripped.split('?')[0]!.trim();
};

interface WalletAddressFieldProps {
  /** Currency ticker for default label and error messages — e.g. 'BTC'. */
  ticker: string;
  /** Override the floating-label text entirely. Falls back to
   *  `Enter the {ticker} payout address` when omitted. */
  label?: string;
  /** Validator from the upstream catalog. Null/undefined → no client-side
   *  check; the server-side validator on submit still applies. */
  addressRegex?: string | null;
  value: string;
  onChange: (next: string) => void;
  /** External (submit-time) error — wins over the local regex check. */
  externalError?: string | null;
}

/**
 * Recipient-address input shared by the private-transfer mode and every
 * inline mode on /exchange. Provides the floating-label + paste + QR-scan
 * + EIP-1193 wallet UX, plus per-chain regex validation against the
 * upstream catalog. The QR path uses the native `BarcodeDetector` API
 * (Chromium-only) with a fallback to a hidden file picker for browsers
 * that don't ship it.
 *
 * Was previously inlined inside `PrivateView`. Lifted here so /exchange's
 * Swap, Buy/Sell and Private tabs all share one address-collection UX.
 */
export function WalletAddressField({
  ticker,
  label,
  addressRegex,
  value,
  onChange,
  externalError,
}: WalletAddressFieldProps) {
  const qrFileRef = useRef<HTMLInputElement>(null);

  const qrSupported = useSyncExternalStore(
    noopSubscribe,
    getQrSupported,
    noopServerSnapshot,
  );
  const walletAvailable = useSyncExternalStore(
    noopSubscribe,
    getWalletAvailable,
    noopServerSnapshot,
  );

  const validator = useMemo(() => compileRegex(addressRegex), [addressRegex]);
  const localInvalid =
    validator != null && value.length > 0 && !validator.test(value.trim());
  const isInvalid = !!externalError || localInvalid;

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
    } catch {
      /* permission denied or no gesture — keyboard paste still works */
    }
  };

  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopCameraScan = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanOpen(false);
  };

  useEffect(() => () => stopCameraScan(), []);

  const startCameraScan = async () => {
    setScanError(null);
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      qrFileRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setScanOpen(true);
    } catch (err) {
      const name = (err as { name?: string } | null)?.name ?? '';
      const message =
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Camera access is blocked. Pick an image with the QR instead.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'No camera available on this device. Pick an image with the QR instead.'
            : name === 'NotReadableError'
              ? 'Camera is in use by another app. Pick an image with the QR instead.'
              : "Couldn't open the camera. Pick an image with the QR instead.";
      setScanError(message);
      qrFileRef.current?.click();
    }
  };

  useEffect(() => {
    if (!scanOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});

    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (b: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) return;
    const detector = new Detector({ formats: ['qr_code'] });

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          const code = codes[0]?.rawValue;
          if (code) {
            onChange(stripAddressUri(code));
            stopCameraScan();
            return;
          }
        } catch {
          /* transient decode error */
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scanOpen, onChange]);

  const onQRImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || typeof window === 'undefined') return;
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (b: ImageBitmap) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) return;
    try {
      const detector = new Detector({ formats: ['qr_code'] });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close?.();
      const code = codes[0]?.rawValue;
      if (!code) return;
      onChange(stripAddressUri(code));
    } catch {
      /* corrupted image / no QR — user can paste */
    }
  };

  const onUseWallet = async () => {
    const eth = (
      window as unknown as {
        ethereum?: { request?: (args: { method: string }) => Promise<unknown> };
      }
    ).ethereum;
    if (!eth?.request) return;
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (Array.isArray(accounts) && typeof accounts[0] === 'string') {
        onChange(accounts[0]);
      }
    } catch {
      /* user rejected the connect prompt */
    }
  };

  const labelText = label ?? `Enter the ${ticker} payout address`;
  const errorText = externalError
    ?? (localInvalid
      ? `Doesn't look like a valid ${ticker} address — double-check the chain and format.`
      : null);

  return (
    <>
      <div className="pt-address-field" data-invalid={isInvalid || undefined}>
        <label className="pt-address-input-wrap">
          <input
            className="pt-address-input"
            type="text"
            placeholder=" "
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Recipient wallet address"
            aria-invalid={isInvalid || undefined}
          />
          <span className="pt-address-floating-label">{labelText}</span>
        </label>
        <div className="pt-address-actions">
          {walletAvailable && (
            <button
              type="button"
              className="pt-address-paste pt-address-icon"
              onClick={onUseWallet}
              aria-label="Use connected wallet address"
              title="Use connected wallet"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
                <path d="M16 12h5" />
                <circle cx="17" cy="14" r="1" />
              </svg>
            </button>
          )}
          {qrSupported && (
            <button
              type="button"
              className="pt-address-paste pt-address-icon"
              onClick={startCameraScan}
              aria-label="Scan QR code with payout address"
              title="Scan QR"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3z" />
                <path d="M18 18h3v3h-3z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="pt-address-paste"
            onClick={pasteFromClipboard}
          >
            Paste
          </button>
        </div>
        {qrSupported && (
          <input
            ref={qrFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onQRImageSelected}
          />
        )}
        {errorText && (
          <span className="pt-address-error" role="alert">
            {errorText}
          </span>
        )}
      </div>

      {scanOpen && (
        <div
          className="qr-scan-overlay"
          role="dialog"
          aria-label="Scan QR code"
          onClick={(e) => {
            if (e.target === e.currentTarget) stopCameraScan();
          }}
        >
          <video
            ref={videoRef}
            className="qr-scan-video"
            muted
            playsInline
            autoPlay
          />
          <div className="qr-scan-hint">Point the camera at the QR code</div>
          <button type="button" className="qr-scan-close" onClick={stopCameraScan}>
            Cancel
          </button>
        </div>
      )}

      {scanError && !scanOpen && (
        <span className="pt-address-error" role="alert">
          {scanError}
        </span>
      )}
    </>
  );
}
