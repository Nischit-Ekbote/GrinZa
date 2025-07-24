import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';

const secretKey = process.env.PRIVATE_KEY!;
const PINATA_JWT = process.env.PINATA_JWT!; 
const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

const secretKeyArray = JSON.parse(secretKey);
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));

async function uploadFileToPinata(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  formData.append('file', blob, filename);

  const metadata = JSON.stringify({
    name: filename,
    keyvalues: {
      type: 'nft-asset',
      uploadedAt: new Date().toISOString()
    }
  });
  formData.append('pinataMetadata', metadata);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata file upload failed: ${error}`);
  }

  const result = await response.json();
  return `${PINATA_GATEWAY}/${result.IpfsHash}`;
}

async function uploadJsonToPinata(jsonData: object, name: string): Promise<string> {
  const metadata = {
    name: `${name}-metadata.json`,
    keyvalues: {
      type: 'nft-metadata',
      uploadedAt: new Date().toISOString()
    }
  };

  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pinataContent: jsonData,
      pinataMetadata: metadata
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata JSON upload failed: ${error}`);
  }

  const result = await response.json();
  return `${PINATA_GATEWAY}/${result.IpfsHash}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, image, attributes, user } = body;

    if (!name || !image) {
      return NextResponse.json(
        { success: false, error: 'Missing name or image' }, 
        { status: 400 }
      );
    }

    if (!PINATA_JWT) {
      return NextResponse.json(
        { success: false, error: 'PINATA_JWT environment variable not set' }, 
        { status: 500 }
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const imageUri = await uploadFileToPinata(imageBuffer, `${name}.png`, 'image/png');

    const metadata = {
      name,
      symbol: '',
      description: 'This is a smile-powered NFT 😄',
      image,
      attributes: attributes || [],
      properties: {
        files: [
          {
            uri: imageUri,
            type: 'image/png'
          }
        ],
        category: 'image',
        creators: [
          {
            address: user,
            share: 100
          }
        ]
      },
      external_url: '',
      seller_fee_basis_points: 0
    };

    const metadataUri = await uploadJsonToPinata(metadata, name);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const userPublicKey = new PublicKey(user);

    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name,
      sellerFeeBasisPoints: 0,
      tokenOwner: userPublicKey,
      updateAuthority: keypair,
      
      isMutable: true,
    });

    await metaplex.nfts().update({
        nftOrSft: nft,
        updateAuthority: keypair,
        newUpdateAuthority: new PublicKey(user),
    });
    
    return NextResponse.json({
      success: true,
      mint: nft.address.toBase58(),
      uri: metadataUri,
      image: image,
      explorer: `https://explorer.solana.com/address/${nft.address.toBase58()}?cluster=devnet`,
      ipfsGateways: {
        pinata: {
          metadata: metadataUri,
          image: imageUri
        },
        public: {
          metadata: metadataUri.replace(PINATA_GATEWAY, 'https://ipfs.io/ipfs'),
          image: imageUri.replace(PINATA_GATEWAY, 'https://ipfs.io/ipfs')
        }
      }
    });

  } catch (error) {
    console.error('❌ NFT Mint Error:', error);
    
    let errorMessage = 'NFT minting failed';
    if (error instanceof Error) {
      if (error.message.includes('Pinata')) {
        errorMessage = 'IPFS upload failed - check Pinata configuration';
      } else if (error.message.includes('Solana')) {
        errorMessage = 'Solana transaction failed';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage }, 
      { status: 500 }
    );
  }
}
