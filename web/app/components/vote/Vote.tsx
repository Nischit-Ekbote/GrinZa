'use client';

import React, { useState } from 'react';
import {
  useAnchorWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';
import axios from 'axios';

function VotePoll() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [nftMint, setNftMint] = useState('');
  const [isUpvote, setIsUpvote] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleVote = async () => {
    if (!wallet) {
      console.error('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/vote', {
        wallet: wallet.publicKey.toBase58(),
        nftMint,
        isUpvote,
      });

      const { success, transaction } = res.data;

      if (!success || !transaction) {
        console.error('Failed to get transaction');
        return;
      }

      const tx = Transaction.from(new Uint8Array(transaction));
      const signedTx = await wallet.signTransaction(tx);
      const txId = await connection.sendRawTransaction(signedTx.serialize());

      alert(`Vote submitted!\nTransaction ID: ${txId}`);
    } catch (error) {
      console.error('❌ Vote failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-white p-4 relative z-10">
      <WalletMultiButton />
      <h1 className="text-2xl font-bold mb-4">Vote on NFT Poll</h1>

      <input
        type="text"
        placeholder="Enter NFT Mint Address"
        value={nftMint}
        onChange={(e) => setNftMint(e.target.value)}
        className="text-black px-2 py-1 rounded mb-2 w-full"
      />

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setIsUpvote(true)}
          className={`px-4 py-2 rounded ${isUpvote ? 'bg-green-600' : 'bg-gray-700'}`}
        >
          Upvote
        </button>
        <button
          onClick={() => setIsUpvote(false)}
          className={`px-4 py-2 rounded ${!isUpvote ? 'bg-red-600' : 'bg-gray-700'}`}
        >
          Downvote
        </button>
      </div>

      <button
        onClick={handleVote}
        className="bg-blue-600 px-6 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit Vote'}
      </button>
    </div>
  );
}

export default VotePoll;
