import { Quote, Sparkles } from "lucide-react";

const TESTIMONIALS_BY_AGE = [
  {
    ageGroup: "Kids (6 - 12 years)",
    note: "Parents and guardians",
    items: [
      {
        name: "Wanjiku Muthoni",
        role: "Mum to Jayden, 8",
        quote:
          "Coach alikuwa very patient na mtoto wangu. Saa hii anaingia pool akiwa confident, hakuna panic tena.",
      },
      {
        name: "Kevin Kiptoo",
        role: "Dad to Tion, 10",
        quote:
          "Program yao iko sawa kabisa. Kidogo kidogo boy wangu ameweza float na freestyle vizuri sana.",
      },
    ],
  },
  {
    ageGroup: "Teens (13 - 17 years)",
    note: "Teen learners",
    items: [
      {
        name: "Akinyi Atieno",
        role: "Form 2 student, 15",
        quote:
          "Nilikuwa na fear ya deep end but walinisaidia step by step. Saa hii naenjoy sessions na stamina imepanda.",
      },
      {
        name: "Brian Mwangi",
        role: "Form 4 student, 17",
        quote:
          "Vibes ni poa na coaches wanajua kuskiza. Timing yangu imeimprove na sasa najiamini hata kwa galas za shule.",
      },
    ],
  },
  {
    ageGroup: "Adults (18+ years)",
    note: "Adult learners",
    items: [
      {
        name: "Mercy Njeri",
        role: "Working professional, 29",
        quote:
          "Nilianza from zero kabisa. Within weeks nilikuwa naweza breathe control na laps zangu zikaanza kusonga fiti.",
      },
      {
        name: "Samuel Mutua",
        role: "Business owner, 41",
        quote:
          "Hii class imenisaidia fitness na stress pia. Instructors ni supportive na progress unaona kila wiki.",
      },
    ],
  },
] as const;

export function TestimonialsByAge() {
  return (
    <section className="mt-20">
      <div className="section-shell mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-teal-300">Testimonials</p>
          <h2 className="mt-2 text-3xl">What Our Swimmers Say</h2>
        </div>
        <p className="text-sm text-teal-100/75">Age-group lanes moving end to end for a modern vibe.</p>
      </div>

      <div className="space-y-6">
        {TESTIMONIALS_BY_AGE.map((group, groupIndex) => {
          const loopedItems = [...group.items, ...group.items, ...group.items];
          const marqueeDirectionClass = groupIndex % 2 === 0 ? "" : "aura-marquee-track-reverse";

          return (
            <div key={group.ageGroup} className="space-y-3">
              <div className="section-shell flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-2xl">{group.ageGroup}</h3>
                <p className="text-sm text-teal-100/70">{group.note}</p>
              </div>

              <div className="aura-marquee-shell">
                <div className={`aura-marquee-track ${marqueeDirectionClass}`.trim()}>
                  {loopedItems.map((item, itemIndex) => (
                    <article key={`${group.ageGroup}-${item.name}-${itemIndex}`} className="aura-testimonial-card teal-ring">
                      <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1">
                        <Sparkles className="h-3 w-3 text-teal-300" />
                        <span className="text-[10px] uppercase tracking-[0.16em] text-teal-100/85">{group.ageGroup}</span>
                      </div>

                      <Quote className="mt-4 h-4 w-4 text-teal-300" />
                      <p className="mt-3 text-sm leading-relaxed text-teal-50/85">&ldquo;{item.quote}&rdquo;</p>
                      <p className="mt-4 text-sm font-semibold text-teal-100">{item.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-teal-200/65">{item.role}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}