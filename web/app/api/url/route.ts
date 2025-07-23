import { pinata } from "@/app/utils/config";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = await pinata.upload.public.createSignedURL({
      expires: 30, 
    })
    return NextResponse.json({ url: url }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ text: "Error creating API Key:" }, { status: 500 });
  }
}