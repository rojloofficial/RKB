"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PrefixTrie } from "@/lib/trie";

const POPULAR_SEARCH_TARGETS = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Jaipur",
  "Ahmedabad",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Navi Mumbai",
  "Allahabad",
  "Ranchi",
  "Howrah",
  "Coimbatore",
  "Jabalpur",
  "Gwalior",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Guwahati",
  "Chandigarh",
  "Solapur",
  "Hubli",
  "Mysuru",
  "Tiruchirappalli",
  "Bareilly",
  "Aligarh",
  "Tiruppur",
  "Gurugram",
  "Noida",
  "Maharashtra",
  "Gujarat",
  "Rajasthan",
  "Karnataka",
  "Uttar Pradesh",
  "Andheri West",
  "Andheri East",
  "Bandra",
  "Juhu",
  "Powai",
  "Colaba",
  "Connaught Place",
  "Hauz Khas",
  "South Extension",
  "Koramangala",
  "Indiranagar",
  "Whitefield",
  "HSR Layout",
  "Park Street",
  "Salt Lake",
  "T Nagar",
  "Anna Nagar",
  "Hitec City",
  "Gachibowli",
  "Banjara Hills",
  "Koregaon Park",
  "Viman Nagar",
  "Malviya Nagar",
  "Vaishali Nagar",
  "SG Highway",
  "Satellite",
  "Vesu",
  "Adajan",
  "Gomti Nagar",
  "Sector 17",
  "Escort Services",
  "Call Girls",
  "Male Escorts",
  "Massage & Spa",
];

const QUICK_TAGS = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Kolkata"];

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize and memoize PrefixTrie
  const searchTrie = useMemo(() => {
    const trie = new PrefixTrie<string>();
    for (const target of POPULAR_SEARCH_TARGETS) {
      trie.insert(target, target);
      const parts = target.split(/\s+/);
      if (parts.length > 1) {
        for (const part of parts) {
          trie.insert(part, target);
        }
      }
    }
    return trie;
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (q.length < 1) return [];
    const results = searchTrie.searchPrefix(q, 7);
    return Array.from(new Set(results));
  }, [query, searchTrie]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      if (selected) {
        setQuery(selected);
        setIsOpen(false);
        router.push(`/places?q=${encodeURIComponent(selected)}`);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto mt-8 w-full max-w-2xl">
      <form
        action="/places"
        method="get"
        className="relative flex items-center rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/10 border border-slate-200/90 transition-all focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/15"
      >
        <div className="pl-3.5 pr-2 text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-500"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <input
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (query.trim().length >= 1) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder="Search city, area, or service (e.g. Mumbai, Andheri, Spa)..."
          className="w-full min-w-0 bg-transparent px-2 py-2 text-sm sm:text-base text-slate-900 outline-none placeholder:text-slate-400 font-medium"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="mr-2 text-slate-400 hover:text-slate-600 p-1 text-xs"
          >
            ✕
          </button>
        )}

        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/20 hover:from-amber-600 hover:to-orange-700 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Suggested Quick Tags */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
        <span className="text-slate-400 font-semibold mr-1">Trending:</span>
        {QUICK_TAGS.map((tag) => (
          <Link
            key={tag}
            href={`/places?q=${encodeURIComponent(tag)}`}
            style={{ color: "#000000" }}
            className="rounded-full bg-white/95 border border-slate-200/90 px-3 py-1 !text-black text-black font-semibold hover:bg-amber-50 hover:!text-black hover:border-amber-300 transition-all shadow-xs"
          >
            <span style={{ color: "#000000" }} className="!text-black text-black font-semibold">
              {tag}
            </span>
          </Link>
        ))}
      </div>

      {/* Instant Prefix-Trie Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 py-2 text-left shadow-2xl backdrop-blur-md">
          <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Suggested Destinations & Services
          </div>
          {suggestions.map((suggestion, idx) => (
            <li key={suggestion}>
              <Link
                href={`/places?q=${encodeURIComponent(suggestion)}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  idx === selectedIndex
                    ? "bg-amber-50 text-amber-900 font-semibold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-amber-500 text-xs">📍</span>
                  <span>{suggestion}</span>
                </div>
                <span className="text-slate-400 text-xs font-normal">Explore →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
