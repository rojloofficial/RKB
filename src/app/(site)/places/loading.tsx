import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PlacesExplorerSkeleton } from "@/components/skeletons/places-skeletons";

export default function PlacesLoading() {
  return (
    <div className="w-full min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <SectionPanel>
        <Eyebrow>Places</Eyebrow>
        <h1 className="mt-2 text-3xl font-black text-red-950 sm:text-4xl">
          Places
        </h1>

        <div className="mt-6">
          <PlacesExplorerSkeleton />
        </div>
      </SectionPanel>
    </div>
  );
}
