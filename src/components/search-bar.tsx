"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
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

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize and memoize PrefixTrie in O(N * L) once
  const searchTrie = useMemo(() => {
    const trie = new PrefixTrie<string>();
    for (const target of POPULAR_SEARCH_TARGETS) {
      trie.insert(target, target);
      // Also index individual words for multi-word queries
      const parts = target.split(/\s+/);
      if (parts.length > 1) {
        for (const part of parts) {
          trie.insert(part, target);
        }
      }
    }
    return trie;
  }, []);

  // O(L + K) Trie prefix search
  const suggestions = useMemo(() => {
    const q = query.trim();
    if (q.length < 1) return [];
    const results = searchTrie.searchPrefix(q, 6);
    // Deduplicate suggestions
    return Array.from(new Set(results));
  }, [query, searchTrie]);

  // Handle outside click to close dropdown
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
    <div ref={containerRef} className="relative mx-auto mt-7 w-full max-w-xl">
      <form
        action="/places"
        method="get"
        className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
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
            placeholder="Search services or places..."
            className="w-full min-w-0 rounded-full border border-neutral-300 bg-white px-5 py-3 text-center text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 sm:text-left transition"
          />
        </div>
        <Button type="submit" variant="solid" className="w-full sm:w-auto shrink-0 !text-white">
          Search
        </Button>
      </form>

      {/* Instant Prefix-Trie Auto-complete dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-1.5 text-left shadow-lg">
          {suggestions.map((suggestion, idx) => (
            <li key={suggestion}>
              <Link
                href={`/places?q=${encodeURIComponent(suggestion)}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors ${
                  idx === selectedIndex
                    ? "bg-neutral-100 text-neutral-950 font-semibold"
                    : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950"
                }`}
              >
                <span className="text-neutral-400 text-xs">📍</span>
                <span>{suggestion}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
