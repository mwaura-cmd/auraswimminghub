export default function AboutPage() {
  return (
    <div className="section-shell pb-20">
      <h1 className="text-4xl">About Aura Swimming Hub</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="glass-card rounded-2xl p-6">
          <h2 className="text-xl">Our Mission</h2>
          <p className="mt-3 text-sm text-teal-50/75">
            Build confident, technically strong swimmers through elite coaching, personalized progression, and a premium learning environment.
          </p>
        </article>
        <article className="glass-card rounded-2xl p-6">
          <h2 className="text-xl">Training Venue</h2>
          <p className="mt-3 text-sm text-teal-50/75">
            Mountain Breeze Hotel pool in Embu with controlled safety protocols, modern facilities, and dedicated training lanes.
          </p>
        </article>
      </div>
    </div>
  );
}
