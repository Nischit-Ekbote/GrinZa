import { NextResponse } from "next/server";
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import {
  Metaplex,
  irysStorage,
  keypairIdentity,
} from "@metaplex-foundation/js";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function loadFullNfts(
  metaplex: Metaplex,
  nfts: any[]
): Promise<
  {
    name: string;
    symbol: string;
    uri: string;
    image: string | null;
    description: string | null;
    mint: string;
  }[]
> {
  const fullNfts = await Promise.all(
    nfts.map(async (nft) => {
      try {
        const full = await metaplex.nfts().findByMint({ mintAddress: nft.mintAddress });

        let metadataJson = null;
        try {
          const res = await fetch(full.uri);
          metadataJson = await res.json();
        } catch (e) {
          console.warn(`❌ Failed to fetch metadata for ${full.name}:`, full.uri);
        }

        return {
          name: full.name,
          symbol: full.symbol,
          uri: full.uri,
          image: metadataJson?.image || null,
          description: metadataJson?.description || null,
          mint: full.address.toBase58(),
        };
      } catch (e) {
        console.error("Failed to load NFT:", e);
        return null;
      }
    })
  );

  return fullNfts.filter((nft) => nft !== null) as any;
}

export async function POST(req: Request) {
  try {
    const { wallet } = await req.json();
    if (!wallet)
      return NextResponse.json(
        { success: false, error: "Wallet required" },
        { status: 400 }
      );

    const metaplex = Metaplex.make(connection);
    const owner = new PublicKey(wallet);

    const nfts = await metaplex.nfts().findAllByOwner({ owner });

    const fullNfts = await loadFullNfts(metaplex, nfts);

    return NextResponse.json({ success: true, nfts: fullNfts });
  } catch (error) {
    console.error("❌ NFT Fetch Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const secretKey = process.env.PRIVATE_KEY;
    if (!secretKey) throw new Error("Missing PRIVATE_KEY");

    const keypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(secretKey))
    );
    const walletPubkey = keypair.publicKey;

    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(keypair))
      .use(
        irysStorage({
          address: "https://devnet.bundlr.network",
          providerUrl: clusterApiUrl("devnet"),
          timeout: 60000,
        })
      );

    const nfts = await metaplex.nfts().findAllByOwner({ owner: walletPubkey });

    const ownCreatedNfts = nfts.filter((nft) =>
      nft.updateAuthorityAddress.equals(walletPubkey)
    );

    const fullNfts = await loadFullNfts(metaplex, ownCreatedNfts);

    return NextResponse.json({ success: true, nfts: fullNfts }, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching NFTs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}
