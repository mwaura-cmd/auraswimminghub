const HOTEL_LOCATION = {
  name: "Mountain Breeze Hotel",
  displayAddress: "Mountain breeze, Embu-Nairobi Highway, Embu, Manyatta, Embu, Kenya",
  latitude: -0.4943115,
  longitude: 37.4668956,
};

function buildMapUrls() {
  return {
    embedUrl: `https://maps.google.com/maps?q=Mountain+Breeze+Hotel,+Embu&t=&z=15&ie=UTF8&iwloc=&output=embed`,
    openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${HOTEL_LOCATION.latitude}&mlon=${HOTEL_LOCATION.longitude}#map=17/${HOTEL_LOCATION.latitude}/${HOTEL_LOCATION.longitude}`,
    googleMapsUrl: `https://www.google.com/maps?q=${HOTEL_LOCATION.latitude},${HOTEL_LOCATION.longitude}`,
  };
}

export function MountainBreezeMap() {
  const { embedUrl, openStreetMapUrl, googleMapsUrl } = buildMapUrls();

  return (
    <section className="section-shell mt-20">
      <div className="rounded-3xl border border-teal-500/30 bg-black/70 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-teal-300">Find Us</p>
            <h2 className="mt-2 text-3xl">Mountain Breeze Hotel Map</h2>
            <p className="mt-2 max-w-2xl text-sm text-teal-50/75">{HOTEL_LOCATION.displayAddress}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              Open In Google Maps
            </a>
            <a href={openStreetMapUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              Open In OpenStreetMap
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-teal-500/25 bg-black/40">
          <iframe
            title="Mountain Breeze Hotel location map"
            src={embedUrl}
            className="h-[340px] w-full md:h-[420px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <p className="mt-3 text-xs text-teal-200/70">
          Location: Mountain Breeze Hotel, Embu-Nairobi Highway.
        </p>
      </div>
    </section>
  );
}
