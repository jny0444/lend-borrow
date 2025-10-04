import Image from "next/image";

type FaucetCardProps = {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => Promise<void> | void;
  pending: boolean;
  logs: string[];
  transactionHash: string | null;
  approvalHash?: string | null;
  imageSrc: string;
  imageAlt: string;
};

const shortenHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;

export default function FaucetCard({
  title,
  description,
  buttonLabel,
  onClick,
  pending,
  logs,
  transactionHash,
  approvalHash = null,
  imageSrc,
  imageAlt,
}: FaucetCardProps) {
  const logEntries = logs.map((value, index) => ({
    label: `Log ${index + 1}`,
    value,
  }));

  const hashEntries = [
    approvalHash ? { label: "Approval", value: approvalHash } : null,
    transactionHash ? { label: "Transaction", value: transactionHash } : null,
  ].filter(
    (
      entry
    ): entry is {
      label: string;
      value: string;
    } => Boolean(entry)
  );

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl bg-white p-6 text-black shadow-md">
      <div className="relative mx-auto aspect-square w-full max-w-[33%] overflow-hidden rounded-xl">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
          priority
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-black">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="mt-auto w-full rounded-full bg-black px-4 py-3 text-center text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Processing…" : buttonLabel}
      </button>
      <div className="mt-2 space-y-2">
        <div className="rounded-lg border border-black/10 bg-black/[0.03] p-3 text-xs text-black">
          <p className="mb-1 font-semibold uppercase tracking-wide text-black/70">
            Hashes
          </p>
          <div className="flex min-h-16 flex-col gap-1">
            {hashEntries.length ? (
              hashEntries.map(({ label, value }) => (
                <p
                  key={`${label}-${value}`}
                  className="break-words font-mono"
                  title={value}
                >
                  {label}: {shortenHash(value)}
                </p>
              ))
            ) : (
              <p className="text-black/60">No hashes yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-black/[0.03] p-3 text-xs text-black">
          <p className="mb-1 font-semibold uppercase tracking-wide text-black/70">
            Activity log
          </p>
          <div className="flex max-h-24 min-h-24 flex-col gap-1 overflow-y-auto">
            {logEntries.length ? (
              logEntries.map(({ label, value }) => {
                const displayValue = value.startsWith("0x")
                  ? shortenHash(value)
                  : value;
                return (
                  <p
                    key={`${label}-${value}`}
                    className="break-words font-mono"
                    title={value}
                  >
                    {label}: {displayValue}
                  </p>
                );
              })
            ) : (
              <p className="text-black/60">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
