import Link from "next/link";
import { PROGRAMS } from "@/lib/constants";

export default function ProgramsPage() {
  return (
    <div className="section-shell pb-20">
      <h1 className="text-4xl">Programs</h1>
      <p className="mt-3 max-w-2xl text-teal-50/75">
        Precision-designed training tracks for each age and performance level.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROGRAMS.map((program) => (
          <article key={program} className="glass-card rounded-2xl p-6">
            <h2 className="text-xl">{program}</h2>
            <p className="mt-2 text-sm text-teal-50/75">Weekly lesson plans, coach feedback loops, and measurable progression outcomes.</p>
            <Link className="btn-primary mt-5 inline-flex" href="/book">
              Book Program
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
