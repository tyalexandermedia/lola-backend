import { useState } from 'react';
import { API_URL } from './AuditFlow';
import { track } from './analytics';

interface LeadGenResult {
  landing_page: string;
  emails: string;
  ads: string;
  tracking: string;
  checklist: string;
  status: string;
}

export default function LeadGenGenerator() {
  const [businessUrl, setBusinessUrl] = useState('');
  const [serviceType, setServiceType] = useState('roof cleaning, house washing, soft wash');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeadGenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    track('lead_gen_submit', { has_business_name: Boolean(businessName) });

    try {
      const response = await fetch(`${API_URL}/lead-gen/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_url: businessUrl,
          service_type: serviceType,
          business_name: businessName,
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`HTTP ${response.status}: ${detail.slice(0, 200)}`);
      }
      const data: LeadGenResult = await response.json();
      setResult(data);
      track('lead_gen_success', { business_url: businessUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      track('lead_gen_error', { error: message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopied(section);
    track('lead_gen_copy', { section });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    track('lead_gen_download', { filename });
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <main className="mx-auto w-full max-w-3xl py-6 sm:py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Lead Gen System Builder
        </h1>
        <p className="mt-2 text-[15px] text-[#C5C5C8]">
          Drop in your URL. Get landing page copy, a 3-email sequence, ad variants,
          tracking template, and an implementation checklist — copy-paste ready.
        </p>
      </header>

      {!result ? (
        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-[#D4AF37]/20 bg-[#11121A] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-8"
        >
          <div className="grid grid-cols-1 gap-5">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.12em] text-[#C5C5C8]">
                Business URL <span className="text-[#D4AF37]">*</span>
              </span>
              <input
                type="text"
                placeholder="e.g., sandbarsoftwash.com"
                value={businessUrl}
                onChange={(e) => setBusinessUrl(e.target.value)}
                required
                className="w-full rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 text-white placeholder-[#6B7280] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.12em] text-[#C5C5C8]">
                Business Name <span className="text-[#6B7280]">(optional)</span>
              </span>
              <input
                type="text"
                placeholder="e.g., Sandbar Soft Wash"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 text-white placeholder-[#6B7280] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.12em] text-[#C5C5C8]">
                Services <span className="text-[#6B7280]">(optional)</span>
              </span>
              <input
                type="text"
                placeholder="e.g., roof cleaning, house washing, soft wash"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 text-white placeholder-[#6B7280] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-[12px] bg-gradient-to-br from-[#FFD166] via-[#F4B942] to-[#E09E23] text-[16px] font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,193,7,0.22)] transition-all duration-200 hover:shadow-[0_22px_44px_rgba(255,193,7,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Spinner />
                  Building your system… (~30s)
                </>
              ) : (
                'Generate Lead Gen System'
              )}
            </button>
            {error && (
              <p className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
                {error}
              </p>
            )}
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-[14px] text-emerald-200">
            System ready. Copy or download each section below.
          </div>

          <Section
            title="Landing Page Copy"
            content={result.landing_page}
            sectionName="landing_page"
            filename="landing_page.txt"
            copied={copied}
            onCopy={handleCopy}
            onDownload={handleDownload}
          />
          <Section
            title="Email Follow-Up Sequence"
            content={result.emails}
            sectionName="emails"
            filename="emails.txt"
            copied={copied}
            onCopy={handleCopy}
            onDownload={handleDownload}
          />
          <Section
            title="Facebook Ad Copy"
            content={result.ads}
            sectionName="ads"
            filename="ads.txt"
            copied={copied}
            onCopy={handleCopy}
            onDownload={handleDownload}
          />
          <Section
            title="Tracking & ROI Measurement"
            content={result.tracking}
            sectionName="tracking"
            filename="tracking.txt"
            copied={copied}
            onCopy={handleCopy}
            onDownload={handleDownload}
          />
          <Section
            title="Implementation Checklist"
            content={result.checklist}
            sectionName="checklist"
            filename="checklist.txt"
            copied={copied}
            onCopy={handleCopy}
            onDownload={handleDownload}
          />

          <button
            onClick={handleReset}
            className="w-full rounded-[12px] border border-white/10 bg-[#11121A] py-3 text-[14px] font-semibold text-[#C5C5C8] transition hover:border-[#D4AF37]/40 hover:text-white"
          >
            Generate Another System
          </button>
        </div>
      )}
    </main>
  );
}

interface SectionProps {
  title: string;
  content: string;
  sectionName: string;
  filename: string;
  copied: string | null;
  onCopy: (text: string, name: string) => void;
  onDownload: (text: string, filename: string) => void;
}

function Section({ title, content, sectionName, filename, copied, onCopy, onDownload }: SectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#11121A] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.25)] sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => onCopy(content, sectionName)}
            className="flex items-center gap-2 rounded-[10px] border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-2 text-[13px] font-semibold text-[#F4D47C] transition hover:bg-[#D4AF37]/20"
          >
            <CopyIcon />
            {copied === sectionName ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => onDownload(content, filename)}
            className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-semibold text-[#C5C5C8] transition hover:border-white/20 hover:text-white"
          >
            <DownloadIcon />
            Download
          </button>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-white/10 bg-[#0A0A0B] p-4 font-mono text-[13px] leading-[1.6] text-[#E5E7EB]">
        {content}
      </pre>
    </section>
  );
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-spin"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 4v11m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
