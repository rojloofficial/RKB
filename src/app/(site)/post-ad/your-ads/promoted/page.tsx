import { Suspense } from "react";
import PromotedAdView from "@/components/post-ad/promoted-ad-view";

export default function PromotedPage() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-10 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center text-sm text-gray-500">
          Loading promote page...
        </main>
      }
    >
      <PromotedAdView />
    </Suspense>
  );
}
