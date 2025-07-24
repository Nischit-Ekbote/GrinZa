import { NextResponse } from "next/server";
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { getProgram } from "@/app/utils/getProgramBackend";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export async function POST(req: Request) {
  try {
    const { wallet, nftMint, isUpvote } = await req.json();
    
    if (!wallet || !nftMint || typeof isUpvote !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    let voter: PublicKey;
    try {
      voter = new PublicKey(wallet);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    let mint: PublicKey;
    try {
      mint = new PublicKey(nftMint);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid NFT mint address format" },
        { status: 400 }
      );
    }

    const program = getProgram(wallet);

    const [pollPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), mint.toBuffer()],
      program.programId
    );

    const [voteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollPda.toBuffer(), voter.toBuffer()],
      program.programId
    );

    try {
      const pollAccount = await program.account.poll.fetch(pollPda);
      if (!pollAccount.isActive) {
        return NextResponse.json(
          { success: false, error: "Poll is not active" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Poll does not exist" },
        { status: 404 }
      );
    }

    try {
      await program.account.voteRecord.fetch(voteRecordPda);
      return NextResponse.json(
        { success: false, error: "User has already voted on this poll" },
        { status: 400 }
      );
    } catch (error: any) {
      if (!error.message.includes("Account does not exist")) {
        return NextResponse.json(
          { success: false, error: "Error checking vote record" },
          { status: 500 }
        );
      }
    }

    const ix = await program.methods
      .vote(isUpvote)
      .accounts({
        voter,
        poll: pollPda,
        voteRecord: voteRecordPda,
      } as any)
      .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = voter;
    
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;

    const serializedTransaction = tx.serialize({ requireAllSignatures: false });

    return NextResponse.json({
      success: true,
      transaction: Array.from(serializedTransaction),
      message: `Transaction created for ${isUpvote ? 'upvote' : 'downvote'}`,
    });

  } catch (error) {
    console.error("❌ Vote transaction error:", error);
    
    let errorMessage = "Vote transaction failed";
    
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient SOL balance to pay transaction fees";
      } else if (error.message.includes("blockhash not found")) {
        errorMessage = "Network error, please try again";
      } else if (error.message.includes("Account does not exist")) {
        errorMessage = "Poll account not found";
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