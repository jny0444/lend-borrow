"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const navigation = [
  { label: "Borrow", href: "/borrow" },
  { label: "Lend", href: "/lend" },
  { label: "Profile", href: "/profile" },
  { label: "Faucet", href: "/faucet" },
];

const differentiators = [
  {
    title: "zk-Secured Collateral",
    description:
      "Zero-knowledge proofs guard positions so partners can underwrite risk with confidence.",
  },
  {
    title: "Real-time Liquidity",
    description:
      "Institutional-grade pools provide deterministic settlement windows and transparent pricing.",
  },
  {
    title: "Programmable Compliance",
    description:
      "Composable policy rails simplify onboarding regulated assets and automate attestations.",
  },
];

const journeySteps = [
  {
    badge: "01",
    heading: "Fund your vault",
    body: "Deposit approved collateral in seconds and mint a proof-backed borrowing identity.",
  },
  {
    badge: "02",
    heading: "Activate liquidity",
    body: "Route working capital to yield-optimized pools with automatic risk throttles.",
  },
  {
    badge: "03",
    heading: "Scale confidently",
    body: "Unlock predictable credit lines and real-time analytics for global treasury teams.",
  },
];

export default function Home() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { duration: 0.8, ease: "power3.out" },
      });

      tl.from("[data-hero-badge]", { y: 20, opacity: 0 })
        .from("[data-hero-title]", { y: 40, opacity: 0 }, "-=0.4")
        .from("[data-hero-copy]", { y: 30, opacity: 0 }, "-=0.6")
        .from("[data-cta-cluster]", { y: 20, opacity: 0 }, "-=0.5")
        .from("[data-hero-visual]", { opacity: 0, scale: 0.94 }, "-=0.4");

      gsap.utils
        .toArray<HTMLElement>("[data-differentiator]")
        .forEach((el, index) => {
          gsap.from(el, {
            scrollTrigger: {
              trigger: el,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
            y: 40,
            opacity: 0,
            delay: index * 0.06,
            duration: 0.7,
          });
        });

      gsap.utils
        .toArray<HTMLElement>("[data-journey-card]")
        .forEach((el, index) => {
          gsap.from(el, {
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
            y: 50,
            opacity: 0,
            delay: index * 0.08,
            duration: 0.75,
          });
        });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background text-foreground"
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-black via-neutral-900 to-neutral-800" />

        <header className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-24 pt-10 text-white md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-6">
            <div
              data-hero-badge
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/70 backdrop-blur"
            >
              <span className="h-2 w-2 rounded-full bg-white" />
              Enterprise-ready zk credit rails
            </div>
            <h1
              data-hero-title
              className="text-4xl font-semibold leading-tight text-white sm:text-5xl"
            >
              Bring programmable liquidity to your treasury desk in weeks, not
              quarters.
            </h1>
            <p data-hero-copy className="text-base text-white/70">
              zkLend orchestrates collateralized credit lines, automated
              compliance, and real-time liquidity analytics for modern B2B
              finance teams. Launch bespoke lending experiences without
              compromising on security or speed.
            </p>
            <div data-cta-cluster className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/borrow"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-black/30 transition hover:bg-white/80"
              >
                Explore borrowing
              </Link>
              <Link
                href="/lend"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Provide liquidity
              </Link>
            </div>
          </div>

          <div
            data-hero-visual
            className="relative mt-6 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg"
          >
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
            <div className="relative space-y-4 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">
                  Live metrics
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-white">
                  <div>
                    <p className="text-[11px] text-white/50">Total liquidity</p>
                    <p className="text-lg font-semibold">$184.3M</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/50">Active loans</p>
                    <p className="text-lg font-semibold">1,276</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/50">Average APY</p>
                    <p className="text-lg font-semibold">4.8%</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/50">
                      Proof verifications
                    </p>
                    <p className="text-lg font-semibold">98.6%</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">
                  Borrower health
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-white/70">
                    <span>Collateral utilization</span>
                    <span className="font-semibold text-white">62%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full bg-white/70" />
                  </div>
                  <div className="flex items-center justify-between text-white/70">
                    <span>Payment reliability</span>
                    <span className="font-semibold text-white">99.1%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-11/12 rounded-full bg-white/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <section className="bg-white py-20 text-black">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
            WHY ZKLEND
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-neutral-900">
            Practical rails for risk-aware fintech teams
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {differentiators.map((item) => (
              <div
                key={item.title}
                data-differentiator
                className="group rounded-2xl border border-black/5 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="h-6 w-6 rounded-full border border-black/10 bg-black/5 text-center text-xs font-semibold leading-6 text-black/60">
                  ●
                </div>
                <h3 className="mt-5 text-xl font-semibold text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-black/60">{item.description}</p>
                <div className="mt-6 h-[1px] w-full bg-gradient-to-r from-black/10 via-black/20 to-black/40 opacity-0 transition group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                DELIVERY PLAYBOOK
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Launch in three decisive sprints
              </h2>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              View dashboard
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {journeySteps.map((step) => (
              <div
                key={step.badge}
                data-journey-card
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/40 via-white/20 to-white/10" />
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                  {step.badge}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">
                  {step.heading}
                </h3>
                <p className="mt-3 text-sm text-white/70">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-black py-12 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">zkLend</p>
            <p className="text-xs text-white/50">
              Building programmable credit infrastructure for the next wave of
              B2B finance.
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <Link href="/borrow" className="transition hover:text-white">
              Borrow
            </Link>
            <Link href="/lend" className="transition hover:text-white">
              Lend
            </Link>
            <Link href="/profile" className="transition hover:text-white">
              Dashboard
            </Link>
            <Link href="/faucet" className="transition hover:text-white">
              Faucet
            </Link>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} zkLend Labs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
