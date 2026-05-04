'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import type { Currency } from '@/lib/api/currencies';

import { CurrencyPicker } from '../../../CurrencyPicker';
import { amountSizeAttr, DECIMAL_RE, focusFieldInput } from '../../shared/utils';

/** Compile a per-chain regex from the upstream catalog. Returns `null`
 *  for absent or unparseable patterns so the validation falls open
 *  (better to let the legacy page do the strict check than to block
 *  submission on a regex our app failed to load). */
const compileRegex = (raw: string | null | undefined): RegExp | null => {
  if (!raw) return null;
  try {
    return new RegExp(raw);
  } catch {
    return null;
  }
};

/** No-op subscribe — `BarcodeDetector` / `window.ethereum` don't change
 *  identity at runtime, so we don't need to forward updates. Hooked into
 *  `useSyncExternalStore` purely to get hydration-safe feature detection
 *  without the setState-in-effect anti-pattern. */
const noopSubscribe = () => () => {};
const noopServerSnapshot = () => false;
const getQrSupported = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window;
const getWalletAvailable = () =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { ethereum?: unknown }).ethereum);

/** Crypto QR codes commonly use a URI scheme (BIP-21 and friends) — e.g.
 *  `bitcoin:1abc?amount=0.1` or `ethereum:0x…?value=…`. Strip the scheme
 *  prefix and any query parameters so we land a bare address in the
 *  field; the legacy page validates per-chain. */
const stripAddressUri = (raw: string): string => {
  const trimmed = raw.trim();
  const stripped = trimmed.replace(
    /^(bitcoin|ethereum|tron|ripple|solana|litecoin|monero|bitcoincash|dogecoin|dash):\/?\/?/i,
    '',
  );
  return stripped.split('?')[0]!.trim();
};

interface PrivateViewProps {
  currencies: readonly Currency[];
  /** Active ticker (uppercase). */
  ticker: string;
  /** Active network (lowercase) — used to disambiguate multi-network
   *  tickers like USDT-TRC20 vs USDT-ERC20. */
  network: string;
  /** Direction of editing — `'reverse'` (default) means the user types
   *  the recipient amount and the orchestrator displays the send total
   *  in the rate row; `'direct'` flips it so the user types what they
   *  want to send. The flip toggle lives in the rate row alongside the
   *  computed value. */
  direction: 'direct' | 'reverse';
  /** The currently-editable amount — either fromAmount or toAmount
   *  depending on `direction`. The orchestrator routes setters to the
   *  right slice. */
  editableAmount: string;
  recipientAddress: string;
  recipientExtraId: string;
  /** Resolved Currency for the active (ticker, network). Drives whether
   *  the extra-id field renders and what label/placeholder to use. */
  currency: Currency | undefined;
  onSelectCurrency: (c: Currency) => void;
  onAmountChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onExtraIdChange: (value: string) => void;
}

/**
 * Private transfer mode view. Single-asset flow with a two-field stack
 * (You send → Recipient gets) that mirrors the Swap/Convert layout for
 * visual symmetry. Both pickers control the same `(ticker, network)`
 * state — clicking either opens that picker's own dropdown, but the
 * resulting selection updates both. The CTA, address validation, and
 * fee preview are owned by the legacy `/private-transfers` page; this
 * view's role is collecting inputs.
 */
