"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="w-full p-4">
      <div className="flex items-center justify-between">
        <Link href="/" passHref>
          <div className="mr-4 text-3xl">ZK-Lend</div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/lend" passHref>
            <div className="px-4 py-2 font-bold text-gray-800 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-100">
              Lend
            </div>
          </Link>
          <Link href="/borrow" passHref>
            <div className="px-4 py-2 font-bold text-gray-800 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-100">
              Borrow
            </div>
          </Link>
          <Link href="/profile" passHref>
            <div className="px-4 py-2 font-bold text-gray-800 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-100">
              Profile
            </div>
          </Link>
        </div>

        <div className="flex items-center">
          <ConnectButton
            label="Connect"
            chainStatus="icon"
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
            showBalance={{
              smallScreen: false,
              largeScreen: false,
            }}
          />

          {/* Hamburger Menu Button */}
          <div className="md:hidden ml-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={
                    isMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16m-7 6h7"
                  }
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4">
          <div className="flex flex-col space-y-2">
            <Link href="/lend" passHref>
              <div className="px-4 py-2 font-bold text-gray-800 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-100 text-center">
                Lend
              </div>
            </Link>
            <Link href="/borrow" passHref>
              <div className="px-4 py-2 font-bold text-gray-800 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-100 text-center">
                Borrow
              </div>
            </Link>
            <Link href="/profile" passHref>
              <div className="px-4 py-2 font-bold text-gray-800 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-100 text-center">
                Profile
              </div>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
