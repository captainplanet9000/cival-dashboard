import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Trading Farm</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Welcome to Trading Farm</h2>
          <p className="text-lg text-gray-700 mb-4">
            Your comprehensive platform for trading across multiple exchanges and DeFi protocols.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Exchange Connectors</h3>
              <p className="text-gray-600 mb-6">
                Connect to centralized exchanges like Bybit, Binance, Coinbase, and more.
                Execute trades, view balances, and monitor markets all from a single dashboard.
              </p>
              <div className="mt-auto">
                <Link href="/exchange-connectors" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  View Exchanges
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">DeFi Protocol Integrations</h3>
              <p className="text-gray-600 mb-6">
                Access DeFi protocols including Uniswap, Aave, Vertex, and more.
                Swap tokens, provide liquidity, borrow/lend, and trade perpetuals through a unified interface.
              </p>
              <div className="mt-auto">
                <Link href="/defi/dashboard" className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                  Explore DeFi Protocols
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-8 mb-16">
          <h2 className="text-2xl font-bold mb-6">Multi-Protocol Trading</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Cross-Exchange Trading</h3>
              <p className="text-gray-600">
                Execute trades across multiple exchanges to find the best prices and liquidity.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">DeFi Aggregation</h3>
              <p className="text-gray-600">
                Compare rates, fees, and liquidity across DeFi protocols for optimal trading.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">AI-Powered Trading</h3>
              <p className="text-gray-600">
                Leverage AI agents to execute sophisticated trading strategies.
              </p>
            </div>
          </div>
        </section>
        
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Supported DeFi Protocols</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {['uniswap', 'aave', 'vertex', 'hyperliquid', 'gmx', 'bluefin', 'morpho', 'sushiswap', 'ethena', 'avalon', 'silo', 'kamino'].map((protocol) => (
              <div key={protocol} className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full mb-3 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-400">{protocol.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium">{protocol.charAt(0).toUpperCase() + protocol.slice(1)}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/defi/dashboard" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors">
              Explore All DeFi Protocols
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500">© 2023 Trading Farm. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 