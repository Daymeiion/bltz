import ConversionJourney from "./ConversionJourney";
export default function ConversionSurface({previewId,room}:{previewId:string;room?:"view"|"photos_view"|"film_view"}) {
  if(process.env.PREVIEW_CONVERSION_ENABLED !== "true") return null;
  let bookingUrl: string | null = null;
  try {const url = new URL(process.env.PREVIEW_BOOKING_URL || "");if(url.protocol === "https:" && !url.username && !url.password)bookingUrl=url.href;}catch{/* optional */}
  return <ConversionJourney previewId={previewId} room={room} bookingUrl={bookingUrl}/>;
}