export function PrivateView({
  currencies,
  ticker,
  network,
  direction,
  editableAmount,
  recipientAddress,
  recipientExtraId,
  currency,
  onSelectCurrency,
  onAmountChange,
  onAddressChange,
  onExtraIdChange,
}: PrivateViewProps) {
  const amountRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  // Feature detection via `useSyncExternalStore` — server snapshot is
  // always `false` so the SSR HTML omits the buttons, then the client
  // re-evaluates on mount and renders them in (or doesn't) without the
  // setState-in-effect cascade.
  const qrSupported = useSyncExternalStore(noopSubscribe, getQrSupported, noopServerSnapshot);
  const walletAvailable = useSyncExternalStore(
    noopSubscribe,
    getWalletAvailable,
    noopServerSnapshot,
  );

  // Per-chain address + extra-id regex from the upstream catalog. Compile
  // once per (ticker, network) and reuse — `currency.addressRegex` /
  // `extraIdRegex` change identity only when the picker switches coins.
  const addressValidator = useMemo(
    () => compileRegex(currency?.addressRegex ?? null),
    [currency?.addressRegex],
  );
  const extraIdValidator = useMemo(
    () => compileRegex(currency?.extraIdRegex ?? null),
    [currency?.extraIdRegex],
  );
  // Only flag the field when the user has actually typed something —
  // empty inputs read as "not yet filled", not "wrong". Same for the
  // extra-id below.
  const addressInvalid =
    addressValidator != null &&
    recipientAddress.length > 0 &&
    !addressValidator.test(recipientAddress.trim());
  const extraIdInvalid =
    extraIdValidator != null &&
    recipientExtraId.length > 0 &&
    !extraIdValidator.test(recipientExtraId.trim());

  // Show the wallet button whenever an EIP-1193 provider is detected,
  // regardless of the active chain. The address-regex check above
  // catches a chain mismatch before submit, so even if the user grabs
  // a 0x address while on TRC20 the field surfaces "doesn't look like
  // a valid TRC20 address" and they self-correct.
  const showWalletBtn = walletAvailable;

  const onAmountInput = (value: string) => {
    if (value !== '' && !DECIMAL_RE.test(value)) return;
    onAmountChange(value);
  };

  const pasteInto = async (apply: (text: string) => void) => {
    // Clipboard read can throw (permission denied, no gesture, http
    // context). Failure is silent — the user can always paste manually
    // with the keyboard.
    try {
      const text = await navigator.clipboard.readText();
      if (text) apply(text.trim());
    } catch {
      /* swallow */
    }
  };

  // Camera-scan state — owned here because the scanner is a self-
  // contained sub-feature of the wallet field. The video stream and the
  // requestAnimationFrame loop both need lifetime tracking so the
  // camera shuts off cleanly on close / unmount; refs hold the
  // imperative bits (stream, RAF id, the live decoder) so we don't
  // re-create them on every re-render.
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

  // Stop the camera if the component unmounts mid-scan (mode switch,
  // route change). Without this the rear-camera light stays on until
  // the user reloads.
  useEffect(() => () => stopCameraScan(), []);

  const startCameraScan = async () => {
    setScanError(null);
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      // No camera API at all — fall back to the file picker so the
      // user can still snap or pick an image.
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
      // `getUserMedia` rejects for several reasons; the previous catch
      // showed "access denied" for all of them, including the case
      // where the device just has no camera and the browser never asked
      // for permission at all. Pick the message that matches the
      // DOMException name so the user knows whether to unblock perms,
      // close the app holding the camera, or stop trying entirely.
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

  // Live decode loop — runs while `scanOpen` is true. Each animation
  // frame asks the BarcodeDetector to scan the current video frame; on
  // a hit we strip the URI scheme, fill the address, and tear the
  // camera down.
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
      // `readyState >= 2` (HAVE_CURRENT_DATA) — the video has at least
      // one frame to decode. Reading earlier hands the detector a
      // black canvas and wastes CPU on the busy-loop.
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue;
          if (value) {
            onAddressChange(stripAddressUri(value));
            stopCameraScan();
            return;
          }
        } catch {
          /* transient decode error — keep scanning */
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
  }, [scanOpen, onAddressChange]);

  const onQRImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so a re-pick of the same file still fires `change`.
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
      const value = codes[0]?.rawValue;
      if (!value) return;
      onAddressChange(stripAddressUri(value));
    } catch {
      /* swallow — corrupted image or no QR found; user can paste */
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
        onAddressChange(accounts[0]);
      }
    } catch {
      /* user rejected the prompt — silent */
    }
  };

  // Label flips with direction: the editable side is whichever the user
  // is currently typing into. The opposite (computed) side is shown in
  // the rate row below the field stack and carries the flip toggle.
  const editableLabel = direction === 'direct' ? 'You send' : 'Recipient gets';

  return (
    <>
      <div
        className="swap-field"
        onClick={(e) => focusFieldInput(e, amountRef.current)}
      >
        <div className="swap-label">
          <span>{editableLabel}</span>
          <span></span>
        </div>
        <CurrencyPicker
          currencies={currencies}
          selectedTicker={ticker}
          selectedNetwork={network}
          ariaLabel="Recipient currency"
          onSelect={onSelectCurrency}
          amountSlot={
            <div className="swap-input-wrap">
              <input
                ref={amountRef}
                className="swap-amount"
                data-size={amountSizeAttr(editableAmount)}
                value={editableAmount}
                onChange={(e) => onAmountInput(e.target.value)}
                inputMode="decimal"
              />
            </div>
          }
        />
      </div>

      <div className="pt-address-field" data-invalid={addressInvalid || undefined}>
        {/* Floating-label input — placeholder text is the visual label
            until the user starts typing or focuses the field, at which
            point it floats up via the CSS `:placeholder-shown` /
            `:focus` rules. The actual `<input>` keeps `placeholder=" "`
            (a single space) so `:placeholder-shown` stays accurate
            without a stray glyph showing through. */}
        <label className="pt-address-input-wrap">
          <input
            className="pt-address-input"
            type="text"
            placeholder=" "
            value={recipientAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Recipient wallet address"
            aria-invalid={addressInvalid || undefined}
          />
          <span className="pt-address-floating-label">
            Enter the {ticker} payout address
          </span>
        </label>
        <div className="pt-address-actions">
          {showWalletBtn && (
            // EIP-1193 wallet (MetaMask / Rabby / Coinbase / …) lives
            // at `window.ethereum`. Shown for any chain — the address
            // regex below catches a chain mismatch (a 0x address on
            // a TRC20 field) before the user can submit.
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
            // Native `BarcodeDetector` API (Chromium-only at time of
            // writing). The button opens the device camera in a modal
            // and decodes frames live; if the user denies camera
            // permission, we fall back to a hidden file picker (the
            // input below) so they can still snap or attach an image.
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
            onClick={() => pasteInto(onAddressChange)}
          >
            Paste
          </button>
        </div>
        {qrSupported && (
          <input
            ref={qrFileRef}
            type="file"
            accept="image/*"
            // `capture="environment"` opens the rear camera on mobile
            // browsers that honour it (Chrome Android, iOS Safari) so
            // the user can snap a QR without picking from the gallery.
            capture="environment"
            hidden
            onChange={onQRImageSelected}
          />
        )}
        {addressInvalid && (
          <span className="pt-address-error" role="alert">
            Doesn&apos;t look like a valid {ticker} address — double-check the chain
            and format.
          </span>
        )}
      </div>

      {currency?.hasExternalId && (
        // Extra-id field — only chains with `hasExternalId` need a memo /
        // destination tag alongside the address. The legacy
        // `/private-transfers` page surfaces the same field and uses the
        // currency's `externalIdName` ("Destination Tag", "Memo",
        // "Payment ID") as the visible label.
        <div className="pt-address-field" data-invalid={extraIdInvalid || undefined}>
          <label className="pt-address-input-wrap">
            <input
              className="pt-address-input"
              type="text"
              placeholder=" "
              value={recipientExtraId}
              onChange={(e) => onExtraIdChange(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              aria-label={`Recipient ${currency.externalIdName ?? 'memo'}`}
              aria-invalid={extraIdInvalid || undefined}
            />
            <span className="pt-address-floating-label">
              Enter the {currency.externalIdName ?? 'memo'} (optional)
            </span>
          </label>
          <div className="pt-address-actions">
            <button
              type="button"
              className="pt-address-paste"
              onClick={() => pasteInto(onExtraIdChange)}
            >
              Paste
            </button>
          </div>
          {extraIdInvalid && (
            <span className="pt-address-error" role="alert">
              {currency.externalIdName ?? 'Memo'} format doesn&apos;t match what
              this chain expects.
            </span>
          )}
        </div>
      )}

      {scanOpen && (
        // Camera-scan modal — full-screen overlay with the rear camera
        // preview centered. Tapping outside the video or the close button
        // tears the stream down via `stopCameraScan`. Wired through the
        // `useEffect` above: when `scanOpen` flips true, the effect grabs
        // the video ref + active stream and starts the decode loop;
        // returning false (close button, successful detect, unmount) runs
        // the cleanup and stops the camera.
        <div
          className="qr-scan-overlay"
          role="dialog"
          aria-label="Scan QR code"
          onClick={(e) => {
            // Click on the backdrop (not the video / button) closes.
            if (e.target === e.currentTarget) stopCameraScan();
          }}
        >
          <video
            ref={videoRef}
            className="qr-scan-video"
            muted
            playsInline
            // iOS Safari only autoplays inline + muted; we trigger play()
            // explicitly in the effect anyway.
            autoPlay
          />
          <div className="qr-scan-hint">Point the camera at the QR code</div>
          <button type="button" className="qr-scan-close" onClick={stopCameraScan}>
            Cancel
          </button>
        </div>
      )}

      {scanError && !scanOpen && (
        // Brief inline hint when permission is denied — sits below the
        // wallet field so the user notices without a toast / dialog. It
        // fades on the next successful interaction (clearing on next
        // address edit) — see the small effect just below.
        <span className="pt-address-error" role="alert">
          {scanError}
        </span>
      )}
    </>
  );
}
