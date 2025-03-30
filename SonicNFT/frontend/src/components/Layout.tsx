import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import { Menu, X, Github, Twitter, Discord } from 'lucide-react';
import NetworkSwitcher from './NetworkSwitcher';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({
  children,
  title = 'Sonic NFT Collection | Free Mint on Sonic Network',
  description = 'Mint your free Sonic NFT featuring five generative art styles: Fractal Crystalline, Organic Flow Field, Geometric Pattern Weaver, Cosmic Nebula, and Abstract Architecture.',
}: LayoutProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const router = useRouter();

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Mint', path: '/mint' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'About', path: '/about' },
    { name: 'FAQ', path: '/faq' },
  ];

  return (
    <div className="sonic-background min-h-screen">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-sonic-background/80 border-b border-sonic-secondary/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-heading font-bold text-2xl text-sonic-text">Sonic<span className="text-sonic-primary">NFT</span></span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <ul className="flex items-center space-x-8">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link 
                    href={item.path}
                    className={`font-medium transition-colors ${
                      router.pathname === item.path
                        ? 'text-sonic-primary'
                        : 'text-sonic-text hover:text-sonic-primary'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <NetworkSwitcher />
            <ConnectButton />
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <NetworkSwitcher />
            <ConnectButton />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="ml-4 p-2 rounded-lg text-sonic-text hover:bg-sonic-card"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <nav className="md:hidden py-4 px-4 border-t border-sonic-secondary/20 bg-sonic-background/90 backdrop-blur-md">
            <ul className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`block font-medium transition-colors ${
                      router.pathname === item.path
                        ? 'text-sonic-primary'
                        : 'text-sonic-text hover:text-sonic-primary'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-sonic-secondary/20 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Link href="/" className="font-heading font-bold text-xl text-sonic-text">
                Sonic<span className="text-sonic-primary">NFT</span>
              </Link>
              <p className="text-sonic-muted mt-2 text-sm max-w-md">
                A generative art collection featuring five unique styles created using Houdini VEX.
              </p>
            </div>
            
            <div className="flex space-x-6">
              <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="text-sonic-muted hover:text-sonic-text transition-colors">
                <Github size={24} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="text-sonic-muted hover:text-sonic-text transition-colors">
                <Twitter size={24} />
              </a>
              <a href="https://discord.com" target="_blank" rel="noreferrer" aria-label="Discord" className="text-sonic-muted hover:text-sonic-text transition-colors">
                <Discord size={24} />
              </a>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-sonic-secondary/10 flex flex-col md:flex-row justify-between items-center text-sm text-sonic-muted">
            <p>© {new Date().getFullYear()} Sonic NFT Collection. All rights reserved.</p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link href="/privacy" className="hover:text-sonic-text transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-sonic-text transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 