import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Grinza } from "../target/types/grinza";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("grinza", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Grinza as Program<Grinza>;
  const provider = anchor.getProvider();

  let authority: Keypair;
  let voter1: Keypair;
  let voter2: Keypair;
  let nftMint: PublicKey;
  let pollPda: PublicKey;
  let pollBump: number;

  before(async () => {
    authority = Keypair.generate();
    voter1 = Keypair.generate();
    voter2 = Keypair.generate();
    nftMint = Keypair.generate().publicKey;
    [pollPda, pollBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), nftMint.toBuffer()],
      program.programId
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(voter1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(voter2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
  });

  describe("Poll Initialization", () => {
    it("Should initialize a poll successfully", async () => {
      await program.methods
        .initializePoll(nftMint)
        .accounts({
          authority: authority.publicKey,
          poll: pollPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPda);
      expect(pollAccount.owner.toString()).to.equal(authority.publicKey.toString());
      expect(pollAccount.nftMint.toString()).to.equal(nftMint.toString());
      expect(pollAccount.upvotes).to.equal(0);
      expect(pollAccount.downvotes).to.equal(0);
      expect(pollAccount.isActive).to.be.true;
      expect(pollAccount.bump).to.equal(pollBump);
      expect(pollAccount.createdAt.toNumber()).to.be.greaterThan(0);
    });

    it("Should fail to initialize poll with same NFT mint twice", async () => {
      try {
        await program.methods
          .initializePoll(nftMint)
          .accounts({
            authority: authority.publicKey,
            poll: pollPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.toString()).to.include("already in use");
      }
    });
  });

  describe("Voting", () => {
    let vote1Pda: PublicKey;
    let vote2Pda: PublicKey;

    before(async () => {
      [vote1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), pollPda.toBuffer(), voter1.publicKey.toBuffer()],
        program.programId
      );
      [vote2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), pollPda.toBuffer(), voter2.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Should allow upvoting", async () => {
      await program.methods
        .vote(true)
        .accounts({
          voter: voter1.publicKey,
          poll: pollPda,
          voteRecord: vote1Pda,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPda);
      expect(pollAccount.upvotes).to.equal(1);
      expect(pollAccount.downvotes).to.equal(0);

      const voteRecord = await program.account.voteRecord.fetch(vote1Pda);
      expect(voteRecord.poll.toString()).to.equal(pollPda.toString());
      expect(voteRecord.voter.toString()).to.equal(voter1.publicKey.toString());
      expect(voteRecord.voted).to.be.true;
      expect(voteRecord.isUpvote).to.be.true;
    });

    it("Should allow downvoting", async () => {
      await program.methods
        .vote(false)
        .accounts({
          voter: voter2.publicKey,
          poll: pollPda,
          voteRecord: vote2Pda,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter2])
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPda);
      expect(pollAccount.upvotes).to.equal(1);
      expect(pollAccount.downvotes).to.equal(1);

      const voteRecord = await program.account.voteRecord.fetch(vote2Pda);
      expect(voteRecord.poll.toString()).to.equal(pollPda.toString());
      expect(voteRecord.voter.toString()).to.equal(voter2.publicKey.toString());
      expect(voteRecord.voted).to.be.true;
      expect(voteRecord.isUpvote).to.be.false;
    });

    it("Should prevent double voting", async () => {
      try {
        await program.methods
          .vote(true)
          .accounts({
            voter: voter1.publicKey,
            poll: pollPda,
            voteRecord: vote1Pda,
            systemProgram: SystemProgram.programId,
          })
          .signers([voter1])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.toString()).to.include("already in use");
      }
    });
  });

  describe("Poll Management", () => {
    it("Should allow owner to close poll", async () => {
      await program.methods
        .closePoll()
        .accounts({
          authority: authority.publicKey,
          poll: pollPda,
        })
        .signers([authority])
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPda);
      expect(pollAccount.isActive).to.be.false;
    });

    it("Should prevent voting on closed poll", async () => {
      const voter3 = Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(voter3.publicKey, anchor.web3.LAMPORTS_PER_SOL)
      );
      const [vote3Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), pollPda.toBuffer(), voter3.publicKey.toBuffer()],
        program.programId
      );
      try {
        await program.methods
          .vote(true)
          .accounts({
            voter: voter3.publicKey,
            poll: pollPda,
            voteRecord: vote3Pda,
            systemProgram: SystemProgram.programId,
          })
          .signers([voter3])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.toString()).to.include("PollClosed");
      }
    });

    it("Should prevent closing poll twice", async () => {
      try {
        await program.methods
          .closePoll()
          .accounts({
            authority: authority.publicKey,
            poll: pollPda,
          })
          .signers([authority])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.toString()).to.include("PollAlreadyClosed");
      }
    });

    it("Should prevent unauthorized poll closure", async () => {
      const newNftMint = Keypair.generate().publicKey;
      const [newPollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("poll"), newNftMint.toBuffer()],
        program.programId
      );
      await program.methods
        .initializePoll(newNftMint)
        .accounts({
          authority: authority.publicKey,
          poll: newPollPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      try {
        await program.methods
          .closePoll()
          .accounts({
            authority: voter1.publicKey,
            poll: newPollPda,
          })
          .signers([voter1])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.toString()).to.include("Unauthorized");
      }
    });
  });

  describe("Edge Cases", () => {
    let edgeCaseNftMint: PublicKey;
    let edgeCasePollPda: PublicKey;

    before(async () => {
      edgeCaseNftMint = Keypair.generate().publicKey;
      [edgeCasePollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("poll"), edgeCaseNftMint.toBuffer()],
        program.programId
      );
      await program.methods
        .initializePoll(edgeCaseNftMint)
        .accounts({
          authority: authority.publicKey,
          poll: edgeCasePollPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
    });

    it("Should handle multiple consecutive votes correctly", async () => {
      const voters = [];
      const voteRecords = [];
      for (let i = 0; i < 5; i++) {
        const voter = Keypair.generate();
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(voter.publicKey, anchor.web3.LAMPORTS_PER_SOL)
        );
        const [voteRecordPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vote"), edgeCasePollPda.toBuffer(), voter.publicKey.toBuffer()],
          program.programId
        );
        voters.push(voter);
        voteRecords.push(voteRecordPda);
      }
      const votes = [true, true, false, true, false];
      for (let i = 0; i < voters.length; i++) {
        await program.methods
          .vote(votes[i])
          .accounts({
            voter: voters[i].publicKey,
            poll: edgeCasePollPda,
            voteRecord: voteRecords[i],
            systemProgram: SystemProgram.programId,
          })
          .signers([voters[i]])
          .rpc();
      }
      const pollAccount = await program.account.poll.fetch(edgeCasePollPda);
      expect(pollAccount.upvotes).to.equal(3);
      expect(pollAccount.downvotes).to.equal(2);
    });
  });
});