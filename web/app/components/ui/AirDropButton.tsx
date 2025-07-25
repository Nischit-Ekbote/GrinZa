"use client";

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import React, { useState } from "react";

export default function AirdropButton() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);

  const handleAirdrop = async () => {
    if (!wallet?.publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    setLoading(true);
    try {
      const sig = await connection.requestAirdrop(wallet.publicKey, 1e9);
      await connection.confirmTransaction(sig, "confirmed");
      toast.success("Airdrop successful! Try your action again.");
    } catch (err) {
      console.error("Airdrop failed:", err);
      toast.error("Airdrop failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }; 

  if( !wallet || !wallet.publicKey ) {
    return
  }

  return (
    <button
      onClick={handleAirdrop}
      disabled={!wallet || loading}
      className="bg-purple-600/10 hover:bg-purple-600/30 text-white font-semibold px-6 py-3 rounded border border-purple-600/20 shadow-lg transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Airdropping...</span>
        </>
      ) : (
        <>
          <span>Airdrop 1 SOL</span>
        </>
      )}
    </button>
  );
}
