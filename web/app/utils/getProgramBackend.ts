import { Connection, PublicKey } from "@solana/web3.js"
import { Program, Idl, AnchorProvider, Wallet } from "@coral-xyz/anchor"
import idl from "../idl/grinza.json"
import type { Grinza } from "../types/grinza"
import { Keypair } from "@solana/web3.js"

const connection = new Connection("https://api.devnet.solana.com", "confirmed")

export const getProgram = (wallet?: Wallet): Program<Grinza> => {

  const dummyKeypair = Keypair.generate();

  const dummyWallet: Wallet = {
    publicKey: dummyKeypair.publicKey,
    signAllTransactions: async txs => txs,
    signTransaction: async tx => tx,
    payer: dummyKeypair,
  }

  const provider = new AnchorProvider(connection, wallet || dummyWallet, {});

  return new Program<Grinza>(idl as Idl, provider);
}
