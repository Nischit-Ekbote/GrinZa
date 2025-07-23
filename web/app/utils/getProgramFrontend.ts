import { Connection } from "@solana/web3.js"
import { Program, Idl, Provider } from "@coral-xyz/anchor"
import idl from "../idl/grinza.json"
import type { Grinza } from "../types/grinza"

const connection = new Connection("https://api.devnet.solana.com", "confirmed")

export const getProgram = (wallet: Provider["wallet"]): Program<Grinza> => {
  const provider: Provider = {
    connection,
    wallet,
  }

  return new Program<Grinza>(idl as Idl, provider)
}
