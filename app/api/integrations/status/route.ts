import { NextResponse } from "next/server";

export async function GET(){
  const google=Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET);
  const microsoft=Boolean(process.env.MICROSOFT_CLIENT_ID&&process.env.MICROSOFT_CLIENT_SECRET);
  return NextResponse.json({
    google_calendar:{configured:google,state:google?"disconnected":"unconfigured",setup:google?"Choose permissions and a calendar to authorize.":"Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server."},
    microsoft_outlook:{configured:microsoft,state:microsoft?"disconnected":"unconfigured",setup:microsoft?"Choose permissions and a calendar to authorize.":"Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET on the server."},
  },{headers:{"Cache-Control":"no-store"}});
}
