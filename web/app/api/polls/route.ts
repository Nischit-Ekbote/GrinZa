import { NextResponse } from "next/server";
import { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Metaplex } from "@metaplex-foundation/js";
import { getProgram } from "@/app/utils/getProgramBackend";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const program = getProgram();
const metaplex = Metaplex.make(connection);

// In-memory cache for NFT metadata (in production, use Redis or similar)
const metadataCache = new Map<string, {
  name: string;
  image: string;
  cachedAt: number;
}>();

// Rate limiting: delay between requests
let lastMetadataFetch = 0;
const RATE_LIMIT_DELAY = 500; // 500ms between requests
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchNFTMetadataWithRateLimit(nftMint: string) {
  const cacheKey = nftMint;
  const now = Date.now();
  
  // Check cache first
  const cached = metadataCache.get(cacheKey);
  if (cached && (now - cached.cachedAt) < CACHE_DURATION) {
    console.log(`📄 Using cached metadata for ${nftMint}`);
    return { name: cached.name, image: cached.image };
  }

  try {
    // Rate limiting: ensure minimum delay between requests
    const timeSinceLastFetch = now - lastMetadataFetch;
    if (timeSinceLastFetch < RATE_LIMIT_DELAY) {
      const waitTime = RATE_LIMIT_DELAY - timeSinceLastFetch;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms for ${nftMint}`);
      await delay(waitTime);
    }
    
    lastMetadataFetch = Date.now();
    
    const mintPubkey = new PublicKey(nftMint);
    const nft = await metaplex.nfts().findByMint({ mintAddress: mintPubkey });
    
    let nftName = nft.name || "";
    let nftImage = "";

    // Fetch metadata JSON with timeout and error handling
    if (nft.uri) {
      try {
        console.log(`🔍 Fetching metadata for ${nftMint} from ${nft.uri}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(nft.uri, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Grinza-Polls/1.0'
          }
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const meta = await response.json();
            nftName = nft.name || meta.name || "";
            nftImage = meta.image || "";
            console.log(`✅ Successfully fetched metadata for ${nftMint}`);
          } else {
            console.warn(`⚠️ Non-JSON content type for ${nftMint}: ${contentType}`);
            nftName = nft.name || "";
          }
        } else {
          console.warn(`⚠️ Failed to fetch metadata for ${nftMint}: ${response.status} ${response.statusText}`);
          nftName = nft.name || "";
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          console.warn(`⚠️ Metadata fetch timeout for ${nftMint}`);
        } else {
          console.warn(`⚠️ Error fetching metadata JSON for ${nftMint}:`, fetchError.message);
        }
        nftName = nft.name || "";
      }
    } else {
      console.warn(`⚠️ No URI found for NFT ${nftMint}`);
      nftName = nft.name || "";
    }

    // Cache the result
    metadataCache.set(cacheKey, {
      name: nftName,
      image: nftImage,
      cachedAt: now
    });

    return { name: nftName, image: nftImage };

  } catch (error: any) {
    console.error(`❌ Error fetching NFT metadata for ${nftMint}:`, error.message);
    
    // Return cached data if available, even if expired
    const cached = metadataCache.get(cacheKey);
    if (cached) {
      console.log(`📄 Using expired cache for ${nftMint} due to error`);
      return { name: cached.name, image: cached.image };
    }
    
    return { name: "Unknown NFT", image: "" };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("wallet");
  
  try {
    const polls = await program.account.poll.all();
    console.log(`🔍 Processing ${polls.length} polls`);
    
    // Process polls with rate limiting
    const enriched = [];
    
    for (const { publicKey, account } of polls) {
      console.log(`📊 Processing poll ${publicKey.toBase58()}`);
      
      let hasVoted = false;
      let userVote: 'up' | 'down' | null = null;
      
      if (walletAddress) {
        try {
          const voter = new PublicKey(walletAddress);
          const [voteRecordPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vote"), publicKey.toBuffer(), voter.toBuffer()],
            program.programId
          );
          const voteRecord = await program.account.voteRecord.fetch(voteRecordPda);
          hasVoted = true;
          userVote = voteRecord.isUpvote ? 'up' : 'down';
        } catch (err) {
          // user hasn't voted
        }
      }

      // Fetch NFT metadata with rate limiting
      const { name: nftName, image: nftImage } = await fetchNFTMetadataWithRateLimit(
        account.nftMint.toBase58()
      );

      enriched.push({
        id: publicKey.toBase58(),
        nftMint: account.nftMint.toBase58(),
        nftName,
        nftImage,
        owner: account.owner.toBase58(),
        upvotes: account.upvotes,
        downvotes: account.downvotes,
        isActive: account.isActive,
        createdAt: account.createdAt.toNumber(),
        hasVoted,
        userVote,
      });
    }

    console.log(`✅ Successfully processed ${enriched.length} polls`);
    return NextResponse.json({ success: true, polls: enriched });
    
  } catch (error: any) {
    console.error("❌ Error in GET /api/polls:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch polls" }, 
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { wallet, nftMint } = body;
    
    if (!wallet || !nftMint)
      return NextResponse.json({ success: false, error: "Missing wallet or nftMint" }, { status: 400 });

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const program = getProgram(); // your helper that returns Program<Grinza>
    const walletPub = new PublicKey(wallet);
    const nftMintPub = new PublicKey(nftMint);

    // Derive PDA
    const [pollPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), nftMintPub.toBuffer()],
      program.programId
    );

    const ix = await program.methods
      .initializePoll(nftMintPub)
      .accounts({
        authority: walletPub,
        poll: pollPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction(); // <== Just build instruction (not send)

    const tx = new Transaction().add(ix);
    tx.feePayer = walletPub;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const serialized = tx.serialize({ requireAllSignatures: false });

    return NextResponse.json({
      success: true,
      transaction: Array.from(serialized),
    });
  } catch (err) {
    console.error("❌ Build tx error:", err);
    return NextResponse.json({ success: false, error: "Transaction build failed" }, { status: 500 });
  }
}