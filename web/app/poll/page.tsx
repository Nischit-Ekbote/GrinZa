'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Vote, Plus, X, TrendingUp, TrendingDown, Clock, User, ExternalLink } from 'lucide-react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { toast } from 'sonner';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getDate } from '../utils/getDate';
import Link from 'next/link';

type Poll = {
  id: string;
  nftMint: string;
  nftName: string;
  nftImage: string;
  owner: string;
  upvotes: number;
  downvotes: number;
  isActive: boolean;
  createdAt: number;
  hasVoted: boolean;
  userVote: 'up' | 'down' | null;
};

type FilterType = 'all' | 'active' | 'closed' | 'my-polls';

const GrinzaApp: React.FC = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPollNftMint, setNewPollNftMint] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter polls based on selected filter
  const filteredPolls = useMemo(() => {
    switch (filter) {
      case 'active':
        return polls.filter(poll => poll.isActive);
      case 'closed':
        return polls.filter(poll => !poll.isActive);
      case 'my-polls':
        return polls.filter(poll => poll.owner === wallet?.publicKey?.toBase58());
      default:
        return polls;
    }
  }, [polls, filter, wallet]);

  // Integrated vote function with API call
  const vote = async (pollId: string, isUpvote: boolean) => {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
      console.error('Wallet not connected or missing sign capability');
      return;
    }

    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.hasVoted || !poll.isActive) {
      console.error('Invalid poll or already voted');
      return;
    }
    
    setVotingPollId(pollId);
    setLoading(true);

    try {
      // Call the API to get the transaction
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet.publicKey.toBase58(),
          nftMint: poll.nftMint,
          isUpvote: isUpvote,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Vote transaction failed');
      }

      // Deserialize and sign the transaction
      const transaction = Transaction.from(Buffer.from(data.transaction));
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('Vote transaction confirmed:', signature);

      // Update the UI optimistically
      setPolls(prev => prev.map(p => {
        if (p.id === pollId) {
          return {
            ...p,
            upvotes: isUpvote ? p.upvotes + 1 : p.upvotes,
            downvotes: !isUpvote ? p.downvotes + 1 : p.downvotes,
            hasVoted: true,
            userVote: isUpvote ? 'up' : 'down'
          };
        }
        return p;
      }));

      // Optionally refresh poll data from backend
      await fetchPolls();

    } catch (err : any) {
      const message = err?.message || err?.toString() || ""
      if (message.includes("already been processed") || message.includes("custom program error: 0x0")) {
        toast.success(" Vote recorded!");

        setPolls(prev => prev.map(p => {
        if (p.id === pollId) {
          return {
            ...p,
            upvotes: isUpvote ? p.upvotes + 1 : p.upvotes,
            downvotes: !isUpvote ? p.downvotes + 1 : p.downvotes,
            hasVoted: true,
            userVote: isUpvote ? 'up' : 'down'
          };
        }
        return p;
      }));
        return
      }
      console.error('Vote failed:', err);
      
      // Show err to user (you might want to add a toast notification here)
      alert(`Vote failed: ${err instanceof err ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setVotingPollId(null);
    }
  };

  const closePoll = async (pollId: string) => {
    if (!wallet || !wallet.publicKey) return;
    
    setLoading(true);
    
    try {
      // Call your close poll API here
      const response = await fetch('/api/close-poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet,
          nftMint: pollId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Close poll transaction failed');
      }

      const transaction = Transaction.from(Buffer.from(data.transaction));
      const signedT = await wallet.signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signedT.serialize());
      await connection.confirmTransaction(signature, 'confirmed');


    } catch (err : any) {
      const message = err?.message || err?.toString() || ""
      if (message.includes("already been processed") || message.includes("custom program error: 0x0")) {
        toast.success(" Vote recorded!");
      console.error('Error closing poll:', err);
        return;
      }
      toast.error('Error closing poll');
      console.error('Error closing poll:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolls = async () => {
    try {
      const walletParam = wallet?.publicKey ? `?wallet=${wallet.publicKey.toBase58()}` : '';
      const response = await fetch(`/api/polls${walletParam}`);
      const data = await response.json();
      if (data.success) {
        console.log('Fetched polls:', data.polls.length, 'polls');
        // Log any polls with missing images
        const pollsWithoutImages = data.polls.filter((poll: Poll) => !poll.nftImage);
        if (pollsWithoutImages.length > 0) {
          console.warn('Polls without images:', pollsWithoutImages.map((p: Poll) => ({ id: p.id, nftMint: p.nftMint, nftName: p.nftName })));
        }
        setPolls(data.polls);
      } else {
        console.error('Failed to fetch polls:', data.error);
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  // Refresh polls when wallet connects/disconnects
  useEffect(() => {
    if (wallet) {
      fetchPolls();
    }
  }, [wallet]);

  return (
    <div className="min-h-screen bg-black">
      <div className='flex justify-between p-6'>
        <h1 className='relative z-10'>Polls</h1>
        <WalletMultiButton/>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2 relative z-10">
            {[
              { key: 'all', label: 'All Polls' },
              { key: 'active', label: 'Active' },
              { key: 'closed', label: 'Closed' },
              { key: 'my-polls', label: 'My Polls' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as FilterType)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === key
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          {wallet && (
            <Link
              href="/poll/create"
              className="bg-gradient-to-r cursor-pointer relative z-10 from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white pl-6 pr-8 py-3 rounded font-semibold flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span>Create Poll</span>
            </Link>
          )}
        </div>

        {/* Polls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolls.map((poll) => {
            const totalVotes = poll.upvotes + poll.downvotes;
            const upvotePercentage = getVotePercentage(poll.upvotes, totalVotes);
            const downvotePercentage = getVotePercentage(poll.downvotes, totalVotes);
            const isOwner = poll.owner === wallet?.publicKey?.toBase58();
            const isVotingThisPoll = votingPollId === poll.id;

            return (
              <div
                key={poll.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all"
              >
                {/* NFT Image */}
                <div className="relative mb-4">
                  {poll.nftImage ? (
                    <img
                      src={poll.nftImage}
                      alt={poll.nftName}
                      className="w-full h-48 object-cover rounded-xl"
                      onError={(e) => {
                        console.error('Failed to load image for poll:', {
                          pollId: poll.id,
                          nftMint: poll.nftMint,
                          originalUrl: poll.nftImage,
                          error: e
                        });
                        const target = e.target as HTMLImageElement;
                        // Try alternative IPFS gateways
                        if (poll.nftImage.includes('gateway.pinata.cloud')) {
                          const hash = poll.nftImage.split('/ipfs/')[1];
                          if (hash && !target.src.includes('ipfs.io')) {
                            console.log('Trying alternative gateway: ipfs.io');
                            target.src = `https://ipfs.io/ipfs/${hash}`;
                            return;
                          }
                        }
                        // Final fallback to placeholder
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMDAgNzBWMTMwTTcwIDEwMEgxMzAiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHN2Zz4K';
                      }}
                      onLoad={() => {
                        console.log('✅ Successfully loaded image for poll:', poll.id, poll.nftMint);
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-700 rounded-xl flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Vote className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No Image</p>
                      </div>
                    </div>
                  )}
                  {!poll.isActive && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-red-400 font-semibold bg-red-500/20 px-3 py-1 rounded-lg">
                        CLOSED
                      </span>
                    </div>
                  )}
                  {isVotingThisPoll && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Poll Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{poll.nftName || 'Unknown NFT'}</h3>
                    <div className="flex items-center text-sm text-gray-400 space-x-4">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{truncateAddress(poll.owner)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{getDate(poll.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Mint: {truncateAddress(poll.nftMint)}
                    </div>
                    {/* Debug info - remove this in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-600 mt-1 break-all">
                        Image URL: {poll.nftImage || 'No image URL'}
                      </div>
                    )}
                  </div>

                  {/* Vote Results */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Votes: {totalVotes}</span>
                      {isOwner && poll.isActive && (
                        <button
                          onClick={() => closePoll(poll.id)}
                          disabled={loading}
                          className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                        >
                          Close Poll
                        </button>
                      )}
                    </div>

                    {/* Vote Bars */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <div className="bg-gray-700 rounded-full h-2 flex-1">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${upvotePercentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-green-400 text-sm font-medium min-w-0">
                          {poll.upvotes} ({upvotePercentage}%)
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <div className="bg-gray-700 rounded-full h-2 flex-1">
                            <div
                              className="bg-red-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${downvotePercentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-red-400 text-sm font-medium min-w-0">
                          {poll.downvotes} ({downvotePercentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Vote Buttons */}
                    {wallet && poll.isActive && !poll.hasVoted && (
                      <div className="flex space-x-2 pt-2"> 
                        <button
                          onClick={() => vote(poll.id, true)}
                          disabled={loading || isVotingThisPoll}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>{isVotingThisPoll ? 'Voting...' : 'Upvote'}</span>
                        </button>
                        <button
                          onClick={() => vote(poll.id, false)}
                          disabled={loading || isVotingThisPoll}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                        >
                          <TrendingDown className="w-4 h-4" />
                          <span>{isVotingThisPoll ? 'Voting...' : 'Downvote'}</span>
                        </button>
                      </div>
                    )}

                    {poll.hasVoted && (
                      <div className="pt-2">
                        <div className={`text-center py-2 px-4 rounded-lg font-medium ${
                          poll.userVote === 'up' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          You voted: {poll.userVote === 'up' ? 'Upvote' : 'Downvote'}
                        </div>
                      </div>
                    )}

                    {!wallet && poll.isActive && (
                      <div className="pt-2">
                        <div className="text-center py-2 px-4 rounded-lg bg-yellow-500/20 text-yellow-400 font-medium">
                          Connect wallet to vote
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPolls.length === 0 && (
          <div className="text-center py-12">
            <Vote className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No polls found</h3>
            <p className="text-gray-500">
              {filter === 'my-polls' 
                ? 'You haven\'t created any polls yet.' 
                : 'No polls match your current filter.'}
            </p>
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {loading && !votingPollId && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white text-center">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrinzaApp;