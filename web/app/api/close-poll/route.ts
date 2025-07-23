import { NextResponse } from "next/server";
import { Connection, clusterApiUrl, PublicKey, Transaction } from "@solana/web3.js";
import { getProgram } from "@/app/utils/getProgramBackend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { wallet, nftMint } = body;
    
    if (!wallet || !nftMint)
      return NextResponse.json({ success: false, error: "Missing wallet or nftMint" }, { status: 400 });

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const program = getProgram(wallet); 
    const walletPub = new PublicKey(wallet.publicKey);
    const nftMintPub = new PublicKey(nftMint);

    // Derive PDA for the poll
    const [pollPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), nftMintPub.toBuffer()],
      program.programId
    );

    // Build the close poll instruction
    const ix = await program.methods
      .closePoll()
      .accounts({
        authority: walletPub,
        poll: pollPda,
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
    console.error("❌ Build close poll tx error:", err);
    return NextResponse.json({ success: false, error: "Close poll transaction build failed" }, { status: 500 });
  }
}