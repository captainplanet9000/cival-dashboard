/**
 * Wallet Management Layout
 * Provides shared layout for all wallet pages
 */
export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      {children}
    </div>
  );
}
