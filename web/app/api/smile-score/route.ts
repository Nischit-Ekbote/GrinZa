import { pinata } from '@/app/utils/config';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { timestamp, score, image } = body;

    if (!image || !score || !timestamp) {
      return NextResponse.json(
        { success: false, error: 'Missing data' },
        { status: 400 }
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `smile-${Date.now()}.jpg`; 

    const file = new File([buffer], fileName, { type: 'image/jpeg' });

    const upload = await pinata.upload.public.file(file, {
      metadata: {
        name: fileName,
        keyvalues: {
          timestamp: timestamp.toString(),
          score: score.toString(),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Image upload successful',
        data: {
          hash: upload.cid || upload.id,
          url: `https://gateway.pinata.cloud/ipfs/${upload.cid || upload.id}`, 
          timestamp,
          score,
          fullResponse: upload,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error uploading to Pinata:', error);
    return NextResponse.json(
      { success: false, error: 'Image upload failed' },
      { status: 500 }
    );
  }
}
