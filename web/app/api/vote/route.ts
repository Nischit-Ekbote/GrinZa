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
    
    // Validate input parameters
    if (!wallet || !nftMint || typeof isUpvote !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    let voter: PublicKey;
    try {
      voter = new PublicKey(wallet);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Validate NFT mint address format
    let mint: PublicKey;
    try {
      mint = new PublicKey(nftMint);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid NFT mint address format" },
        { status: 400 }
      );
    }

    // Get the program instance
    const program = getProgram(wallet);

    // Derive PDAs
    const [pollPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), mint.toBuffer()],
      program.programId
    );

    const [voteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollPda.toBuffer(), voter.toBuffer()],
      program.programId
    );

    // Check if poll exists
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

    // Check if user has already voted
    try {
      await program.account.voteRecord.fetch(voteRecordPda);
      return NextResponse.json(
        { success: false, error: "User has already voted on this poll" },
        { status: 400 }
      );
    } catch (error) {
      // Vote record doesn't exist, which is what we want
    }

    // Create the vote instruction
    const ix = await program.methods
      .vote(isUpvote)
      .accounts({
        voter,
        poll: pollPda,
        voteRecord: voteRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    // Create and configure transaction
    const tx = new Transaction().add(ix);
    tx.feePayer = voter;
    
    // Get latest blockhash
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;

    // Serialize transaction for frontend signing
    const serializedTransaction = tx.serialize({ requireAllSignatures: false });

    return NextResponse.json({
      success: true,
      transaction: Array.from(serializedTransaction),
      message: `Transaction created for ${isUpvote ? 'upvote' : 'downvote'}`,
    });

  } catch (error) {
    console.error("❌ Vote transaction error:", error);
    
    // More specific error handling
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