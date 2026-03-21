import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCompareItems } from "@/app/(dashboard)/compare/actions";
import ApartmentsListWithSearch from "./ApartmentsListWithSearch";

function compareKey(apartmentId: string, unitId: string) {
  return `${apartmentId}:${unitId}`;
}

export default async function DashboardApartmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: apartments, error: apartmentsError } = await supabase
    .from("apartments")
    .select("id, name, image_url, address, website, rating, reviews")
    .order("name");

  if (apartmentsError) {
    console.error("Error fetching apartments:", apartmentsError);
    return (
      <div className="p-4 text-red-500">Error loading apartments</div>
    );
  }

  const compareItems = await getCompareItems();
  const apartmentIdsInCompare = new Set(
    compareItems.map((c) => c.apartment_id)
  );
  const compareKeys = compareItems.map((c) =>
    compareKey(c.apartment_id, c.unit_id)
  );

  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem-3rem)] flex-1 flex-col bg-zinc-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-primary-900">
          Apartments
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse buildings and add units to compare.
        </p>
      </header>
      <ApartmentsListWithSearch
        apartments={apartments ?? []}
        apartmentIdsInCompare={apartmentIdsInCompare}
        compareKeys={compareKeys}
      />
    </div>
  );
}
